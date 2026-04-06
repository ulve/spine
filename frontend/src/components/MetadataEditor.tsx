import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Book } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Tag as TagIcon, Plus, XCircle } from 'lucide-react';

interface MetadataEditorProps {
  book: Book;
  onClose: () => void;
  onUpdate: (updatedBook: Book) => void;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ book, onClose, onUpdate }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: uploadData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload cover');

      setCoverFile(null);
      return data;
    } catch (err: any) {
      const msg = err.message || 'Failed to upload cover';
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
      // 1. Upload cover first if selected
      if (coverFile) {
        await handleCoverUpload();
      }

      // 2. Update metadata
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update metadata');

      onUpdate(data);
      onClose();
    } catch (err: any) {
      if (!error) {
        setError(err.message || 'Failed to update metadata');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-secondary/90 border border-border rounded-3xl shadow-2xl overflow-hidden"
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
                  className="w-full bg-background/50 border border-border rounded-xl py-2 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Authors (comma separated)</label>
                <input
                  type="text"
                  value={formData.authors}
                  onChange={e => setFormData(prev => ({ ...prev, authors: e.target.value }))}
                  className="w-full bg-background/50 border border-border rounded-xl py-2 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Series</label>
                <input
                  type="text"
                  value={formData.series}
                  onChange={e => setFormData(prev => ({ ...prev, series: e.target.value }))}
                  className="w-full bg-background/50 border border-border rounded-xl py-2 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Series Number</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.seriesNumber}
                  onChange={e => setFormData(prev => ({ ...prev, seriesNumber: e.target.value }))}
                  className="w-full bg-background/50 border border-border rounded-xl py-2 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full bg-background/50 border border-border rounded-xl py-2 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Goodreads Link</label>
                <input
                  type="url"
                  placeholder="https://www.goodreads.com/book/show/..."
                  value={formData.goodreadsLink}
                  onChange={e => setFormData(prev => ({ ...prev, goodreadsLink: e.target.value }))}
                  className="w-full bg-background/50 border border-border rounded-xl py-2 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-background/50 border border-border rounded-xl py-2 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
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
            disabled={loading}
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
