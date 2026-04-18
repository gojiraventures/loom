'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ScheduledPiece {
  id: string;
  topic: string;
  platform: string;
  content_type: string;
  text_content: string;
  scheduled_at: string;
  status: string;
  supplementary: { posts?: string[]; caption?: string; published_tweet_url?: string } | null;
}

interface TooltipState {
  piece: ScheduledPiece;
  x: number;
  y: number;
  imageUrl: string | null;
  loading: boolean;
}

const PLATFORM_COLOR: Record<string, string> = {
  x:         'bg-sky-400 text-sky-400 border-sky-400',
  instagram: 'bg-pink-400 text-pink-400 border-pink-400',
  facebook:  'bg-blue-400 text-blue-400 border-blue-400',
};

const PLATFORM_DOT: Record<string, string> = {
  x:         'bg-sky-400',
  instagram: 'bg-pink-400',
  facebook:  'bg-blue-400',
};

const PLATFORM_DOT_PUBLISHED: Record<string, string> = {
  x:         'bg-emerald-400',
  instagram: 'bg-emerald-400',
  facebook:  'bg-emerald-400',
};

const PLATFORM_LABEL: Record<string, string> = {
  x: 'X', instagram: 'IG', facebook: 'FB',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  launch_thread:              'Launch Thread',
  standalone_surprise:        'Surprise Finding',
  tradition_voice:            'Tradition Voice',
  debate_post:                'Debate',
  open_question:              'Open Question',
  score_reveal:               'Score Reveal',
  primary_findings_carousel:  'Findings Carousel',
  tradition_voices_carousel:  'Voices Carousel',
  advocate_skeptic_carousel:  'Debate Carousel',
  quote_card:                 'Quote Card',
  reels_script:               'Reels Script',
  summary_post:               'Summary Post',
  discussion_prompt:          'Discussion Prompt',
  tradition_spotlight:        'Tradition Spotlight',
  link_share:                 'Link Share',
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  }) + ' ET';
}

function fmtTitle(topic: string) {
  return topic.length > 36 ? topic.slice(0, 35) + '…' : topic;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function groupByDate(pieces: ScheduledPiece[]): Record<string, ScheduledPiece[]> {
  const map: Record<string, ScheduledPiece[]> = {};
  for (const p of pieces) {
    const dateKey = new Date(p.scheduled_at).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    if (!map[dateKey]) map[dateKey] = [];
    map[dateKey].push(p);
  }
  return map;
}

// Image cache to avoid re-fetching on repeated hovers
const imageCache: Record<string, string | null> = {};

function PieceTooltip({ tooltip }: { tooltip: TooltipState }) {
  const { piece, x, y, imageUrl, loading } = tooltip;

  const tipW = 220;
  const tipH = 195;
  const margin = 8;

  let tipX = x + 16;
  if (tipX + tipW > window.innerWidth - margin) tipX = x - tipW - 8;
  tipX = Math.max(margin, tipX);

  let tipY = y + 16;
  if (tipY + tipH > window.innerHeight - margin) tipY = y - tipH - 8;
  tipY = Math.max(margin, tipY);

  const platformColor =
    piece.platform === 'x' ? 'text-sky-400 border-sky-400/40' :
    piece.platform === 'instagram' ? 'text-pink-400 border-pink-400/40' :
    'text-blue-400 border-blue-400/40';

  const card = (
    <div
      style={{ position: 'fixed', left: tipX, top: tipY, zIndex: 99999, width: tipW, pointerEvents: 'none' }}
      className="bg-ground border border-border shadow-2xl"
    >
      <div className="w-full h-28 bg-ground-light/20 flex items-center justify-center overflow-hidden">
        {loading ? (
          <span className="font-mono text-[8px] text-text-tertiary/40 animate-pulse">Loading...</span>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-mono text-[8px] text-text-tertiary/30">No image</span>
        )}
      </div>
      <div className="px-2.5 py-2 space-y-1">
        <p className="font-mono text-[8px] text-text-primary leading-snug">{piece.topic}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-mono text-[7px] border px-1 py-px ${platformColor}`}>
            {PLATFORM_LABEL[piece.platform]}
          </span>
          <span className="font-mono text-[7px] text-text-tertiary">
            {CONTENT_TYPE_LABELS[piece.content_type] ?? piece.content_type}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[7px] text-text-tertiary">{fmtTime(piece.scheduled_at)}</span>
          <span className={`font-mono text-[7px] px-1 border ${piece.status === 'published' ? 'border-emerald-400/40 text-emerald-400' : 'border-gold/20 text-gold/60'}`}>
            {piece.status}
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(card, document.body);
}

export function SocialCalendar() {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [pieces, setPieces]       = useState<ScheduledPiece[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPieces = useCallback(async () => {
    setLoading(true);
    try {
      const fetches = ['scheduled', 'published'].map(status => {
        const params = new URLSearchParams({ status });
        if (platformFilter !== 'all') params.set('platform', platformFilter);
        return fetch(`/api/admin/social/pieces?${params}`).then(r => r.json());
      });
      const [sched, pub] = await Promise.all(fetches);
      setPieces([...(sched.pieces ?? []), ...(pub.pieces ?? [])] as ScheduledPiece[]);
    } catch { /* silent */ }
    setLoading(false);
  }, [platformFilter]);

  useEffect(() => { loadPieces(); }, [loadPieces]);

  // Hide tooltip on scroll
  useEffect(() => {
    const hide = () => setTooltip(null);
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, []);

  async function showTooltip(piece: ScheduledPiece, e: React.MouseEvent) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setTooltip({ piece, x: e.clientX, y: e.clientY, imageUrl: null, loading: true });

    // Check cache first
    if (piece.id in imageCache) {
      setTooltip(t => t?.piece.id === piece.id ? { ...t, imageUrl: imageCache[piece.id], loading: false } : t);
      return;
    }

    try {
      const res = await fetch(`/api/admin/social/design?piece_id=${piece.id}`);
      const data = await res.json();
      const selected = (data.variants ?? []).find((v: { selected: boolean; image_url: string }) => v.selected);
      const url = selected?.image_url ?? data.variants?.[0]?.image_url ?? null;
      imageCache[piece.id] = url;
      setTooltip(t => t?.piece.id === piece.id ? { ...t, imageUrl: url, loading: false } : t);
    } catch {
      imageCache[piece.id] = null;
      setTooltip(t => t?.piece.id === piece.id ? { ...t, imageUrl: null, loading: false } : t);
    }
  }

  function hideTooltip() {
    hideTimer.current = setTimeout(() => setTooltip(null), 120);
  }

  const byDate = groupByDate(pieces);

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
  const firstDow     = getFirstDayOfWeek(viewYear, viewMonth);
  const todayKey     = today.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const monthName    = new Date(viewYear, viewMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  }

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    cells.push(`${viewYear}-${mm}-${dd}`);
  }

  const selectedPieces = selectedDate ? (byDate[selectedDate] ?? []) : [];

  const platformCounts = pieces.reduce((acc, p) => {
    acc[p.platform] = (acc[p.platform] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const publishedCount = pieces.filter(p => p.status === 'published').length;
  const totalDays = new Set(Object.keys(byDate)).size;

  return (
    <div className="space-y-4">
      {tooltip && <PieceTooltip tooltip={tooltip} />}

      {/* Summary strip */}
      <div className="flex items-center gap-4 flex-wrap border border-border bg-ground-light/10 px-4 py-3">
        <span className="font-mono text-[9px] text-text-tertiary uppercase tracking-widest">Scheduled</span>
        {loading ? (
          <span className="font-mono text-[9px] text-text-tertiary animate-pulse">Loading...</span>
        ) : (
          <>
            <span className="font-mono text-[9px] text-text-secondary">{pieces.length} posts · {totalDays} days</span>
            {publishedCount > 0 && (
              <span className="font-mono text-[8px] border px-1.5 py-0.5 text-emerald-400/80 border-emerald-400/30">
                {publishedCount} published
              </span>
            )}
            {(['x', 'instagram', 'facebook'] as const).map(p => platformCounts[p] ? (
              <span key={p} className={`font-mono text-[8px] border px-1.5 py-0.5 ${PLATFORM_COLOR[p]}/60 border-current/30`}>
                {PLATFORM_LABEL[p]} {platformCounts[p]}
              </span>
            ) : null)}
          </>
        )}
        <div className="ml-auto flex gap-0 border border-border">
          {['all', 'x', 'instagram', 'facebook'].map(p => (
            <button key={p} onClick={() => { setPlatformFilter(p); setSelectedDate(null); }}
              className={`font-mono text-[8px] uppercase tracking-widest px-2 py-1 border-r border-border last:border-r-0 transition-colors ${platformFilter === p ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}>
              {p === 'all' ? 'All' : PLATFORM_LABEL[p]}
            </button>
          ))}
        </div>
        <button onClick={loadPieces} className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Calendar grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-border text-text-tertiary hover:text-gold transition-colors">
              ← Prev
            </button>
            <span className="font-mono text-[11px] uppercase tracking-widest text-text-primary">{monthName}</span>
            <button onClick={nextMonth}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-border text-text-tertiary hover:text-gold transition-colors">
              Next →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px mb-px">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary text-center py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-border">
            {cells.map((dateKey, i) => {
              if (!dateKey) return <div key={`empty-${i}`} className="bg-ground min-h-[72px]" />;

              const dayPieces = byDate[dateKey] ?? [];
              const isToday    = dateKey === todayKey;
              const isSelected = dateKey === selectedDate;
              const dayNum     = parseInt(dateKey.split('-')[2]);
              const platforms  = [...new Set(dayPieces.map(p => p.platform))];

              return (
                <div key={dateKey}
                  onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                  className={`bg-ground min-h-[72px] p-1.5 cursor-pointer transition-colors hover:bg-ground-light/30 relative
                    ${isSelected ? 'ring-1 ring-inset ring-gold/60' : ''}
                    ${isToday ? 'bg-gold/3' : ''}
                  `}>
                  <div className={`font-mono text-[9px] mb-1 ${isToday ? 'text-gold font-bold' : 'text-text-tertiary'}`}>
                    {dayNum}
                    {isToday && <span className="ml-1 text-[7px] text-gold/70">today</span>}
                  </div>

                  {platforms.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mb-1">
                      {platforms.map(p => {
                        const platformPublished = dayPieces.filter(d => d.platform === p).every(d => d.status === 'published');
                        const dotClass = platformPublished
                          ? (PLATFORM_DOT_PUBLISHED[p] ?? 'bg-emerald-400')
                          : (PLATFORM_DOT[p] ?? 'bg-text-tertiary');
                        return <span key={p} className={`inline-block w-1.5 h-1.5 rounded-full ${dotClass}`} />;
                      })}
                    </div>
                  )}

                  {dayPieces.length > 0 && (
                    <div className="font-mono text-[7px] text-text-tertiary">
                      {dayPieces.length} post{dayPieces.length !== 1 ? 's' : ''}
                    </div>
                  )}

                  {dayPieces.slice(0, 2).map((p, idx) => (
                    <div key={idx}
                      onMouseOver={e => { e.stopPropagation(); showTooltip(p, e); }}
                      onMouseLeave={e => { e.stopPropagation(); hideTooltip(); }}
                      onMouseMove={e => { e.stopPropagation(); setTooltip(t => t?.piece.id === p.id ? { ...t, x: e.clientX, y: e.clientY } : t); }}
                      className={`mt-0.5 font-mono text-[6px] leading-tight px-1 border-l-2 flex items-baseline gap-1 cursor-default hover:opacity-100 opacity-90 ${
                        p.status === 'published'
                          ? 'border-emerald-400/60 text-emerald-400/80'
                          : p.platform === 'x' ? 'border-sky-400/50 text-sky-400/70'
                          : p.platform === 'instagram' ? 'border-pink-400/50 text-pink-400/70'
                          : 'border-blue-400/50 text-blue-400/70'
                      }`}>
                      <span className="truncate flex-1">{fmtTitle(p.topic)}</span>
                      <span className="shrink-0 opacity-60">{fmtTime(p.scheduled_at)}</span>
                    </div>
                  ))}

                  {dayPieces.length > 2 && (
                    <div className="font-mono text-[6px] text-text-tertiary/50 mt-0.5 pl-1">
                      +{dayPieces.length - 2} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="border border-border bg-ground-light/5">
          {!selectedDate ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="font-mono text-[9px] text-text-tertiary/40 text-center px-4">
                Click a day to see scheduled posts
              </p>
            </div>
          ) : (
            <div>
              <div className="border-b border-border px-4 py-3 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-gold">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <span className="font-mono text-[8px] text-text-tertiary">{selectedPieces.length} post{selectedPieces.length !== 1 ? 's' : ''}</span>
              </div>

              {selectedPieces.length === 0 ? (
                <p className="font-mono text-[9px] text-text-tertiary/40 text-center py-8">No posts scheduled</p>
              ) : (
                <div className="divide-y divide-border/40">
                  {selectedPieces
                    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                    .map(p => {
                      const previewText = p.supplementary?.caption ?? p.supplementary?.posts?.[0] ?? p.text_content ?? '';
                      return (
                        <div key={p.id} className="px-4 py-3 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-mono text-[7px] uppercase tracking-widest border px-1 py-0.5 ${PLATFORM_COLOR[p.platform]}/60 border-current/30`}>
                              {PLATFORM_LABEL[p.platform]}
                            </span>
                            <span className="font-mono text-[7px] text-text-tertiary">
                              {fmtTime(p.scheduled_at)}
                            </span>
                            <span className={`font-mono text-[7px] px-1 border ml-auto ${p.status === 'published' ? 'border-emerald-400/40 text-emerald-400' : 'border-gold/20 text-gold/60'}`}>
                              {p.status}
                            </span>
                          </div>
                          <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary truncate">
                            {CONTENT_TYPE_LABELS[p.content_type] ?? p.content_type}
                          </p>
                          <p className="font-mono text-[7px] text-gold/80 truncate">{fmtTitle(p.topic)}</p>
                          <p className="text-xs text-text-tertiary leading-snug line-clamp-2">{previewText}</p>
                          {p.supplementary?.published_tweet_url && (
                            <a href={p.supplementary.published_tweet_url} target="_blank" rel="noopener noreferrer"
                              className="font-mono text-[7px] text-sky-400 hover:text-sky-300 transition-colors block">
                              View on X →
                            </a>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
