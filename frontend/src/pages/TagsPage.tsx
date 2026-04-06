import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag } from '../types';
import { Tags, Hash, Loader2 } from 'lucide-react';

export const TagsPage: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch tags');
        setTags(data);
      } catch (error) {
        console.error('Error fetching tags:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Analyzing Tags...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-black tracking-tighter uppercase italic flex items-center gap-4">
          <Tags className="w-12 h-12 text-primary" />
          Tags
        </h1>
        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-xs">
          {tags.length} active classifications
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            to={`/?tagId=${tag.id}`}
            className="group flex items-center gap-3 px-6 py-3 bg-[#0F1626] border border-white/5 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 shadow-lg"
          >
            <Hash className="w-4 h-4 text-primary group-hover:scale-125 transition-transform" />
            <span className="font-bold text-sm">{tag.name}</span>
            <span className="bg-white/5 px-2 py-0.5 rounded-lg text-[10px] font-black text-muted-foreground group-hover:text-primary">
              {(tag as any)._count?.books || 0}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};
