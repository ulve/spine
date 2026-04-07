import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, File, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export const UploadPage: React.FC = () => {
  const { token } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status !== 'idle') {
      const timeout = setTimeout(() => setStatus('idle'), 5000);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setStatus('idle');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setStatus('idle');
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload book');

      setStatus('success');
      setMessage(
        `${data.count || files.length} file${(data.count || files.length) === 1 ? '' : 's'} uploaded successfully. They are being processed and will appear in your library shortly.`
      );
      setFiles([]);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to upload books');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-black tracking-tighter uppercase italic flex items-center gap-4">
          <Upload className="w-12 h-12 text-primary" />
          Ingest
        </h1>
        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-xs">
          Add new literature to your spinal collection
        </p>
      </div>

      <div className="bg-[#0F1626] border border-white/5 rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Upload className="w-64 h-64 rotate-12" />
        </div>

        <form onSubmit={handleUpload} className="space-y-8 relative z-10">
          <div className="space-y-4">
            <label className="block">
              <div className="border-2 border-dashed border-white/10 rounded-[2rem] p-16 flex flex-col items-center justify-center gap-6 hover:border-primary/50 transition-all group cursor-pointer bg-black/20">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".epub,.pdf"
                  multiple
                  className="hidden"
                />
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  {files.length > 0 ? <File className="w-10 h-10" /> : <Upload className="w-10 h-10" />}
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xl font-black uppercase tracking-tight">
                    {files.length === 0
                      ? 'Select EPUB or PDF files'
                      : `${files.length} file${files.length === 1 ? '' : 's'} selected`}
                  </p>
                  <p className="text-muted-foreground text-sm font-medium">
                    Drag and drop or click to browse multiple files
                  </p>
                </div>
              </div>
            </label>
            {files.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {files.slice(0, 5).map((file) => (
                  <div key={`${file.name}-${file.size}`}>{file.name}</div>
                ))}
                {files.length > 5 && <div>and {files.length - 5} more...</div>}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {status !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  "p-6 rounded-[1.5rem] flex items-center gap-4 font-bold border",
                  status === 'success' 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                )}
              >
                {status === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={files.length === 0 || uploading}
            className="w-full bg-primary text-primary-foreground py-6 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-4"
          >
            {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
            {uploading ? 'Processing...' : 'Begin Ingestion'}
          </button>
        </form>
      </div>
    </div>
  );
};
