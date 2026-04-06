import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Series } from '../types';
import { BookOpen, Hash, Loader2, ChevronRight } from 'lucide-react';

export const SeriesPage: React.FC = () => {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const response = await fetch('/api/series');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch series');
        setSeries(data);
      } catch (error) {
        console.error('Error fetching series:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSeries();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Indexing Series...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-black tracking-tighter uppercase italic flex items-center gap-4">
          <BookOpen className="w-12 h-12 text-primary" />
          Series
        </h1>
        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-xs">
          {series.length} collections organized
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {series.map((s) => (
          <Link
            key={s.id}
            to={`/?seriesId=${s.id}`}
            className="group flex items-center justify-between p-6 bg-[#0F1626] border border-white/5 rounded-3xl hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-black uppercase text-xl group-hover:scale-110 transition-transform">
                <Hash className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold group-hover:text-primary transition-colors">{s.name}</h3>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {(s as any)._count?.books || 0} installments
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1 duration-300" />
          </Link>
        ))}
      </div>
    </div>
  );
};
