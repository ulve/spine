import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Book } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';

interface MetadataEditorProps {
  book: Book;
  onClose: () => void;
  onUpdate: (updatedBook: Book) => void;
}

interface AutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  // If true, value is comma-separated and autocomplete applies to the last token
  multiToken?: boolean;
}

const Autocomplete: React.FC<AutocompleteProps> = ({ value, onChange, suggestions, placeholder, className, multiToken }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentToken = multiToken
    ? value.split(',').pop()?.trim() ?? ''
    : value.trim();

  const filtered = currentToken.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(currentToken.toLowerCase()) && s.toLowerCase() !== currentToken.toLowerCase())
    : [];

  const handleSelect = (suggestion: string) => {
    if (multiToken) {
      const parts = value.split(',');
      parts[parts.length - 1] = ' ' + suggestion;
      onChange(parts.join(',').replace(/^\s*,/, '').trimStart());
    } else {
      onChange(suggestion);
    }
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); setActiveIndex(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-[#0F1626] border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {filtered.slice(0, 10).map((s, i) => (
            <li
              key={s}
              onMouseDown={() => handleSelect(s)}
              className={`px-4 py-2 text-sm cursor-pointer transition-colors ${i === activeIndex ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ book, onClose, onUpdate }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  const [error, setError] = useState('');
  const [authorSuggestions, setAuthorSuggestions] = useState<string[]>([]);
  const [seriesSuggestions, setSeriesSuggestions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: book.title,
    authors: book.authors.map(a => a.name).join(', '),
    series: book.series?.name || '',
    seriesNumber: book.seriesNumber?.toString() || '',
    tags: book.tags.map(t => t.name).join(', '),
    description: book.description || '',
    goodreadsLink: book.goodreadsLink || ''
  });

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [embedCover, setEmbedCover] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/authors').then(r => r.json()),
      fetch('/api/series').then(r => r.json()),
    ]).then(([authors, series]) => {
      setAuthorSuggestions(authors.map((a: { name: string }) => a.name));
      setSeriesSuggestions(series.map((s: { name: string }) => s.name));
    }).catch(() => {});
  }, []);

  const handleCoverUpload = async (): Promise<Book | null> => {
    if (!coverFile) return null;
    setCoverUploading(true);
    setError('');

    const uploadData = new FormData();
    uploadData.append('cover', coverFile);
    uploadData.append('embed', embedCover.toString());

    try {
      const response = await fetch(`/api/books/${book.id}/cover`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload cover');
      setCoverFile(null);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload cover';
      setError(msg);
      throw new Error(msg);
    } finally {
      setCoverUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (coverFile) await handleCoverUpload();

      const payload = {
        title: formData.title,
        authors: formData.authors.split(',').map(s => s.trim()).filter(Boolean),
        seriesName: formData.series.trim() || null,
        seriesNumber: formData.seriesNumber ? parseFloat(formData.seriesNumber) : null,
        tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
        description: formData.description.trim() || null,
        goodreadsLink: formData.goodreadsLink.trim() || null
      };

      const response = await fetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update metadata');

      onUpdate(data);
      onClose();
    } catch (err: unknown) {
      if (!error) setError(err instanceof Error ? err.message : 'Failed to update metadata');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-background/50 border border-border rounded-xl py-2 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-secondary/90 border border-border rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold tracking-tight">Edit Metadata</h2>
          <button onClick={onClose} className="p-2 hover:bg-background/50 rounded-full transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Cover Upload Section */}
          <div className="p-4 bg-background/30 border border-border rounded-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Update Cover Image</h3>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <input
                type="file"
                accept="image/*"
                onChange={e => setCoverFile(e.target.files?.[0] || null)}
                className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all"
              />
              {coverFile && (
                <div className="flex items-center gap-4 w-full md:w-auto">
                  {book.format === 'epub' && (
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={embedCover}
                        onChange={e => setEmbedCover(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary/50"
                      />
                      Embed in EPUB
                    </label>
                  )}
                  <div className="text-xs text-primary font-bold animate-pulse">
                    Will be uploaded on Save
                  </div>
                </div>
              )}
            </div>
          </div>

          <form id="metadata-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Authors (comma separated)</label>
                <Autocomplete
                  value={formData.authors}
                  onChange={val => setFormData(prev => ({ ...prev, authors: val }))}
                  suggestions={authorSuggestions}
                  multiToken
                  className={inputClass}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Series</label>
                <Autocomplete
                  value={formData.series}
                  onChange={val => setFormData(prev => ({ ...prev, series: val }))}
                  suggestions={seriesSuggestions}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Series Number</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.seriesNumber}
                  onChange={e => setFormData(prev => ({ ...prev, seriesNumber: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Goodreads Link</label>
                <input
                  type="url"
                  placeholder="https://www.goodreads.com/book/show/..."
                  value={formData.goodreadsLink}
                  onChange={e => setFormData(prev => ({ ...prev, goodreadsLink: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border bg-secondary/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl border border-border hover:bg-background/50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            form="metadata-form"
            type="submit"
            disabled={loading || coverUploading}
            className="bg-primary text-primary-foreground px-8 py-2 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
