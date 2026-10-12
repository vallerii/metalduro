import "server-only";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "public", "photos");
const exts = [".webp", ".jpg", ".jpeg", ".png"];

/** Путь к фото в /public/photos по ключу или null, если файла пока нет. */
export function photo(key: string | null | undefined): string | null {
  if (!key) return null;
  for (const ext of exts) {
    if (fs.existsSync(path.join(dir, key + ext))) return `/photos/${key}${ext}`;
  }
  return null;
}
