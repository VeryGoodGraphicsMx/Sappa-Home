param(
  [Parameter(Mandatory = $true)]
  [string]$Workbook,

  [Parameter(Mandatory = $true)]
  [string]$Inventory
)

$ErrorActionPreference = 'Stop'
trap {
  Write-Error ("{0}`n{1}" -f $_.Exception.Message, $_.InvocationInfo.PositionMessage)
  exit 1
}

function Get-ColumnIndex([string]$Reference) {
  $letters = ([regex]::Match($Reference, '^[A-Z]+')).Value
  $index = 0
  foreach ($character in $letters.ToCharArray()) {
    $index = ($index * 26) + ([int][char]$character - [int][char]'A' + 1)
  }
  return $index
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Workbook))

try {
  $sharedStrings = @()
  $sharedEntry = $archive.GetEntry('xl/sharedStrings.xml')
  if ($sharedEntry) {
    $reader = [System.IO.StreamReader]::new($sharedEntry.Open())
    try { [xml]$sharedXml = $reader.ReadToEnd() } finally { $reader.Dispose() }
    foreach ($item in $sharedXml.sst.si) {
      $sharedStrings += [string]$item.InnerText
    }
  }

  $sheetEntry = $archive.GetEntry('xl/worksheets/sheet1.xml')
  if (-not $sheetEntry) { throw 'No se encontró xl/worksheets/sheet1.xml.' }
  $reader = [System.IO.StreamReader]::new($sheetEntry.Open())
  try { [xml]$sheetXml = $reader.ReadToEnd() } finally { $reader.Dispose() }

  $rows = foreach ($row in $sheetXml.worksheet.sheetData.row) {
    $values = [ordered]@{}
    foreach ($cell in $row.c) {
      $value = ''
      if ($cell.t -eq 's') {
        $sharedIndex = [int]$cell.v
        if ($sharedIndex -lt 0 -or $sharedIndex -ge $sharedStrings.Count) {
          throw "Índice de texto compartido fuera de rango en $($cell.r): $sharedIndex de $($sharedStrings.Count)."
        }
        $value = $sharedStrings[$sharedIndex]
      } elseif ($cell.t -eq 'inlineStr') {
        $value = [string]$cell.is.t
      } elseif ($null -ne $cell.v) {
        $value = [string]$cell.v
      }
      $value = $value.Trim()
      if ($value) { $values[[string](Get-ColumnIndex ([string]$cell.r))] = $value }
    }
    if ($values.Count) {
      [pscustomobject]@{ Row = [int]$row.r; Values = @($values.Values) }
    }
  }
} finally {
  $archive.Dispose()
}

$cluster = $null
$material = ''
$records = [ordered]@{}

foreach ($row in $rows) {
  $sku = $row.Values | Where-Object { $_ -match '^[A-Z]{1,5}-\d+$' } | Select-Object -First 1
  if ($sku) {
    $skuIndex = [array]::IndexOf($row.Values, $sku)
    $name = if ($skuIndex -ge 0 -and $skuIndex + 1 -lt $row.Values.Count) { $row.Values[$skuIndex + 1] } else { '' }
    $records[$sku] = [pscustomobject]@{
      Sku = $sku
      Name = $name
      Category = $cluster
      Material = $material
      Row = $row.Row
    }
    continue
  }

  $materialValue = $row.Values | Where-Object { $_ -match '^Material:' } | Select-Object -First 1
  if ($materialValue) {
    $material = ($materialValue -replace '^Material:\s*', '').Trim()
    continue
  }

  $header = $row.Values | Where-Object { $_ -ne 'q' -and $_ -notmatch '^CLAVES PARA SOMBREROS SAPPA$' } | Select-Object -First 1
  if ($header) {
    $cluster = $header
    $material = ''
  }
}

$inventoryPath = (Resolve-Path -LiteralPath $Inventory).Path
$existing = [System.IO.File]::ReadAllText($inventoryPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$spanishInventoryPath = Join-Path (Split-Path $inventoryPath -Parent) 'inventory.json'
$spanishInventory = [System.IO.File]::ReadAllText($spanishInventoryPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$bySku = @{}
foreach ($product in $existing) { $bySku[$product.sku] = $product }
$spanishBySku = @{}
foreach ($product in $spanishInventory) { $spanishBySku[$product.sku] = $product }

$updated = foreach ($record in $records.Values) {
  if (-not $bySku.ContainsKey($record.Sku)) {
    throw "El SKU $($record.Sku) existe en Excel pero no en el inventario de imágenes."
  }
  $product = $bySku[$record.Sku]
  if ($record.Name) {
    $product.name = $record.Name
  } elseif (-not $product.name) {
    $product.name = $product.sku
  }
  $product.category = $record.Category
  if ($spanishBySku.ContainsKey($record.Sku) -and $spanishBySku[$record.Sku].material) {
    $product.material = $spanishBySku[$record.Sku].material
  }
  $product.active = $true
  $product
}

$json = $updated | ConvertTo-Json -Depth 12
[System.IO.File]::WriteAllText($inventoryPath, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

$uniqueImages = @($updated | ForEach-Object { $_.images } | Sort-Object -Unique)
$missingImages = @($uniqueImages | Where-Object {
  $relative = $_.TrimStart('/') -replace '/', [System.IO.Path]::DirectorySeparatorChar
  -not (Test-Path -LiteralPath (Join-Path (Split-Path (Split-Path $inventoryPath -Parent) -Parent) $relative))
})

[pscustomobject]@{
  Products = @($updated).Count
  Clusters = @($updated.category | Sort-Object -Unique).Count
  ImageReferences = @($updated | ForEach-Object { $_.images }).Count
  UniqueImages = $uniqueImages.Count
  MissingImages = $missingImages.Count
  RemovedSkus = @($existing.sku | Where-Object { -not $records.Contains($_) }) -join ', '
} | ConvertTo-Json
