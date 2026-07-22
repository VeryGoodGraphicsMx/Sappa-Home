(function () {
  'use strict';

  const IS_ORIGINAL_PREVIEW = new URLSearchParams(window.location.search).get('preview') === 'originals';
  const INVENTORY_URL = IS_ORIGINAL_PREVIEW
    ? '/data/inventory-preview-originals.json'
    : '/data/inventory.json';
  const PUBLICLY_BLOCKED_SKUS = new Set(['TPC-3', 'LCZ-5']);
  let inventoryPromise;

  function assertInventory(products) {
    if (!Array.isArray(products)) {
      throw new TypeError('El inventario debe ser un arreglo de productos.');
    }

    products.forEach((product, index) => {
      const requiredFields = [
        'id',
        'sku',
        'handle',
        'name',
        'category',
        'material',
        'active',
        'status',
        'images',
        'imageUrls'
      ];
      const missing = requiredFields.filter(field => !(field in product));
      if (missing.length) {
        throw new TypeError(`Producto ${index + 1}: faltan ${missing.join(', ')}.`);
      }
      if (!Array.isArray(product.images) || !Array.isArray(product.imageUrls)) {
        throw new TypeError(`Producto ${product.sku}: images e imageUrls deben ser arreglos.`);
      }
    });

    return products;
  }

  async function loadInventory(options = {}) {
    if (options.force || !inventoryPromise) {
      inventoryPromise = fetch(INVENTORY_URL, { headers: { Accept: 'application/json' } })
        .then(response => {
          if (!response.ok) {
            throw new Error(`No fue posible cargar el inventario (${response.status}).`);
          }
          return response.json();
        })
        .then(assertInventory);
    }

    return inventoryPromise;
  }

  function isPublicProduct(product) {
    return Boolean(product?.active) && (
      IS_ORIGINAL_PREVIEW || !PUBLICLY_BLOCKED_SKUS.has(product.sku)
    );
  }

  function getActiveProducts(products) {
    return assertInventory(products).filter(isPublicProduct);
  }

  function getProductBySkuOrHandle(products, value, options = {}) {
    const normalizedValue = String(value || '').trim().toLowerCase();
    if (!normalizedValue) return null;

    const product = assertInventory(products).find(item =>
      item.sku.toLowerCase() === normalizedValue || item.handle.toLowerCase() === normalizedValue
    );

    if (!product) return null;
    if (options.includeNonPublic || isPublicProduct(product)) return product;
    return null;
  }

  window.SappaInventory = Object.freeze({
    INVENTORY_URL,
    IS_ORIGINAL_PREVIEW,
    getActiveProducts,
    getProductBySkuOrHandle,
    isPublicProduct,
    loadInventory
  });
}());
