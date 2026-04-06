import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookCard } from '../components/BookCard';
import { Book, BooksResponse, PaginationInfo } from '../types';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Inbox, 
  X,
  LayoutGrid,
  List,
  SortAsc,
  ChevronDown,
  Library
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LibraryPageProps {
  searchQuery?: string;
}

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

export const LibraryPage: React.FC<LibraryPageProps> = ({ searchQuery = '' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentSort, setCurrentSort] = useState<SortOption>(sortOptions[0]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  const limit = 20;

  const authorId = searchParams.get('authorId');
  const seriesId = searchParams.get('seriesId');
  const tagId = searchParams.get('tagId');

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          q: searchQuery,
          sortBy: currentSort.sortBy,
          sortOrder: currentSort.sortOrder,
        });
        if (authorId) params.append('authorId', authorId);
        if (seriesId) params.append('seriesId', seriesId);
        if (tagId) params.append('tagId', tagId);

        const response = await fetch(`/api/books?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch books');
        }

        setBooks(data.books);
        setPagination(data.pagination);
      } catch (error) {
        console.error('Error fetching books:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchBooks, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [page, searchQuery, authorId, seriesId, tagId, currentSort]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, authorId, seriesId, tagId, currentSort]);

  const clearFilters = () => {
    setSearchParams({});
    setPage(1);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading && books.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="animate-pulse font-black text-xs uppercase tracking-widest">Loading Library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black tracking-tighter uppercase flex items-center gap-4">
              <Library className="w-10 h-10 text-primary" />
              {searchQuery ? `Search` : 'Library'}
            </h1>
            {(authorId || seriesId || tagId) && (
              <button 
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
              >
                <X className="w-3 h-3" />
                Clear filters
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {searchQuery && (
              <span className="text-primary font-bold text-sm px-2 py-0.5 bg-primary/5 rounded-md border border-primary/10">
                "{searchQuery}"
              </span>
            )}
            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">
              {pagination?.total || 0} items indexed
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Sorting Dropdown */}
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
                    {sortOptions.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => {
                          setCurrentSort(option);
                          setIsSortOpen(false);
                        }}
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

          {/* View Toggle */}
          <div className="flex items-center bg-secondary/50 p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-xl border border-border/50">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-secondary disabled:opacity-20 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-black px-2 tabular-nums tracking-widest">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 rounded-lg hover:bg-secondary disabled:opacity-20 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {books.length > 0 ? (
          <motion.div
            key={viewMode + searchQuery + (authorId || '') + (seriesId || '') + (tagId || '') + page + currentSort.label}
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
            {books.map((book) => (
              <motion.div key={book.id} variants={item}>
                <BookCard 
                  book={book} 
                  viewMode={viewMode}
                  onUpdate={(updated) => {
                    setBooks(prev => prev.map(b => b.id === updated.id ? updated : b));
                  }} 
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-[50vh] flex flex-col items-center justify-center gap-4 text-muted-foreground"
          >
            <Inbox className="w-16 h-16 opacity-20" />
            <p className="text-sm font-black uppercase tracking-widest">No matching books</p>
            {(searchQuery || authorId || seriesId || tagId) && (
              <button 
                onClick={clearFilters}
                className="text-primary hover:underline text-xs font-bold uppercase tracking-widest"
              >
                Clear all active filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {loading && books.length > 0 && (
        <div className="fixed bottom-8 right-8 bg-background/80 backdrop-blur-md border border-border px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs font-black uppercase tracking-[0.2em]">Synchronizing...</span>
        </div>
      )}
    </div>
  );
};
