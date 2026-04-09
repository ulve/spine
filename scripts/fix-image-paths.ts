/**
 * Fix DB image paths after WebP conversion.
 * Updates Book.coverPath, Author.picture, NavShelf.backgroundImage
 * to point to .webp files instead of .jpg/.jpeg/.png.
 *
 * Run with: sudo npx tsx scripts/fix-image-paths.ts
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs-extra';

const DB_URL = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'data/app.db')}`;
process.env.DATABASE_URL = DB_URL;

const prisma = new PrismaClient();

const COVERS_DIR = process.env.COVERS_DIR || path.join(process.cwd(), 'data/covers');
const SHELF_BG_DIR = path.join(COVERS_DIR, 'shelf-bgs');
const AUTHOR_PICS_DIR = path.join(COVERS_DIR, 'authors');

function toWebpPath(p: string): string {
  return p.replace(/\.(jpg|jpeg|png|gif|bmp|tiff)$/i, '.webp');
}

async function main() {
  console.log(`Using DB: ${DB_URL}`);

  // --- Book covers ---
  const books = await prisma.book.findMany({ where: { coverPath: { not: null } } });
  let bookUpdated = 0;
  for (const book of books) {
    if (!book.coverPath || book.coverPath.endsWith('.webp')) continue;
    const newCoverPath = toWebpPath(book.coverPath);
    // Derive the local filename and check the file exists
    const filename = path.basename(newCoverPath);
    const localPath = path.join(COVERS_DIR, filename);
    if (await fs.pathExists(localPath)) {
      await prisma.book.update({ where: { id: book.id }, data: { coverPath: newCoverPath } });
      bookUpdated++;
    } else {
      console.warn(`  [WARN] webp not found for book ${book.id}: ${localPath}`);
    }
  }
  console.log(`[covers] Updated ${bookUpdated}/${books.length} book records.`);

  // --- Author pictures ---
  const authors = await prisma.author.findMany({ where: { picture: { not: null } } });
  let authorUpdated = 0;
  for (const author of authors) {
    if (!author.picture || author.picture.endsWith('.webp')) continue;
    const newFilename = toWebpPath(author.picture);
    if (await fs.pathExists(path.join(AUTHOR_PICS_DIR, newFilename))) {
      await prisma.author.update({ where: { id: author.id }, data: { picture: newFilename } });
      authorUpdated++;
    } else {
      console.warn(`  [WARN] webp not found for author ${author.id}: ${newFilename}`);
    }
  }
  console.log(`[authors] Updated ${authorUpdated}/${authors.length} author records.`);

  // --- Shelf backgrounds ---
  const shelves = await prisma.navShelf.findMany({ where: { backgroundImage: { not: null } } });
  let shelfUpdated = 0;
  for (const shelf of shelves) {
    if (!shelf.backgroundImage || shelf.backgroundImage.endsWith('.webp')) continue;
    const newFilename = toWebpPath(shelf.backgroundImage);
    if (await fs.pathExists(path.join(SHELF_BG_DIR, newFilename))) {
      await prisma.navShelf.update({ where: { id: shelf.id }, data: { backgroundImage: newFilename } });
      shelfUpdated++;
    } else {
      console.warn(`  [WARN] webp not found for shelf ${shelf.id}: ${newFilename}`);
    }
  }
  console.log(`[shelf-bgs] Updated ${shelfUpdated}/${shelves.length} shelf records.`);

  await prisma.$disconnect();
  console.log('Done.');
}

main().catch(async err => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
