import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookCard } from '../components/BookCard';
import { Book, BooksResponse, NavShelf } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  Loader2,
  Inbox,
  LayoutGrid,
  List,
  SortAsc,
  ChevronDown,
  BookMarked,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '../lib/utils';

type SortOption = {
  label: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

const sortOptions: SortOption[] = [
  { label: 'Recently Added', sortBy: 'addedDate', sortOrder: 'desc' },
  { label: 'Oldest Added', sortBy: 'addedDate', sortOrder: 'asc' },
  { label: 'Title (A-Z)', sortBy: 'title', sortOrder: 'asc' },
  { label: 'Title (Z-A)', sortBy: 'title', sortOrder: 'desc' },
  { label: 'Series Number', sortBy: 'seriesNumber', sortOrder: 'asc' },
];

function shelfHue(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

function extractImageHsl(src: string): Promise<{ h: number; s: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 16; canvas.height = 16;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, 16, 16);
      const data = ctx.getImageData(0, 0, 16, 16).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness < 20 || brightness > 235) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
      }
      if (count === 0) { resolve(null); return; }
      r = r / count / 255; g = g / count / 255; b = b / count / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      const l = (max + min) / 2;
      let h = 0, s = 0;
      if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
          case r: h = ((g - b) / d + 6) % 6; break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h = Math.round(h * 60);
      }
      resolve({ h, s });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export const ShelfPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [shelf, setShelf] = useState<NavShelf | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shelfLoading, setShelfLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentSort, setCurrentSort] = useState<SortOption>(sortOptions[0]);
  const [isSortOpen, setIsSortOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setShelfLoading(true);
    fetch(`/api/nav-shelves`)
      .then(r => r.json())
      .then((shelves: NavShelf[]) => {
        const found = shelves.find(s => s.id === id);
        if (!found) { navigate('/'); return; }
        setShelf(found);
      })
      .catch(console.error)
      .finally(() => setShelfLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!shelf || shelf.tags.length === 0) {
      setBooks([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const fetchBooks = async () => {
      setLoading(true);
      try {
        const tagIds = shelf.tags.map(t => t.id).join(',');
        const params = new URLSearchParams({
          limit: '1000',
          tagIds,
          sortBy: currentSort.sortBy,
          sortOrder: currentSort.sortOrder,
        });

        const response = await fetch(`/api/books?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data: BooksResponse = await response.json();
        if (!response.ok) throw new Error((data as any).error || 'Failed to fetch books');
        setBooks(data.books);
        setTotal(data.pagination.total);
      } catch (err) {
        console.error('Error fetching shelf books:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [shelf, currentSort, token]);

  useEffect(() => {
    if (!shelf?.backgroundImage) return;
    let cancelled = false;
    extractImageHsl(`/api/shelf-backgrounds/${shelf.backgroundImage}`).then((hsl) => {
      if (cancelled || !hsl) return;
      const s = Math.min(hsl.s * 0.35, 0.18);
      document.body.style.backgroundColor = `hsl(${hsl.h} ${Math.round(s * 100)}% 6%)`;
    });
    return () => {
      cancelled = true;
      document.body.style.backgroundColor = '';
    };
  }, [shelf?.backgroundImage]);

  if (shelfLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="animate-pulse font-black text-xs uppercase tracking-widest">Loading Shelf...</p>
      </div>
    );
  }

  if (!shelf) return null;

  const bgUrl = shelf.backgroundImage ? `/api/shelf-backgrounds/${shelf.backgroundImage}` : null;
  const hue = shelfHue(shelf.name);
  const fallbackGradient = `linear-gradient(135deg, hsl(${hue} 55% 14%) 0%, hsl(${(hue + 45) % 360} 35% 7%) 100%)`;

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div
        className="relative rounded-3xl overflow-hidden h-52 md:h-72 flex items-end p-8"
        style={bgUrl
          ? { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: fallbackGradient }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="relative w-full">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <h1
            className="text-5xl md:text-6xl text-white flex items-center gap-4 leading-none mb-4"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontWeight: 600 }}
          >
            <BookMarked className="w-10 h-10 text-primary shrink-0" style={{ fontFamily: 'inherit' }} />
            {shelf.name}
          </h1>
          <div className="flex flex-wrap gap-2">
            {shelf.tags.map(tag => (
              <span key={tag.id} className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/75">
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">
          {total} books
        </p>

        <div className="flex flex-wrap items-center gap-4">
          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 bg-secondary/50 hover:bg-secondary border border-border px-4 py-2 rounded-xl transition-all"
            >
              <SortAsc className="w-4 h-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-wider">{currentSort.label}</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isSortOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsSortOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-[#161B22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-40 p-1"
                  >
                    {sortOptions.map(option => (
                      <button
                        key={option.label}
                        onClick={() => { setCurrentSort(option); setIsSortOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                          currentSort.label === option.label
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-secondary/50 p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground")}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground")}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Book grid */}
      {loading && books.length === 0 ? (
        <div className="h-[40vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : books.length > 0 ? (
        <div
          className={cn(
            "grid gap-6",
            viewMode === 'grid'
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              : "grid-cols-1"
          )}
        >
          {books.map(book => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.25 }}
            >
              <BookCard
                book={book}
                viewMode={viewMode}
                onUpdate={updated => setBooks(prev => prev.map(b => b.id === updated.id ? updated : b))}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-[40vh] flex flex-col items-center justify-center gap-4 text-muted-foreground"
        >
          <Inbox className="w-16 h-16 opacity-20" />
          <p className="text-sm font-black uppercase tracking-widest">No books on this shelf</p>
          <p className="text-xs text-muted-foreground/60">Add tags to books to populate this shelf</p>
        </motion.div>
      )}

      {loading && books.length > 0 && (
        <div className="fixed bottom-8 right-8 bg-background/80 backdrop-blur-md border border-border px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl z-50">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs font-black uppercase tracking-[0.2em]">Synchronizing...</span>
        </div>
      )}
    </div>
  );
};
