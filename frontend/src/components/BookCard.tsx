import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book as BookType } from '../types';
import { Book as BookIcon, Hash, Edit3, Download, ExternalLink, List, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { MetadataEditor } from './MetadataEditor';
import { BookDetailModal } from './BookDetailModal';

interface BookCardProps {
  book: BookType;
  onUpdate?: (updatedBook: BookType) => void;
  viewMode?: 'grid' | 'list';
}

export const BookCard: React.FC<BookCardProps> = ({ book, onUpdate, viewMode = 'grid' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isShowingDetails, setIsShowingDetails] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const canEdit = isAuthenticated && !!user?.isAdmin;
  const authors = book.authors.map(a => a.name).join(', ');
  
  const coverUrl = book.coverPath ? `/api/covers/${book.coverPath.split('/').pop()}` : null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/api/download/${book.id}`, '_blank');
  };

  const openGoodreads = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (book.goodreadsLink) {
      window.open(book.goodreadsLink, '_blank');
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  if (viewMode === 'list') {
    return (
      <>
        <motion.div
          onClick={() => setIsShowingDetails(true)}
          className="group flex items-center gap-6 p-4 bg-[#0F1626] border border-white/10 rounded-2xl hover:border-primary/50 transition-all cursor-pointer"
        >
          <div className="w-12 h-18 shrink-0 rounded-lg overflow-hidden bg-white/5 aspect-[2/3]">
            {coverUrl ? (
              <img src={coverUrl} alt={book.title} loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                <BookIcon className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{book.title}</h3>
            <p className="text-xs text-muted-foreground truncate">{authors}</p>
          </div>

          <div className="hidden md:flex items-center gap-1.5 flex-1 min-w-0 text-[10px] text-primary/80 font-bold uppercase tracking-wider">
            {book.series && (
              <>
                <Hash className="w-3 h-3 shrink-0" />
                <span className="truncate">{book.series.name}{book.seriesNumber != null ? ` #${book.seriesNumber}` : ''}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {book.goodreadsLink && (
              <button
                onClick={openGoodreads}
                className="p-2 hover:bg-amber-500/10 text-amber-500 rounded-xl transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white/5 text-muted-foreground hover:text-foreground rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            {canEdit && (
              <button
                onClick={handleEdit}
                className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {isEditing && (
            <MetadataEditor 
              book={book} 
              onClose={() => setIsEditing(false)} 
              onUpdate={(updated) => onUpdate?.(updated)}
            />
          )}
          {isShowingDetails && (
            <BookDetailModal 
              book={book} 
              onClose={() => setIsShowingDetails(false)} 
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <motion.div
        onClick={() => setIsShowingDetails(true)}
        className="group relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 cursor-pointer bg-[#0F1626]"
      >
        {/* Cover */}
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={book.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
            <BookIcon className="w-12 h-12" />
          </div>
        )}

        {/* Format badge */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-widest z-10">
          {book.format}
        </div>

        {/* Always-visible title bar — fades out on hover */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-10 pb-3 px-3 z-10 transition-opacity duration-200 group-hover:opacity-0">
          <h3 className="font-bold text-sm leading-tight text-white line-clamp-2 tracking-tight">
            {book.title}
          </h3>
          <p className="text-white/60 text-[10px] mt-0.5 truncate">{authors}</p>
          {book.series && (
            <div className="flex items-center gap-1 text-[9px] text-primary/90 font-bold uppercase tracking-wider mt-1">
              <Hash className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{book.series.name}{book.seriesNumber != null ? ` #${book.seriesNumber}` : ''}</span>
            </div>
          )}
        </div>

        {/* Slide-up detail panel — covers bottom ~65%, cover stays visible above */}
        <div className="absolute inset-x-0 bottom-0 h-[68%] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20 flex flex-col justify-between bg-gradient-to-t from-black via-black/97 to-black/80 pt-5 pb-3 px-3">
          <div className="overflow-hidden flex-1">
            {book.description ? (
              <p className="text-white/75 text-[10px] leading-relaxed line-clamp-[9]">
                {book.description.replace(/<[^>]*>/g, '')}
              </p>
            ) : (
              <p className="text-white/25 text-[10px] italic">No description available.</p>
            )}
          </div>
          <div className="flex gap-2 mt-3 shrink-0">
            <button
              onClick={handleDownload}
              className="flex-1 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
            {book.goodreadsLink && (
              <button
                onClick={openGoodreads}
                className="bg-primary/15 hover:bg-primary/30 text-primary p-2 rounded-lg transition-all"
                title="Goodreads"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={handleEdit}
                className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white p-2 rounded-lg transition-colors"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isEditing && (
          <MetadataEditor 
            book={book} 
            onClose={() => setIsEditing(false)} 
            onUpdate={(updated) => onUpdate?.(updated)}
          />
        )}
        {isShowingDetails && (
          <BookDetailModal 
            book={book} 
            onClose={() => setIsShowingDetails(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
};
