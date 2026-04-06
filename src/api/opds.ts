import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../db.js';
import { create } from 'xmlbuilder2';

const router = Router();

// Helper to create OPDS feed structure
function createFeed(title: string, id: string, updated: Date = new Date()) {
  return create({ version: '1.0', encoding: 'UTF-8' })
    .ele('feed', {
      xmlns: 'http://www.w3.org/2005/Atom',
      'xmlns:dc': 'http://purl.org/dc/terms/',
      'xmlns:opds': 'http://opds-spec.org/2010/catalog',
    })
    .ele('id').txt(id).up()
    .ele('title').txt(title).up()
    .ele('updated').txt(updated.toISOString()).up()
    .ele('author')
      .ele('name').txt('eBook Server').up()
    .up();
}

const getBaseUrl = (req: Request) => {
  const host = req.get('host');
  const protocol = req.protocol;
  return process.env.BASE_URL || `${protocol}://${host}`;
};

// Root navigation feed
router.get('/', (req: Request, res: Response) => {
  const baseUrl = getBaseUrl(req);
  const feed = createFeed('eBook Server Catalog', `${baseUrl}/opds`);
  
  feed.ele('link', { rel: 'self', href: `${baseUrl}/opds`, type: 'application/atom+xml;profile=opds-catalog;kind=navigation' }).up();
  feed.ele('link', { rel: 'start', href: `${baseUrl}/opds`, type: 'application/atom+xml;profile=opds-catalog;kind=navigation' }).up();

  // Recent
  feed.ele('entry')
    .ele('title').txt('Recently Added').up()
    .ele('id').txt(`${baseUrl}/opds/recent`).up()
    .ele('content', { type: 'text' }).txt('The most recently added books').up()
    .ele('link', { rel: 'subsection', href: `${baseUrl}/opds/recent`, type: 'application/atom+xml;profile=opds-catalog;kind=navigation' }).up()
  .up();

  // Authors
  feed.ele('entry')
    .ele('title').txt('Authors').up()
    .ele('id').txt(`${baseUrl}/opds/authors`).up()
    .ele('content', { type: 'text' }).txt('Browse books by author').up()
    .ele('link', { rel: 'subsection', href: `${baseUrl}/opds/authors`, type: 'application/atom+xml;profile=opds-catalog;kind=navigation' }).up()
  .up();

  // Series
  feed.ele('entry')
    .ele('title').txt('Series').up()
    .ele('id').txt(`${baseUrl}/opds/series`).up()
    .ele('content', { type: 'text' }).txt('Browse books by series').up()
    .ele('link', { rel: 'subsection', href: `${baseUrl}/opds/series`, type: 'application/atom+xml;profile=opds-catalog;kind=navigation' }).up()
  .up();

  // Tags
  feed.ele('entry')
    .ele('title').txt('Tags').up()
    .ele('id').txt(`${baseUrl}/opds/tags`).up()
    .ele('content', { type: 'text' }).txt('Browse books by tag').up()
    .ele('link', { rel: 'subsection', href: `${baseUrl}/opds/tags`, type: 'application/atom+xml;profile=opds-catalog;kind=navigation' }).up()
  .up();

  res.set('Content-Type', 'application/atom+xml;charset=utf-8');
  res.send(feed.end({ prettyPrint: true }));
});

// Recent books feed
router.get('/recent', async (req: Request, res: Response) => {
  const baseUrl = getBaseUrl(req);
  const books = await prisma.book.findMany({
    take: 50,
    orderBy: { addedDate: 'desc' },
    include: { authors: true, series: true, tags: true },
  });

  const feed = createFeed('Recently Added', `${baseUrl}/opds/recent`);
  feed.ele('link', { rel: 'self', href: `${baseUrl}/opds/recent`, type: 'application/atom+xml;profile=opds-catalog;kind=navigation' }).up();
  feed.ele('link', { rel: 'start', href: `${baseUrl}/opds`, type: 'application/atom+xml;profile=opds-catalog;kind=navigation' }).up();

  for (const book of books) {
    const entry = feed.ele('entry');
    entry.ele('title').txt(book.title).up();
    entry.ele('id').txt(`urn:uuid:${book.id}`).up();
    entry.ele('updated').txt(book.addedDate.toISOString()).up();
    
    for (const author of book.authors) {
      entry.ele('author').ele('name').txt(author.name).up().up();
    }

    if (book.series) {
      entry.ele('content', { type: 'text' }).txt(`Series: ${book.series.name}${book.seriesNumber ? ` (Book ${book.seriesNumber})` : ''}`).up();
    }

    // Cover link
    if (book.coverPath) {
      const coverFilename = book.coverPath.split('/').pop();
      entry.ele('link', { 
        rel: 'http://opds-spec.org/image', 
        href: `${baseUrl}/api/covers/${coverFilename}`, 
        type: 'image/jpeg' 
      }).up();
      entry.ele('link', { 
        rel: 'http://opds-spec.org/image/thumbnail', 
        href: `${baseUrl}/api/covers/${coverFilename}`, 
        type: 'image/jpeg' 
      }).up();
    }

    // Download link
    const mimeType = book.format === 'epub' ? 'application/epub+zip' : 'application/pdf';
    entry.ele('link', { 
      rel: 'http://opds-spec.org/acquisition', 
      href: `${baseUrl}/api/download/${book.id}`, 
      type: mimeType 
    }).up();
  }

  res.set('Content-Type', 'application/atom+xml;charset=utf-8');
  res.send(feed.end({ prettyPrint: true }));
});

// Authors feed
router.get('/authors', async (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    const authors = await prisma.author.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { books: true } } }
    });

    const feed = createFeed('Authors', `${baseUrl}/opds/authors`);
    feed.ele('link', { rel: 'self', href: `${baseUrl}/opds/authors`, type: 'application/atom+xml;profile=opds-catalog;kind=navigation' }).up();

    for (const author of authors) {
        feed.ele('entry')
            .ele('title').txt(`${author.name} (${author._count.books})`).up()
            .ele('id').txt(`${baseUrl}/opds/authors/${author.id}`).up()
            .ele('link', { rel: 'subsection', href: `${baseUrl}/opds/authors/${author.id}`, type: 'application/atom+xml;profile=opds-catalog;kind=navigation' }).up()
        .up();
    }

    res.set('Content-Type', 'application/atom+xml;charset=utf-8');
    res.send(feed.end({ prettyPrint: true }));
});

// Books by author
router.get('/authors/:id', async (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    const { id } = req.params;
    if (typeof id !== 'string') return res.status(400).send('Invalid ID');
    const author = await prisma.author.findUnique({
        where: { id },
        include: { books: { include: { authors: true, series: true, tags: true }, orderBy: { title: 'asc' } } }
    });

    if (!author) return res.status(404).send('Author not found');

    const feed = createFeed(`Books by ${author.name}`, `${baseUrl}/opds/authors/${id}`);
    
    for (const book of author.books) {
        const entry = feed.ele('entry');
        entry.ele('title').txt(book.title).up();
        entry.ele('id').txt(`urn:uuid:${book.id}`).up();
        entry.ele('updated').txt(book.addedDate.toISOString()).up();
        
        for (const a of book.authors) {
          entry.ele('author').ele('name').txt(a.name).up().up();
        }

        if (book.coverPath) {
          const coverFilename = book.coverPath.split('/').pop();
          entry.ele('link', { rel: 'http://opds-spec.org/image', href: `${baseUrl}/api/covers/${coverFilename}`, type: 'image/jpeg' }).up();
        }

        const mimeType = book.format === 'epub' ? 'application/epub+zip' : 'application/pdf';
        entry.ele('link', { rel: 'http://opds-spec.org/acquisition', href: `${baseUrl}/api/download/${book.id}`, type: mimeType }).up();
    }

    res.set('Content-Type', 'application/atom+xml;charset=utf-8');
    res.send(feed.end({ prettyPrint: true }));
});

// Series feed
router.get('/series', async (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    const series = await prisma.series.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { books: true } } }
    });

    const feed = createFeed('Series', `${baseUrl}/opds/series`);
    
    for (const s of series) {
        feed.ele('entry')
            .ele('title').txt(`${s.name} (${s._count.books})`).up()
            .ele('id').txt(`${baseUrl}/opds/series/${s.id}`).up()
            .ele('link', { rel: 'subsection', href: `${baseUrl}/opds/series/${s.id}`, type: 'application/atom+xml;profile=opds-catalog;kind=navigation' }).up()
        .up();
    }

    res.set('Content-Type', 'application/atom+xml;charset=utf-8');
    res.send(feed.end({ prettyPrint: true }));
});

// Books in series
router.get('/series/:id', async (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    const { id } = req.params;
    if (typeof id !== 'string') return res.status(400).send('Invalid ID');
    const series = await prisma.series.findUnique({
        where: { id },
        include: { books: { include: { authors: true, series: true, tags: true }, orderBy: { seriesNumber: 'asc' } } }
    });

    if (!series) return res.status(404).send('Series not found');

    const feed = createFeed(`Series: ${series.name}`, `${baseUrl}/opds/series/${id}`);
    
    for (const book of series.books) {
        const entry = feed.ele('entry');
        entry.ele('title').txt(book.title).up();
        entry.ele('id').txt(`urn:uuid:${book.id}`).up();
        entry.ele('updated').txt(book.addedDate.toISOString()).up();
        
        for (const a of book.authors) {
          entry.ele('author').ele('name').txt(a.name).up().up();
        }

        if (book.coverPath) {
          const coverFilename = book.coverPath.split('/').pop();
          entry.ele('link', { rel: 'http://opds-spec.org/image', href: `${baseUrl}/api/covers/${coverFilename}`, type: 'image/jpeg' }).up();
        }

        const mimeType = book.format === 'epub' ? 'application/epub+zip' : 'application/pdf';
        entry.ele('link', { rel: 'http://opds-spec.org/acquisition', href: `${baseUrl}/api/download/${book.id}`, type: mimeType }).up();
    }

    res.set('Content-Type', 'application/atom+xml;charset=utf-8');
    res.send(feed.end({ prettyPrint: true }));
});

// Tags feed
router.get('/tags', async (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    const tags = await prisma.tag.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { books: true } } }
    });

    const feed = createFeed('Tags', `${baseUrl}/opds/tags`);
    
    for (const tag of tags) {
        feed.ele('entry')
            .ele('title').txt(`${tag.name} (${tag._count.books})`).up()
            .ele('id').txt(`${baseUrl}/opds/tags/${tag.id}`).up()
            .ele('link', { rel: 'subsection', href: `${baseUrl}/opds/tags/${tag.id}`, type: 'application/atom+xml;profile=opds-catalog;kind=navigation' }).up()
        .up();
    }

    res.set('Content-Type', 'application/atom+xml;charset=utf-8');
    res.send(feed.end({ prettyPrint: true }));
});

// Books by tag
router.get('/tags/:id', async (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    const { id } = req.params;
    if (typeof id !== 'string') return res.status(400).send('Invalid ID');
    const tag = await prisma.tag.findUnique({
        where: { id },
        include: { books: { include: { authors: true, series: true, tags: true }, orderBy: { title: 'asc' } } }
    });

    if (!tag) return res.status(404).send('Tag not found');

    const feed = createFeed(`Books tagged with ${tag.name}`, `${baseUrl}/opds/tags/${id}`);
    
    for (const book of tag.books) {
        const entry = feed.ele('entry');
        entry.ele('title').txt(book.title).up();
        entry.ele('id').txt(`urn:uuid:${book.id}`).up();
        entry.ele('updated').txt(book.addedDate.toISOString()).up();
        
        for (const a of book.authors) {
          entry.ele('author').ele('name').txt(a.name).up().up();
        }

        if (book.coverPath) {
          const coverFilename = book.coverPath.split('/').pop();
          entry.ele('link', { rel: 'http://opds-spec.org/image', href: `${baseUrl}/api/covers/${coverFilename}`, type: 'image/jpeg' }).up();
        }

        const mimeType = book.format === 'epub' ? 'application/epub+zip' : 'application/pdf';
        entry.ele('link', { rel: 'http://opds-spec.org/acquisition', href: `${baseUrl}/api/download/${book.id}`, type: mimeType }).up();
    }

    res.set('Content-Type', 'application/atom+xml;charset=utf-8');
    res.send(feed.end({ prettyPrint: true }));
});

export default router;
