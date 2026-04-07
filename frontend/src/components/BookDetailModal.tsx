import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Review, ReadingStatus } from '../types';
import { 
  X, 
  Book as BookIcon, 
  Hash, 
  ExternalLink, 
  Download, 
  Calendar,
  Tag as TagIcon,
  User,
  Star,
  MessageSquare,
  CheckCircle2,
  Clock,
  Ban,
  Bookmark,
  Send,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface BookDetailModalProps {
  book: Book;
  onClose: () => void;
}

const statusOptions = [
  { value: 'PLAN_TO_READ', label: 'Plan to Read', icon: Bookmark, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { value: 'READING', label: 'Reading', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { value: 'FINISHED', label: 'Finished', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { value: 'ABANDONED', label: 'Abandoned', icon: Ban, color: 'text-rose-400', bg: 'bg-rose-400/10' },
];

export const BookDetailModal: React.FC<BookDetailModalProps> = ({ book: initialBook, onClose }) => {
  const { token, user, isAuthenticated } = useAuth();
  const [book, setBook] = useState(initialBook);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const authors = book.authors.map(a => a.name).join(', ');
  const coverUrl = book.coverPath ? `/api/covers/${book.coverPath.split('/').pop()}` : null;

  useEffect(() => {
    fetchBookData();
  }, []);

  const fetchBookData = async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const [bookRes, reviewsRes] = await Promise.all([
        fetch(`/api/books/${initialBook.id}`, { headers }),
        fetch(`/api/books/${initialBook.id}/reviews`)
      ]);

      const bookData = await bookRes.json();
      const reviewsData = await reviewsRes.json();

      if (!bookRes.ok) throw new Error(bookData.error || 'Failed to fetch book');
      if (!reviewsRes.ok) throw new Error(reviewsData.error || 'Failed to fetch reviews');

      setBook(bookData);
      setReviews(reviewsData);
      
      if (user && bookData.statuses) {
          const status = bookData.statuses.find((s: ReadingStatus) => s.userId === user.id);
          if (status) setUserStatus(status.status);
      }
      
      if (user && bookData.reviews) {
          const review = bookData.reviews.find((r: Review) => r.userId === user.id);
          if (review) {
              setRating(review.rating || 0);
              setComment(review.comment || '');
          }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!isAuthenticated) return;
    try {
      const response = await fetch(`/api/books/${book.id}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      setUserStatus(newStatus);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    setSubmittingReview(true);
    try {
      const response = await fetch(`/api/books/${book.id}/review`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ rating, comment })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit review');
      }

      // Refresh reviews
      const reviewsRes = await fetch(`/api/books/${book.id}/reviews`);
      const reviewsData = await reviewsRes.json();
      setReviews(reviewsData);
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDownload = () => {
    window.open(`/api/download/${book.id}`, '_blank');
  };

  const openGoodreads = () => {
    if (book.goodreadsLink) {
      window.open(book.goodreadsLink, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-5xl bg-[#0F1626] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Cover & Personal Status */}
        <div className="w-full md:w-80 bg-black/20 flex flex-col p-8 border-b md:border-b-0 md:border-r border-white/10 shrink-0">
          <div className="relative group w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl mb-8">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <BookIcon className="w-20 h-20 text-muted-foreground/20" />
              </div>
            )}
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-widest text-white">
              {book.format}
            </div>
          </div>

          {isAuthenticated && (
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 block px-1">Your Status</span>
              <div className="grid grid-cols-1 gap-2">
                {statusOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = userStatus === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusChange(opt.value)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border",
                        isActive 
                          ? `${opt.bg} ${opt.color} border-primary/20` 
                          : "bg-white/5 border-transparent text-muted-foreground hover:bg-white/10"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", isActive ? opt.color : "text-muted-foreground")} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Content & Reviews */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/10">
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tight leading-tight">{book.title}</h2>
              <div className="flex items-center gap-2 text-primary font-bold">
                <User className="w-4 h-4" />
                <span>{authors}</span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-white shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-8 space-y-12">
              {/* Metadata & Summary */}
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {book.series && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Series</span>
                      <div className="flex items-center gap-2 text-sm font-bold text-primary bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 w-fit">
                        <Hash className="w-4 h-4" />
                        {book.series.name} {book.seriesNumber && `#${book.seriesNumber}`}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Added Date</span>
                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground bg-white/5 px-4 py-2 rounded-xl border border-white/5 w-fit">
                      <Calendar className="w-4 h-4" />
                      {new Date(book.addedDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Summary</span>
                  <div className="prose prose-invert prose-sm max-w-none">
                    {book.description ? (
                      <div
                        className="text-muted-foreground/80 leading-relaxed text-base [&_p]:mb-3 [&_p:last-child]:mb-0 [&_br]:block [&_b]:text-foreground/90 [&_i]:italic [&_em]:italic [&_strong]:text-foreground/90"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(book.description) }}
                      />
                    ) : (
                      <p className="text-muted-foreground/40 italic text-base">No description available for this book.</p>
                    )}
                  </div>
                </div>

                {book.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {book.tags.map(tag => (
                      <span 
                        key={tag.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                      >
                        <TagIcon className="w-3 h-3" />
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Reviews Section */}
              <div className="space-y-8 pt-8 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Reviews & Comments
                  </h3>
                  <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {reviews.length} total
                  </div>
                </div>

                {isAuthenticated && (
                  <form onSubmit={handleReviewSubmit} className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground mr-2">Your Rating:</span>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          className="transition-transform active:scale-125"
                        >
                          <Star className={cn("w-5 h-5", s <= rating ? "fill-primary text-primary" : "text-white/10")} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="Leave a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none min-h-[100px]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingReview || (!rating && !comment)}
                        className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                      >
                        {submittingReview ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Post Review
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {loadingReviews ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                    </div>
                  ) : reviews.length > 0 ? (
                    reviews.map((rev) => (
                      <div key={rev.id} className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-black uppercase">
                              {rev.user?.username.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{rev.user?.username}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-medium">{new Date(rev.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {rev.rating && (
                            <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
                              <Star className="w-3 h-3 fill-primary text-primary" />
                              <span className="text-xs font-black text-primary">{rev.rating}</span>
                            </div>
                          )}
                        </div>
                        {rev.comment && <p className="text-sm text-muted-foreground/90 leading-relaxed">{rev.comment}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
                      <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your thoughts!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-white/10 bg-black/20 flex flex-wrap gap-4">
            <button
              onClick={handleDownload}
              className="flex-1 min-w-[150px] bg-primary text-primary-foreground hover:opacity-90 px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
            >
              <Download className="w-5 h-5" />
              Download Book
            </button>
            
            {book.goodreadsLink && (
              <button
                onClick={openGoodreads}
                className="flex-1 min-w-[150px] bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3"
              >
                <ExternalLink className="w-5 h-5" />
                Goodreads Page
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
