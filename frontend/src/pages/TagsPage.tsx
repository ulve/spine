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

  const maxCount = Math.max(...tags.map(t => (t as any)._count?.books ?? 0), 1);
  // Scale: smallest tag = 0.72rem, largest = 1.75rem
  const fontSize = (count: number) => `${0.72 + ((count / maxCount) ** 0.6) * 1.03}rem`;
  const opacity = (count: number) => 0.55 + ((count / maxCount) ** 0.4) * 0.45;

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-black tracking-tighter uppercase italic flex items-center gap-4">
          <Tags className="w-10 h-10 text-primary" />
          Tags
        </h1>
        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-xs">
          {tags.length} active classifications
        </p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-3 items-baseline leading-loose">
        {tags.map((tag) => {
          const count = (tag as any)._count?.books ?? 0;
          return (
            <Link
              key={tag.id}
              to={`/?tagId=${tag.id}`}
              className="group inline-flex items-center gap-1.5 transition-all duration-200 hover:text-primary"
              style={{
                fontSize: fontSize(count),
                opacity: opacity(count),
              }}
            >
              <Hash
                className="shrink-0 text-primary/70 group-hover:text-primary transition-colors"
                style={{ width: `calc(${fontSize(count)} * 0.75)`, height: `calc(${fontSize(count)} * 0.75)` }}
              />
              <span className="font-bold group-hover:opacity-100 transition-opacity">
                {tag.name}
              </span>
              <span
                className="font-black tabular-nums text-muted-foreground/40 group-hover:text-primary/50 transition-colors"
                style={{ fontSize: `calc(${fontSize(count)} * 0.65)` }}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
