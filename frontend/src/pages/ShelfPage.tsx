import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookCard } from '../components/BookCard';
import { Book, BooksResponse, NavShelf, PaginationInfo } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
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

export const ShelfPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [shelf, setShelf] = useState<NavShelf | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [shelfLoading, setShelfLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentSort, setCurrentSort] = useState<SortOption>(sortOptions[0]);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const limit = 20;

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
      setPagination(null);
      setLoading(false);
      return;
    }

    const fetchBooks = async () => {
      setLoading(true);
      try {
        const tagIds = shelf.tags.map(t => t.id).join(',');
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
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
        setPagination(data.pagination);
      } catch (err) {
        console.error('Error fetching shelf books:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [shelf, page, currentSort, token]);

  useEffect(() => { setPage(1); }, [currentSort]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

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

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div
        className="relative rounded-3xl overflow-hidden h-48 md:h-64 flex items-end p-8"
        style={bgUrl ? { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg, #1a1f35 0%, #0f1626 100%)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="relative flex items-end gap-4 w-full">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 text-white/60 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-white flex items-center gap-4">
              <BookMarked className="w-10 h-10 text-primary" />
              {shelf.name}
            </h1>
            <div className="flex flex-wrap gap-2 mt-3">
              {shelf.tags.map(tag => (
                <span key={tag.id} className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80">
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">
          {pagination?.total ?? 0} books
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

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-xl border border-border/50">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-secondary disabled:opacity-20 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-black px-2 tabular-nums tracking-widest">{page} / {pagination.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="p-2 rounded-lg hover:bg-secondary disabled:opacity-20 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Book grid */}
      {loading && books.length === 0 ? (
        <div className="h-[40vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {books.length > 0 ? (
            <motion.div
              key={viewMode + page + currentSort.label}
              variants={container}
              initial="hidden"
              animate="show"
              className={cn(
                "grid gap-6",
                viewMode === 'grid'
                  ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                  : "grid-cols-1"
              )}
            >
              {books.map(book => (
                <motion.div key={book.id} variants={item}>
                  <BookCard
                    book={book}
                    viewMode={viewMode}
                    onUpdate={updated => setBooks(prev => prev.map(b => b.id === updated.id ? updated : b))}
                  />
                </motion.div>
              ))}
            </motion.div>
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
        </AnimatePresence>
      )}

      {loading && books.length > 0 && (
        <div className="fixed bottom-8 right-8 bg-background/80 backdrop-blur-md border border-border px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs font-black uppercase tracking-[0.2em]">Synchronizing...</span>
        </div>
      )}
    </div>
  );
};
