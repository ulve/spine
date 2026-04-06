import fs from 'fs-extra';
import path from 'path';
import prisma from '../db.js';
// @ts-ignore
import EPubImport from 'epub2';
const EPub = (EPubImport as any).EPub || EPubImport;
import { fromPath } from 'pdf2pic';
import * as PDFLib from 'pdf-lib';
import chokidar from 'chokidar';

const BOOKS_DIR = process.env.BOOKS_DIR || '/app/books';
const COVERS_DIR = process.env.COVERS_DIR || '/app/data/covers';

export class ScannerService {
  async init() {
    await fs.ensureDir(COVERS_DIR);
    await fs.ensureDir(BOOKS_DIR);
  }

  async scan() {
    console.log(`Scanning directory: ${BOOKS_DIR}`);
    const files = await this.getAllFiles(BOOKS_DIR);
    console.log(`Found ${files.length} files. Processing...`);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.epub' || ext === '.pdf') {
        try {
          await this.processFile(file);
        } catch (error) {
          console.error(`Error processing ${file}:`, error);
        }
      }
    }
    console.log('Scan completed.');
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map((res) => {
        const resPath = path.resolve(dir, res.name);
        return res.isDirectory() ? this.getAllFiles(resPath) : [resPath];
      })
    );
    return files.flat();
  }

  public async processFile(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    
    // Check if book already exists in DB
    const existingBook = await prisma.book.findUnique({
      where: { filePath },
    });

    if (existingBook && existingBook.coverPath && existingBook.description) {
      // Skip if already exists and has cover AND description
      return;
    }

    if (ext === '.epub') {
      await this.processEpub(filePath, !!existingBook);
    } else if (ext === '.pdf') {
      await this.processPdf(filePath, !!existingBook);
    }
  }

  private async processEpub(filePath: string, isUpdate: boolean = false) {
    return new Promise<void>((resolve, reject) => {
      const epub = new EPub(filePath);
      epub.on('end', async () => {
        try {
          const metadata = epub.metadata;
          const title = metadata.title || path.basename(filePath, '.epub');
          const authorName = metadata.creator || 'Unknown';
          const description = metadata.description || null;
          const format = 'epub';

          let coverPath: string | null = null;
          
          // Robust cover identification
          let coverId = null;
          if (epub.metadata.cover && epub.manifest[epub.metadata.cover]) {
            coverId = epub.metadata.cover;
          } else {
            const manifestItems = Object.values(epub.manifest) as any[];
            const coverByProperty = manifestItems.find(
              (item) => item.properties === 'cover-image'
            );
            if (coverByProperty) {
              coverId = coverByProperty.id;
            } else {
              const coverById = manifestItems.find(
                (item) => 
                  item.id?.toLowerCase().includes('cover') && 
                  item['media-type']?.startsWith('image/')
              );
              if (coverById) {
                coverId = coverById.id;
              }
            }
          }

          if (coverId) {
            const coverImage = await this.getEpubCover(epub, coverId);
            if (coverImage) {
              const fileName = `${path.basename(filePath, '.epub')}-cover.jpg`;
              coverPath = path.join(COVERS_DIR, fileName);
              await fs.writeFile(coverPath, coverImage);
            }
          }

          await this.saveBookToDb({
            title,
            filePath,
            format,
            authorName,
            coverPath,
            description,
          }, isUpdate);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      epub.on('error', (err) => reject(err));
      epub.parse();
    });
  }

  private async getEpubCover(epub: any, coverId: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
        epub.getImage(coverId, (err, data, mimeType) => {
            if (err || !data) {
                resolve(null);
            } else {
                resolve(data);
            }
        });
    });
  }

  private async processPdf(filePath: string, isUpdate: boolean = false) {
    const pdfData = await fs.readFile(filePath);
    const pdfDoc = await PDFLib.PDFDocument.load(pdfData, { updateMetadata: false });
    
    const title = pdfDoc.getTitle() || path.basename(filePath, '.pdf');
    const authorName = pdfDoc.getAuthor() || 'Unknown';
    const format = 'pdf';

    // Extract first page as cover
    const fileName = `${path.basename(filePath, '.pdf')}-cover`;
    const options = {
      density: 100,
      saveFilename: fileName,
      savePath: COVERS_DIR,
      format: "jpg",
      width: 600,
      height: 800
    };

    let coverPath: string | null = null;
    try {
        const storeAsImage = fromPath(filePath, options);
        const result = await storeAsImage(1, { responseType: "image" });
        if (result && result.path) {
            coverPath = result.path;
        }
    } catch (err) {
        console.error(`Failed to extract cover for PDF: ${filePath}`, err);
    }

    await this.saveBookToDb({
      title,
      filePath,
      format,
      authorName,
      coverPath,
    }, isUpdate);
  }

  private async saveBookToDb(data: {
    title: string;
    filePath: string;
    format: string;
    authorName: string;
    coverPath: string | null;
    description?: string | null;
    goodreadsLink?: string | null;
    seriesName?: string;
    seriesNumber?: number;
    tags?: string[];
  }, isUpdate: boolean = false) {
    // Create Author if doesn't exist
    const author = await prisma.author.upsert({
      where: { name: data.authorName },
      update: {},
      create: { name: data.authorName },
    });

    let seriesId: string | undefined;
    if (data.seriesName) {
      const series = await prisma.series.upsert({
        where: { name: data.seriesName },
        update: {},
        create: { name: data.seriesName },
      });
      seriesId = series.id;
    }

    if (isUpdate) {
      const updateData: any = {};
      if (data.coverPath) updateData.coverPath = data.coverPath;
      if (data.description) updateData.description = data.description;
      if (data.goodreadsLink) updateData.goodreadsLink = data.goodreadsLink;

      if (Object.keys(updateData).length > 0) {
        await prisma.book.update({
          where: { filePath: data.filePath },
          data: updateData
        });
        console.log(`Updated book metadata for: ${data.title}`);
      }
    } else {
      const book = await prisma.book.create({
        data: {
          title: data.title,
          filePath: data.filePath,
          format: data.format,
          coverPath: data.coverPath,
          description: data.description,
          goodreadsLink: data.goodreadsLink,
          series: seriesId ? {
            connect: { id: seriesId }
          } : undefined,
          seriesNumber: data.seriesNumber ?? null,
          authors: {
            connect: { id: author.id },
          },
          tags: data.tags && data.tags.length > 0 ? {
            connectOrCreate: data.tags.map(tag => ({
              where: { name: tag },
              create: { name: tag }
            }))
          } : undefined,
        },
      });

      console.log(`Saved book: ${book.title}`);
    }
  }

  watch() {
    console.log(`Watching for changes in: ${BOOKS_DIR}`);
    const watcher = chokidar.watch(BOOKS_DIR, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    watcher
      .on('add', (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.epub' || ext === '.pdf') {
          console.log(`File added: ${filePath}`);
          this.processFile(filePath).catch(console.error);
        }
      })
      .on('unlink', async (filePath) => {
        console.log(`File removed: ${filePath}`);
        try {
          await prisma.book.delete({ where: { filePath } });
        } catch (error) {
          // Might not exist in DB
        }
      });
  }
}
