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
              <img src={coverUrl} alt={book.title} className="w-full h-full object-cover" />
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

          <div className="hidden md:block flex-1 min-w-0">
            {book.series && (
              <div className="flex items-center gap-1.5 text-[10px] text-primary/80 font-bold uppercase tracking-wider">
                <Hash className="w-3 h-3" />
                <span className="truncate">{book.series.name} {book.seriesNumber && `#${book.seriesNumber}`}</span>
              </div>
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
        className={cn(
          "group relative bg-[#0F1626] border border-white/10 rounded-2xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/50 flex flex-col h-full cursor-pointer"
        )}
      >
        {/* Image Container */}
        <div className="relative aspect-[2/3] overflow-hidden bg-white/5">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={book.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
              <BookIcon className="w-12 h-12" />
            </div>
          )}
          
          {/* Action Overlay */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4 gap-3 transition-opacity duration-300 z-20",
            "opacity-0 group-hover:opacity-100"
          )}>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors relative z-30"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
              {book.goodreadsLink && (
                <button
                  onClick={openGoodreads}
                  className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-500 p-2 rounded-xl transition-all relative z-30"
                  title="View on Goodreads"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              {canEdit && (
                <button
                  onClick={handleEdit}
                  className="bg-primary hover:opacity-90 text-primary-foreground p-2 rounded-xl transition-opacity relative z-30"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          
          <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-widest z-10">
            {book.format}
          </div>
        </div>

        {/* Metadata Section */}
        <div className="p-4 flex flex-col gap-2 flex-grow">
          <div>
            <h3 className="font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 tracking-tight text-sm">
              {book.title}
            </h3>
            <p className="text-muted-foreground truncate text-[10px] mt-0.5">
              {authors}
            </p>
          </div>
          
          {book.series && (
            <div className="flex items-center gap-1.5 text-[8px] text-primary/80 font-bold uppercase tracking-wider">
              <Hash className="w-2.5 h-2.5" />
              <span className="truncate">{book.series.name} {book.seriesNumber && `#${book.seriesNumber}`}</span>
            </div>
          )}

          {book.description && (
            <p className="text-[10px] text-muted-foreground/60 line-clamp-3 mt-1 italic leading-relaxed">
              {book.description.replace(/<[^>]*>/g, '')}
            </p>
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
};
