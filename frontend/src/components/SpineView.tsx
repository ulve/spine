import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin, Users, BookOpen, Lightbulb, HelpCircle, Globe, Zap } from 'lucide-react';
import { SpineData, SpineCharacter, ChapterSummary, Mystery } from '../types';
import { cn } from '../lib/utils';

const roleColors: Record<SpineCharacter['role'], string> = {
  protagonist: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  antagonist:  'bg-rose-500/20 text-rose-300 border-rose-500/30',
  supporting:  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  minor:       'bg-white/10 text-white/50 border-white/10',
};

const mysteryStatusColors: Record<Mystery['status'], string> = {
  open:     'bg-amber-500/20 text-amber-300 border-amber-500/30',
  partial:  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</span>
    </div>
  );
}

function CollapsibleChapter({ ch }: { ch: ChapterSummary }) {
  const [open, setOpen] = useState(false);
  const roles = ch.role.split(/[|/]/).map(r => r.trim()).filter(Boolean);

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="shrink-0 mt-0.5 text-primary font-black text-xs w-6 text-right">{ch.chapter}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-white/80 leading-snug block">{ch.title}</span>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {roles.map(r => (
              <span key={r} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">{r}</span>
            ))}
            {ch.pov && ch.pov !== 'omniscient' && (
              <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/40 text-[9px] font-bold uppercase tracking-widest">POV: {ch.pov}</span>
            )}
          </div>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5">
          <p className="text-sm text-muted-foreground/80 leading-relaxed mt-3">{ch.summary}</p>
          {ch.locations.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ch.locations.map(loc => (
                <span key={loc} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-white/50 text-[10px] font-medium">
                  <MapPin className="w-2.5 h-2.5" />{loc}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleCharacter({ char }: { char: SpineCharacter }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-white/90">{char.name}</span>
        </div>
        <span className={cn('px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border shrink-0', roleColors[char.role])}>
          {char.role}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5">
          <p className="text-sm text-muted-foreground/80 leading-relaxed mt-3">{char.description}</p>
          {char.arc && (
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 block mb-1">Arc</span>
              <p className="text-sm text-muted-foreground/70 leading-relaxed">{char.arc}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SpineViewProps {
  data: SpineData;
}

export const SpineView: React.FC<SpineViewProps> = ({ data }) => {
  return (
    <div className="space-y-10">
      {/* Plot Summary */}
      {data.plot_summary && (
        <section>
          <SectionHeader icon={BookOpen} label="Plot Summary" />
          <p className="text-sm text-muted-foreground/80 leading-relaxed">{data.plot_summary}</p>
        </section>
      )}

      {/* Themes & Topics */}
      {(data.themes?.length > 0 || data.topics?.length > 0) && (
        <section>
          <SectionHeader icon={Lightbulb} label="Themes & Topics" />
          <div className="space-y-3">
            {data.themes?.length > 0 && (
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-2">Themes</span>
                <div className="flex flex-wrap gap-2">
                  {data.themes.map(t => (
                    <span key={t} className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {data.topics?.length > 0 && (
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 block mb-2">Topics</span>
                <div className="flex flex-wrap gap-2">
                  {data.topics.map(t => (
                    <span key={t} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 text-[11px] font-medium">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Characters */}
      {data.characters?.length > 0 && (
        <section>
          <SectionHeader icon={Users} label={`Characters (${data.characters.length})`} />
          <div className="space-y-2">
            {data.characters.map(char => (
              <CollapsibleCharacter key={char.name} char={char} />
            ))}
          </div>
        </section>
      )}

      {/* Relationships */}
      {data.relationships?.length > 0 && (
        <section>
          <SectionHeader icon={Zap} label="Relationships" />
          <div className="space-y-3">
            {data.relationships.map((rel, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white/90">{rel.characters[0]} & {rel.characters[1]}</span>
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20 shrink-0">{rel.type}</span>
                </div>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">{rel.dynamic}</p>
                {rel.evolution && (
                  <p className="text-xs text-muted-foreground/50 leading-relaxed italic">{rel.evolution}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chapter Summaries */}
      {data.chapter_summaries?.length > 0 && (
        <section>
          <SectionHeader icon={BookOpen} label={`Chapters (${data.chapter_summaries.length})`} />
          <div className="space-y-2">
            {data.chapter_summaries.map(ch => (
              <CollapsibleChapter key={`${ch.chapter}-${ch.title}`} ch={ch} />
            ))}
          </div>
        </section>
      )}

      {/* Mysteries */}
      {data.mysteries?.length > 0 && (
        <section>
          <SectionHeader icon={HelpCircle} label="Mysteries & Hooks" />
          <div className="space-y-3">
            {data.mysteries.map((m, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <p className="flex-1 text-sm font-medium text-white/80 leading-snug">{m.question}</p>
                  <span className={cn('px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border shrink-0', mysteryStatusColors[m.status])}>
                    {m.status}
                  </span>
                </div>
                {m.resolution && (
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">{m.resolution}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* World */}
      {data.world?.length > 0 && (
        <section>
          <SectionHeader icon={Globe} label="World & Locations" />
          <div className="space-y-3">
            {data.world.map((loc, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm font-bold text-white/90">{loc.name}</span>
                </div>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">{loc.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
