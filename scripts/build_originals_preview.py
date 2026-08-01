#!/usr/bin/env python3
"""Build a client preview that keeps the source-photo backgrounds intact."""

from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path

from PIL import Image, ImageOps


NEW_PHOTOS: dict[str, list[str]] = {
    "LAC-1": [
        "00000389-PHOTO-2026-07-16-17-27-45.jpg",
        "00000390-PHOTO-2026-07-16-17-27-45.jpg",
        "00000391-PHOTO-2026-07-16-17-27-46.jpg",
    ],
    "LAC-2": [
        "00000393-PHOTO-2026-07-16-17-28-57.jpg",
        "00000394-PHOTO-2026-07-16-17-28-57.jpg",
        "00000395-PHOTO-2026-07-16-17-28-57.jpg",
        "00000410-PHOTO-2026-07-16-17-40-09.jpg",
    ],
    "LAC-3": [
        "00000397-PHOTO-2026-07-16-17-30-09.jpg",
        "00000398-PHOTO-2026-07-16-17-30-09.jpg",
        "00000399-PHOTO-2026-07-16-17-30-09.jpg",
    ],
    "LAC-4": [
        "00000401-PHOTO-2026-07-16-17-31-05.jpg",
        "00000402-PHOTO-2026-07-16-17-31-05.jpg",
        "00000403-PHOTO-2026-07-16-17-31-05.jpg",
    ],
    "LAI-1": [
        "00000407-PHOTO-2026-07-16-17-36-02.jpg",
        "00000408-PHOTO-2026-07-16-17-36-02.jpg",
        "00000410-PHOTO-2026-07-16-17-40-09.jpg",
    ],
    "MMC-1": [
        "00000413-PHOTO-2026-07-16-17-42-25.jpg",
        "00000414-PHOTO-2026-07-16-17-42-25.jpg",
        "00000415-PHOTO-2026-07-16-17-42-26.jpg",
        "00000421-PHOTO-2026-07-16-17-44-27.jpg",
    ],
    "MMC-2": [
        "00000417-PHOTO-2026-07-16-17-43-27.jpg",
        "00000418-PHOTO-2026-07-16-17-43-27.jpg",
        "00000419-PHOTO-2026-07-16-17-43-27.jpg",
        "00000421-PHOTO-2026-07-16-17-44-27.jpg",
    ],
    "TCI-1": [
        "00000423-PHOTO-2026-07-16-17-45-47.jpg",
        "00000424-PHOTO-2026-07-16-17-45-48.jpg",
        "00000425-PHOTO-2026-07-16-17-45-48.jpg",
    ],
}

COMPARISON_NAMES = {
    "00000410-PHOTO-2026-07-16-17-40-09.jpg": "lac-2-lai-1-comparativa.jpg",
    "00000421-PHOTO-2026-07-16-17-44-27.jpg": "mmc-1-mmc-2-comparativa.jpg",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", type=Path, required=True)
    parser.add_argument("--existing-originals", type=Path, required=True)
    parser.add_argument("--update-archive", type=Path, required=True)
    parser.add_argument("--output-assets", type=Path, required=True)
    parser.add_argument("--output-inventory", type=Path, required=True)
    parser.add_argument("--max-size", type=int, default=1400)
    parser.add_argument("--quality", type=int, default=82)
    return parser.parse_args()


def save_web_jpeg(source: Image.Image, destination: Path, max_size: int, quality: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image = ImageOps.exif_transpose(source).convert("RGB")
    image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    image.save(destination, "JPEG", quality=quality, optimize=True, progressive=True)


def existing_preview_name(image_path: str) -> str:
    return f"{Path(image_path).stem}.jpg"


def new_preview_name(sku: str, source_name: str, sequence: int) -> str:
    if source_name in COMPARISON_NAMES:
        return COMPARISON_NAMES[source_name]
    return f"{sku.lower()}-{sequence:02d}.jpg"


def main() -> int:
    args = parse_args()
    products = json.loads(args.inventory.read_text(encoding="utf-8"))
    args.output_assets.mkdir(parents=True, exist_ok=True)

    generated: set[str] = set()
    for product in products:
        preview_images: list[str] = []
        for image_path in product["images"]:
            file_name = existing_preview_name(image_path)
            source = args.existing_originals / file_name
            if not source.is_file():
                raise FileNotFoundError(source)
            destination = args.output_assets / file_name
            if file_name not in generated:
                with Image.open(source) as image:
                    save_web_jpeg(image, destination, args.max_size, args.quality)
                generated.add(file_name)
            preview_images.append(f"/assets/preview-originals/{file_name}")

        if product["sku"] in NEW_PHOTOS:
            preview_images = []
            individual_sequence = 0
            with zipfile.ZipFile(args.update_archive) as archive:
                for source_name in NEW_PHOTOS[product["sku"]]:
                    if source_name not in COMPARISON_NAMES:
                        individual_sequence += 1
                    file_name = new_preview_name(product["sku"], source_name, individual_sequence)
                    destination = args.output_assets / file_name
                    if file_name not in generated:
                        with archive.open(source_name) as stream, Image.open(stream) as image:
                            save_web_jpeg(image, destination, args.max_size, args.quality)
                        generated.add(file_name)
                    preview_images.append(f"/assets/preview-originals/{file_name}")

        product["images"] = preview_images
        product["imageUrls"] = list(preview_images)

    args.output_inventory.parent.mkdir(parents=True, exist_ok=True)
    args.output_inventory.write_text(
        json.dumps(products, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    image_references = sum(len(product["images"]) for product in products)
    missing_public = [
        product["sku"]
        for product in products
        if product.get("active") and not product["images"]
    ]
    print(f"Archivos de vista previa: {len(generated)}")
    print(f"Referencias en galerias: {image_references}")
    print(f"Modelos activos sin fotos: {', '.join(missing_public)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
