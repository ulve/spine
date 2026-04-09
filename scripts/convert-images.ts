/**
 * One-time migration: convert all existing uploaded images to WebP.
 * Updates DB records for Book.coverPath, Author.picture, NavShelf.backgroundImage.
 *
 * Usage: tsx scripts/convert-images.ts
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COVERS_DIR = process.env.COVERS_DIR || path.join(process.cwd(), 'data/covers');
const SHELF_BG_DIR = path.join(COVERS_DIR, 'shelf-bgs');
const AUTHOR_PICS_DIR = path.join(COVERS_DIR, 'authors');

const CONVERTIBLE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']);

async function convertFile(filePath: string): Promise<string | null> {
  const ext = path.extname(filePath).toLowerCase();
  if (!CONVERTIBLE_EXTS.has(ext)) return null; // already webp or unsupported

  const webpPath = filePath.slice(0, -ext.length) + '.webp';
  try {
    await sharp(filePath).webp({ quality: 85 }).toFile(webpPath);
    await fs.remove(filePath);
    return webpPath;
  } catch (err) {
    console.error(`  [ERROR] Failed to convert ${filePath}:`, err);
    return null;
  }
}

async function convertDirectory(dir: string, label: string): Promise<Map<string, string>> {
  const renamed = new Map<string, string>(); // oldFilename -> newFilename
  const files = await fs.readdir(dir).catch(() => [] as string[]);
  const convertible = files.filter(f => CONVERTIBLE_EXTS.has(path.extname(f).toLowerCase()));

  if (convertible.length === 0) {
    console.log(`[${label}] No images to convert.`);
    return renamed;
  }

  console.log(`[${label}] Converting ${convertible.length} image(s)...`);
  for (const file of convertible) {
    const oldPath = path.join(dir, file);
    const newPath = await convertFile(oldPath);
    if (newPath) {
      const newFile = path.basename(newPath);
      renamed.set(file, newFile);
      console.log(`  ${file}  →  ${newFile}`);
    }
  }
  return renamed;
}

async function main() {
  console.log('=== Image WebP Migration ===\n');

  // --- Book covers ---
  const coverRenamed = await convertDirectory(COVERS_DIR, 'covers');
  if (coverRenamed.size > 0) {
    const books = await prisma.book.findMany({ where: { coverPath: { not: null } } });
    let updated = 0;
    for (const book of books) {
      if (!book.coverPath) continue;
      const oldFilename = path.basename(book.coverPath);
      const newFilename = coverRenamed.get(oldFilename);
      if (newFilename) {
        const newCoverPath = path.join(path.dirname(book.coverPath), newFilename);
        await prisma.book.update({ where: { id: book.id }, data: { coverPath: newCoverPath } });
        updated++;
      }
    }
    console.log(`[covers] Updated ${updated} book record(s) in DB.\n`);
  }

  // --- Author pictures ---
  const authorRenamed = await convertDirectory(AUTHOR_PICS_DIR, 'authors');
  if (authorRenamed.size > 0) {
    const authors = await prisma.author.findMany({ where: { picture: { not: null } } });
    let updated = 0;
    for (const author of authors) {
      if (!author.picture) continue;
      const newFilename = authorRenamed.get(author.picture);
      if (newFilename) {
        await prisma.author.update({ where: { id: author.id }, data: { picture: newFilename } });
        updated++;
      }
    }
    console.log(`[authors] Updated ${updated} author record(s) in DB.\n`);
  }

  // --- Shelf backgrounds ---
  const shelfRenamed = await convertDirectory(SHELF_BG_DIR, 'shelf-bgs');
  if (shelfRenamed.size > 0) {
    const shelves = await prisma.navShelf.findMany({ where: { backgroundImage: { not: null } } });
    let updated = 0;
    for (const shelf of shelves) {
      if (!shelf.backgroundImage) continue;
      const newFilename = shelfRenamed.get(shelf.backgroundImage);
      if (newFilename) {
        await prisma.navShelf.update({ where: { id: shelf.id }, data: { backgroundImage: newFilename } });
        updated++;
      }
    }
    console.log(`[shelf-bgs] Updated ${updated} shelf record(s) in DB.\n`);
  }

  console.log('=== Done ===');
  await prisma.$disconnect();
}

main().catch(async err => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
