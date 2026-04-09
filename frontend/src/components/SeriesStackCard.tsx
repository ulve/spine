import React from 'react';
import { motion } from 'framer-motion';
import { Book } from '../types';
import { Book as BookIcon, Layers, ChevronDown } from 'lucide-react';

interface SeriesStackCardProps {
  seriesId: string;
  seriesName: string;
  books: Book[];
  viewMode?: 'grid' | 'list';
  onExpand: () => void;
}

export const SeriesStackCard: React.FC<SeriesStackCardProps> = ({
  seriesName,
  books,
  viewMode = 'grid',
  onExpand,
}) => {
  const firstBook = books[0];
  const coverUrl = firstBook?.coverPath
    ? `/api/covers/${firstBook.coverPath.split('/').pop()}`
    : null;
  const authors = [...new Set(books.flatMap(b => b.authors.map(a => a.name)))].join(', ');

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.25 }}
        onClick={onExpand}
        className="group flex items-center gap-6 p-4 bg-[#0a0f1e] border border-primary/20 rounded-2xl hover:border-primary/50 transition-all cursor-pointer"
        style={{ boxShadow: '3px 3px 0 0 rgba(212,150,50,0.12), 6px 6px 0 0 rgba(212,150,50,0.06)' }}
      >
        <div className="w-12 shrink-0 rounded-lg overflow-hidden bg-white/5 aspect-[2/3]">
          {coverUrl ? (
            <img src={coverUrl} alt={seriesName} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
              <BookIcon className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{seriesName}</h3>
          <p className="text-xs text-muted-foreground truncate">{authors}</p>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-primary/70 font-bold uppercase tracking-wider flex-1 min-w-0">
          <Layers className="w-3 h-3 shrink-0" />
          <span>{books.length} books in series</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-[10px] font-black text-primary bg-primary/10 border border-primary/25 px-3 py-1 rounded-full">
            <ChevronDown className="w-3 h-3" />
            Expand
          </span>
        </div>
      </motion.div>
    );
  }

  // Grid mode — physically stacked cards with slight rotation
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.25 }}
      className="relative cursor-pointer"
      onClick={onExpand}
    >
      {/* Rear card — furthest back */}
      <div
        className="absolute inset-0 rounded-2xl bg-[#0d1525] border border-primary/8"
        style={{ transform: 'translate(8px, 7px) rotate(2.5deg)', zIndex: 1 }}
      />
      {/* Middle card */}
      <div
        className="absolute inset-0 rounded-2xl bg-[#0b1220] border border-primary/12"
        style={{ transform: 'translate(4px, 3.5px) rotate(1deg)', zIndex: 2 }}
      />

      {/* Front card */}
      <div
        className="group relative aspect-[2/3] rounded-2xl overflow-hidden border border-primary/30 hover:border-primary/65 transition-all duration-300 bg-[#0F1626]"
        style={{ zIndex: 3 }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={seriesName}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
            <BookIcon className="w-12 h-12" />
          </div>
        )}

        {/* Series + count badge */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg shadow-primary/20">
          <Layers className="w-2.5 h-2.5" />
          {books.length}
        </div>

        {/* Bottom info — fades out on hover */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-10 pb-3 px-3 z-10 transition-opacity duration-200 group-hover:opacity-0">
          <h3 className="font-bold text-sm leading-tight text-white line-clamp-2 tracking-tight">{seriesName}</h3>
          <p className="text-white/60 text-[10px] mt-0.5 truncate">{authors}</p>
        </div>

        {/* Hover panel */}
        <div className="absolute inset-x-0 bottom-0 h-[65%] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20 flex flex-col items-center justify-center gap-3 bg-gradient-to-t from-black via-black/97 to-black/80 px-4">
          <Layers className="w-8 h-8 text-primary" />
          <div className="text-center">
            <p className="text-white font-black text-xs uppercase tracking-widest">Expand Series</p>
            <p className="text-white/45 text-[10px] mt-1">{books.length} books</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
