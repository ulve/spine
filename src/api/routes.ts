import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../db.js';
import path from 'path';
import fs from 'fs-extra';
import multer from 'multer';
import { scanner } from '../index.js';
import { attachOptionalUser, authenticateToken, requireAdmin, type AuthenticatedRequest } from './auth.js';
import {
  BOOK_SORT_FIELDS,
  READING_STATUSES,
  normalizeOptionalUrl,
  normalizeString,
  normalizeStringArray,
  parsePaginationNumber,
} from './validation.js';
// @ts-ignore
import AdmZipImport from 'adm-zip';
const AdmZip = AdmZipImport.default || AdmZipImport;

const router = Router();
const BOOKS_DIR = process.env.BOOKS_DIR || '/app/books';
const COVERS_DIR = process.env.COVERS_DIR || '/app/data/covers';

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.ensureDir(BOOKS_DIR);
    cb(null, BOOKS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.epub' || ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only EPUB and PDF files are allowed'));
    }
  },
});

const coverStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.ensureDir(COVERS_DIR);
    cb(null, COVERS_DIR);
  },
  filename: (req, file, cb) => {
    const bookId = req.params.id as string;
    cb(null, `cover-${bookId}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const uploadCover = multer({
  storage: coverStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const getRequestUser = (req: Request) => (req as AuthenticatedRequest).user;

// Helper for embedding cover in EPUB
async function embedCoverInEpub(epubPath: string, imagePath: string) {
    const zip = new AdmZip(epubPath);
    
    const containerEntry = zip.getEntry('META-INF/container.xml');
    if (!containerEntry) throw new Error('Invalid EPUB: Missing container.xml');
    
    const containerXml = containerEntry.getData().toString('utf8');
    const opfPathMatch = containerXml.match(/full-path="([^"]+)"/);
    if (!opfPathMatch) throw new Error('Invalid EPUB: Could not find OPF path');
    const opfPath = opfPathMatch[1];
    
    const opfEntry = zip.getEntry(opfPath);
    if (!opfEntry) throw new Error('Invalid EPUB: Missing OPF file');
    
    const opfDir = path.dirname(opfPath);
    const opfXml = opfEntry.getData().toString('utf8');
    
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    const imageBuffer = await fs.readFile(imagePath);
    const internalCoverName = 'uploaded-cover' + ext;
    const internalImagePath = path.join(opfDir, internalCoverName).replace(/\\/g, '/');
    zip.addFile(internalImagePath, imageBuffer);
    
    let updatedOpf = opfXml;
    const coverItemId = 'uploaded-cover-img';
    
    const manifestItem = `<item id="${coverItemId}" href="${internalCoverName}" media-type="${mimeType}" properties="cover-image" />`;
    if (updatedOpf.includes('<manifest>')) {
        updatedOpf = updatedOpf.replace('<manifest>', '<manifest>\n    ' + manifestItem);
    } else if (updatedOpf.includes('<opf:manifest>')) {
        updatedOpf = updatedOpf.replace('<opf:manifest>', '<opf:manifest>\n    ' + manifestItem);
    }
    
    const coverMeta = `<meta name="cover" content="${coverItemId}" />`;
    if (updatedOpf.includes('</metadata>')) {
        updatedOpf = updatedOpf.replace('</metadata>', '    ' + coverMeta + '\n  </metadata>');
    } else if (updatedOpf.includes('</opf:metadata>')) {
        updatedOpf = updatedOpf.replace('</opf:metadata>', '    ' + coverMeta + '\n  </opf:metadata>');
    }
    
    zip.updateFile(opfPath, Buffer.from(updatedOpf));
    zip.writeZip(epubPath);
}

// --- ADMIN ROUTES ---

router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, isApproved: true, isAdmin: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (err) {
        console.error('Admin users error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/admin/users/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const user = await prisma.user.update({
            where: { id: req.params.id as string },
            data: { isApproved: true }
        });
        res.json(user);
    } catch (err) {
        console.error('Admin approve error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const targetId = req.params.id as string;
        const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        if (targetUser.isAdmin) {
            const adminCount = await prisma.user.count({ where: { isAdmin: true } });
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Cannot delete the last admin account' });
            }
        }

        await prisma.user.delete({ where: { id: targetId } });
        res.status(204).end();
    } catch (err) {
        console.error('Admin delete user error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- READING STATUS & REVIEWS ---

router.post('/books/:id/status', authenticateToken, async (req, res) => {
    try {
        const userId = getRequestUser(req).userId;
        const bookId = req.params.id as string;
        const { status, progress } = req.body;

        if (!READING_STATUSES.has(status)) {
            return res.status(400).json({ error: 'Invalid reading status' });
        }

        const normalizedProgress = progress === undefined ? 0 : Number(progress);
        if (!Number.isInteger(normalizedProgress) || normalizedProgress < 0) {
            return res.status(400).json({ error: 'Progress must be a non-negative integer' });
        }

        const result = await prisma.readingStatus.upsert({
            where: { userId_bookId: { userId, bookId } },
            update: { status, progress: normalizedProgress },
            create: { userId, bookId, status, progress: normalizedProgress }
        });
        res.json(result);
    } catch (err) {
        console.error('Status update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/books/:id/status', authenticateToken, async (req, res) => {
    try {
        const userId = getRequestUser(req).userId;
        const bookId = req.params.id as string;
        await prisma.readingStatus.delete({
            where: { userId_bookId: { userId, bookId } }
        });
        res.status(204).end();
    } catch (err) {
        const prismaError = err as { code?: string };
        if (prismaError.code === 'P2025') {
            return res.status(404).json({ error: 'Reading status not found' });
        }
        console.error('Status delete error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/books/:id/review', authenticateToken, async (req, res) => {
    try {
        const userId = getRequestUser(req).userId;
        const bookId = req.params.id as string;
        const { rating, comment } = req.body;

        const normalizedComment = normalizeString(comment);
        const normalizedRating =
          rating === null || rating === undefined || rating === ''
            ? null
            : Number(rating);

        if (normalizedRating !== null && (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5)) {
            return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
        }

        if (normalizedComment !== null && normalizedComment.length > 2000) {
            return res.status(400).json({ error: 'Comment must be 2000 characters or fewer' });
        }

        if (normalizedRating === null && normalizedComment === null) {
            return res.status(400).json({ error: 'Rating or comment is required' });
        }

        const result = await prisma.review.upsert({
            where: { userId_bookId: { userId, bookId } },
            update: { rating: normalizedRating, comment: normalizedComment },
            create: { userId, bookId, rating: normalizedRating, comment: normalizedComment }
        });
        res.json(result);
    } catch (err) {
        console.error('Review submit error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/books/:id/reviews', async (req, res) => {
    try {
        const reviews = await prisma.review.findMany({
            where: { bookId: req.params.id as string },
            include: { user: { select: { username: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    } catch (err) {
        console.error('Fetch reviews error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- SHELVES ---

router.get('/shelves', authenticateToken, async (req, res) => {
    try {
        const userId = getRequestUser(req).userId;
        const shelves = await prisma.shelf.findMany({
            where: { userId },
            include: { _count: { select: { books: true } } }
        });
        res.json(shelves);
    } catch (err) {
        console.error('Fetch shelves error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/shelves', authenticateToken, async (req, res) => {
    try {
        const userId = getRequestUser(req).userId;
        const name = normalizeString(req.body.name);
        if (!name) {
            return res.status(400).json({ error: 'Shelf name is required' });
        }

        const shelf = await prisma.shelf.create({
            data: { name, userId }
        });
        res.json(shelf);
    } catch (err) {
        console.error('Create shelf error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/shelves/:id/books/:bookId', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id as string;
        const bookId = req.params.bookId as string;
        const userId = getRequestUser(req).userId;
        const shelf = await prisma.shelf.findFirst({ where: { id, userId } });

        if (!shelf) {
            return res.status(404).json({ error: 'Shelf not found' });
        }

        const updatedShelf = await prisma.shelf.update({
            where: { id },
            data: { books: { connect: { id: bookId } } }
        });
        res.json(updatedShelf);
    } catch (err) {
        console.error('Add book to shelf error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/shelves/:id/books/:bookId', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id as string;
        const bookId = req.params.bookId as string;
        const userId = getRequestUser(req).userId;
        const shelf = await prisma.shelf.findFirst({ where: { id, userId } });

        if (!shelf) {
            return res.status(404).json({ error: 'Shelf not found' });
        }

        const updatedShelf = await prisma.shelf.update({
            where: { id },
            data: { books: { disconnect: { id: bookId } } }
        });
        res.json(updatedShelf);
    } catch (err) {
        console.error('Remove book from shelf error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- EXISTING ROUTES UPDATED ---

router.get('/books', attachOptionalUser, async (req: Request, res: Response) => {
  try {
    const page = parsePaginationNumber(req.query['page'], 1, { min: 1, max: 10000 });
    const limit = parsePaginationNumber(req.query['limit'], 20, { min: 1, max: 100 });
    const skip = (page - 1) * limit;
    const q = normalizeString(req.query['q']);
    const authorId = normalizeString(req.query['authorId']);
    const seriesId = normalizeString(req.query['seriesId']);
    const tagId = normalizeString(req.query['tagId']);
    const status = normalizeString(req.query['status']);
    const sortBy = (req.query['sortBy'] as string) || 'addedDate';
    const sortOrder = (req.query['sortOrder'] as string) || 'desc';
    const currentUserId = (req as Partial<AuthenticatedRequest>).user?.userId;

    if (!BOOK_SORT_FIELDS.has(sortBy)) {
      return res.status(400).json({ error: 'Invalid sortBy value' });
    }

    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      return res.status(400).json({ error: 'Invalid sortOrder value' });
    }

    if (status && !READING_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    if (status && !currentUserId) {
      return res.status(401).json({ error: 'Authentication required for status filtering' });
    }

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { authors: { some: { name: { contains: q } } } },
        { series: { name: { contains: q } } },
      ];
    }
    if (authorId) where.authors = { some: { id: authorId } };
    if (seriesId) where.seriesId = seriesId;
    if (tagId) where.tags = { some: { id: tagId } };
    if (status && currentUserId) {
      where.statuses = { some: { userId: currentUserId, status } };
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          authors: true,
          series: true,
          tags: true,
          statuses: currentUserId ? { where: { userId: currentUserId } } : undefined,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.book.count({ where }),
    ]);

    res.json({
      books,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('List books error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/books/:id', attachOptionalUser, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const currentUserId = (req as Partial<AuthenticatedRequest>).user?.userId;
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        authors: true,
        series: true,
        tags: true,
        statuses: currentUserId ? { where: { userId: currentUserId } } : undefined,
        reviews: { include: { user: { select: { username: true } } } }
      },
    });

    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/authors', async (_req: Request, res: Response) => {
  try {
    const authors = await prisma.author.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { books: true } } },
    });
    res.json(authors);
  } catch (error) {
    console.error('List authors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/series', async (_req: Request, res: Response) => {
  try {
    const series = await prisma.series.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { books: true } } },
    });
    res.json(series);
  } catch (error) {
    console.error('List series error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/tags', async (_req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { books: true } } },
    });
    res.json(tags);
  } catch (error) {
    console.error('List tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/download/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const book = await prisma.book.findUnique({
      where: { id },
      include: { authors: true }
    });

    if (!book) return res.status(404).json({ error: 'Book not found' });

    // Prevent path traversal: ensure the file is within the books directory
    const resolvedPath = path.resolve(book.filePath);
    const resolvedBooksDir = path.resolve(BOOKS_DIR);
    if (!resolvedPath.startsWith(resolvedBooksDir + path.sep) && resolvedPath !== resolvedBooksDir) {
      console.error(`Path traversal attempt blocked: ${book.filePath}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!await fs.pathExists(resolvedPath)) return res.status(404).json({ error: 'File not found on disk' });

    const authorNames = book.authors.map(a => a.name).join(', ') || 'Unknown Author';
    const extension = path.extname(resolvedPath);
    const downloadName = `${book.title} - ${authorNames}${extension}`;

    res.download(resolvedPath, downloadName);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(
  '/upload',
  authenticateToken,
  requireAdmin,
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 100 },
  ]),
  async (req: Request, res: Response) => {
  try {
    const uploadedFiles = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const files = [
      ...(uploadedFiles?.['files'] || []),
      ...(uploadedFiles?.['file'] || []),
    ];

    if (files.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    for (const file of files) {
      scanner.processFile(file.path).catch((err) => console.error('Error processing uploaded file:', err));
    }

    res.status(201).json({
      message: `${files.length} file${files.length === 1 ? '' : 's'} uploaded successfully`,
      count: files.length,
      filePaths: files.map((file) => file.path),
    });
  } catch (error) {
    console.error('Upload book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/books/:id/cover', authenticateToken, requireAdmin, uploadCover.single('cover'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const embed = req.body.embed === 'true' || req.body.embed === true;
    if (!req.file) return res.status(400).json({ error: 'No cover image uploaded' });

    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const coverPath = req.file.path;
    if (embed && book.format === 'epub') {
        try {
            await embedCoverInEpub(book.filePath, coverPath);
        } catch (err) {
            console.error('[CoverUpload] Failed to embed cover in EPUB:', err);
        }
    }

    const updatedBook = await prisma.book.update({
      where: { id },
      data: { coverPath },
      include: { authors: true, series: true, tags: true }
    });

    res.json(updatedBook);
  } catch (error) {
    console.error('Cover upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/books/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, authors, seriesName, seriesNumber, tags, description, goodreadsLink } = req.body;

    const data: Record<string, unknown> = {};
    const normalizedTitle = normalizeString(title);
    if (title !== undefined && !normalizedTitle) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    if (normalizedTitle) data.title = normalizedTitle;

    if (seriesNumber !== undefined) {
      if (seriesNumber === null || seriesNumber === '') {
        data.seriesNumber = null;
      } else {
        const parsedSeriesNumber = Number(seriesNumber);
        if (!Number.isFinite(parsedSeriesNumber) || parsedSeriesNumber < 0) {
          return res.status(400).json({ error: 'Series number must be a non-negative number' });
        }
        data.seriesNumber = parsedSeriesNumber;
      }
    }

    if (description !== undefined) {
      const normalizedDescription = normalizeString(description);
      if (normalizedDescription !== null && normalizedDescription.length > 10000) {
        return res.status(400).json({ error: 'Description must be 10000 characters or fewer' });
      }
      data.description = normalizedDescription;
    }

    try {
      const normalizedGoodreadsLink = normalizeOptionalUrl(goodreadsLink, 'Goodreads link');
      if (normalizedGoodreadsLink !== undefined) {
        data.goodreadsLink = normalizedGoodreadsLink;
      }
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }

    let normalizedAuthors: string[] | undefined;
    let normalizedTags: string[] | undefined;
    try {
      normalizedAuthors = normalizeStringArray(authors, 'Authors');
      normalizedTags = normalizeStringArray(tags, 'Tags');
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }

    if (normalizedAuthors) {
      data.authors = {
        set: [],
        connectOrCreate: normalizedAuthors.map((name: string) => ({ where: { name }, create: { name } })),
      };
    }

    if (seriesName !== undefined) {
      const normalizedSeriesName = normalizeString(seriesName);
      if (normalizedSeriesName === null) {
        data.series = { disconnect: true };
      } else {
        data.series = { connectOrCreate: { where: { name: normalizedSeriesName }, create: { name: normalizedSeriesName } } };
      }
    }

    if (normalizedTags) {
      data.tags = {
        set: [],
        connectOrCreate: normalizedTags.map((name: string) => ({ where: { name }, create: { name } })),
      };
    }

    const existingBook = await prisma.book.findUnique({ where: { id } });
    if (!existingBook) return res.status(404).json({ error: 'Book not found' });

    const updatedBook = await prisma.book.update({
      where: { id },
      data,
      include: { authors: true, series: true, tags: true },
    });

    res.json(updatedBook);
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
