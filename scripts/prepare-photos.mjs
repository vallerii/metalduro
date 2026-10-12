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
  "inserts-1": "479F3882-C747-4C17-B3F3-9A22E9949BCE.jpg", // россыпь пластин (калькулятор)
  "inserts-2": "DD3D2864-42B7-46E5-B6D1-F297C86FD07B.jpg", // пластины (блок «Покупаем»)
  "inserts-3": "4FEA71DF-DC81-4750-9B6E-2A663B31CC08.jpg", // пластины (история, Valencia)
  "inserts-4": "camphoto_490998763.jpg",                   // пластина крупно (гайд)
  "solid-1": "camphoto_824023566.jpg",                     // монолитные фрезы (калькулятор)
  "solid-2": "camphoto_644928527.jpg",                     // фрезы и сверла (история, Zaragoza)
  "solid-3": "ef909e54-9755-459e-ac34-ec2f220b10c9.jpg",   // ящик сверл (гайд)
  "solid-4": "35EC0400-0383-461B-BB31-4EE752DA818D.jpg",   // сверла и фрезы (блок «Покупаем»)
  "wear-1": "IMG_2713.HEIC",                               // втулки/матрицы (блок «Покупаем»)
  "rings-1": "IMG_2714.HEIC",                              // кольца (калькулятор, «лом»)
  "rings-2": "IMG_2716.HEIC",                              // кольца (история, Barcelona)
  "mixed-1": "6CB8ACB2-BCFC-47B5-8DED-375A9804EC84.jpg",   // смешанный материал (калькулятор)
  "bucket": "camphoto_1450712544.jpg",                     // пластины в пластиковом ведре (упаковка)
  // "pack-1": "",  // пример упаковки — добавьте фото
  // "pack-3": "",  // готовая посылка — добавьте фото
};

await fs.mkdir(OUT, { recursive: true });
const files = await fs.readdir(SRC).catch(() => []);
const lower = new Map(files.map((f) => [f.toLowerCase(), f]));

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
