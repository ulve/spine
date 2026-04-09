import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Author } from '../types';
import { Users, BookOpen, Loader2, ChevronRight, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export const AuthorsPage: React.FC = () => {
  const { token, user } = useAuth();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingAuthorId = useRef<string | null>(null);

  const isAdmin = !!user?.isAdmin;

  useEffect(() => {
    fetch('/api/authors')
      .then(r => r.json())
      .then(data => setAuthors(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarClick = (e: React.MouseEvent, authorId: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.stopPropagation();
    pendingAuthorId.current = authorId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const authorId = pendingAuthorId.current;
    e.target.value = '';
    if (!file || !authorId) return;

    setUploading(authorId);
    try {
      const form = new FormData();
      form.append('picture', file);
      const res = await fetch(`/api/authors/${authorId}/picture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated: Author = await res.json();
      setAuthors(prev => prev.map(a => a.id === authorId ? { ...a, picture: updated.picture } : a));
    } catch (err) {
      console.error('Author picture upload error:', err);
    } finally {
      setUploading(null);
      pendingAuthorId.current = null;
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Scanning Authors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-black tracking-tighter uppercase italic flex items-center gap-4">
          <Users className="w-10 h-10 text-primary" />
          Authors
        </h1>
        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-xs">
          {authors.length} unique creators found
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {authors.map((author) => {
          const bookCount = (author as any)._count?.books ?? 0;
          const picUrl = author.picture ? `/api/author-pictures/${author.picture}` : null;
          const isUploading = uploading === author.id;

          return (
            <motion.div
              key={author.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.2 }}
            >
              <Link
                to={`/?authorId=${author.id}`}
                className="group flex items-center justify-between p-5 bg-[#0F1626] border border-white/5 rounded-3xl hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center"
                    onClick={(e) => handleAvatarClick(e, author.id)}
                    title={isAdmin ? 'Click to upload photo' : undefined}
                  >
                    {picUrl ? (
                      <img
                        src={picUrl}
                        alt={author.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-primary font-black uppercase text-xl select-none">
                        {author.name.charAt(0)}
                      </span>
                    )}

                    {/* Admin upload overlay */}
                    {isAdmin && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {isUploading
                          ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                          : <Camera className="w-4 h-4 text-white" />
                        }
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <h3 className="font-bold truncate group-hover:text-primary transition-colors">{author.name}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <BookOpen className="w-3 h-3" />
                      <span>{bookCount} {bookCount === 1 ? 'book' : 'books'}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
