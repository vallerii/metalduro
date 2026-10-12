// Готовит фото для сайта: берет оригиналы из _photos_src/ (JPG или HEIC
// прямо с Google Drive), конвертирует HEIC, уменьшает до 2000px и кладет
// в public/photos/ под нужными именами.
//
//   1. Скачайте фото из папки Google Drive в _photos_src/ (имена не меняйте)
//   2. npm run photos
//
// Соответствие «ключ на сайте → файл на Drive» — в списке ниже.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import heicConvert from "heic-convert";

const SRC = "_photos_src";
const OUT = "public/photos";

const map = {
  "inserts-1": "IMG_9265.HEIC",
  "solid-1": "IMG_2728.HEIC",
  "rings-1": "IMG_2713.HEIC",
  "mixed-1": "IMG_9267.HEIC",
  "inserts-2": "IMG_9295.HEIC",
  "solid-4": "IMG_9289.HEIC",
  "wear-1": "IMG_2716.HEIC",
  "bucket": "camphoto_1450712544.jpg",
  "pack-1": "IMG_2726.HEIC",
  "pack-3": "IMG_9178.HEIC",
  "inserts-3": "IMG_4635.heic",
  "solid-2": "IMG_9665.JPG",
  "rings-2": "IMG_2732.HEIC",
  "inserts-4": "IMG_C179C621-9E69-4127-AE0F-03280E374E50.jpeg",
  "solid-3": "ef909e54-9755-459e-ac34-ec2f220b10c9.jpg",
  "nobuy-1": "neberem-IMG_9285.HEIC",
};

await fs.mkdir(OUT, { recursive: true });
const files = await fs.readdir(SRC).catch(() => []);
const lower = new Map(files.map((f) => [f.toLowerCase(), f]));
// подсказка: фото из папки «Ne berem» положите как neberem-<имя>.HEIC

for (const [key, name] of Object.entries(map)) {
  const real = lower.get(name.toLowerCase());
  if (!real) {
    console.log(`—  ${key}: нет файла ${name} в ${SRC}/`);
    continue;
  }
  let buf = await fs.readFile(path.join(SRC, real));
  if (/\.hei[cf]$/i.test(real)) {
    buf = Buffer.from(await heicConvert({ buffer: buf, format: "JPEG", quality: 0.92 }));
  }
  await sharp(buf)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OUT, `${key}.jpg`));
  console.log(`✓  ${key}.jpg  ←  ${real}`);
}
