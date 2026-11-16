import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Surah } from '../../types/quran';

interface SurahSelectorProps {
  surahs: Surah[];
  currentPage: number;
  onSelectSurah: (surahId: number) => void;
}

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '') // Strip Arabic diacritics for search
    .trim();
}

export function SurahSelector({
  surahs,
  currentPage,
  onSelectSurah,
}: SurahSelectorProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return surahs;
    return surahs.filter((s) => {
      return (
        String(s.id) === q ||
        normalizeSearch(s.name_simple).includes(q) ||
        normalizeSearch(s.name_complex).includes(q) ||
        normalizeSearch(s.translated_name.name).includes(q) ||
        normalizeSearch(s.name_arabic).includes(q)
      );
    });
  }, [surahs, query]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-[var(--mushaf-ink-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (nom arabe, français ou n°)…"
          aria-label="Rechercher une sourate"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-sm text-[var(--mushaf-ink)] placeholder:text-[var(--mushaf-ink-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mushaf-gold)]"
        />
      </div>

      <div className="flex-1 overflow-y-auto mushaf-scroll divide-y divide-[var(--mushaf-border)]">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--mushaf-ink-muted)]">
            Aucune sourate trouvée pour « {query} ».
          </p>
        ) : (
          filtered.map((surah) => {
            const isCurrent =
              currentPage >= surah.pages[0] && currentPage <= surah.pages[1];
            const revPlace =
              surah.revelation_place === 'makkah' ? 'Mecquoise' : 'Médinoise';

            return (
              <button
                key={surah.id}
                type="button"
                onClick={() => onSelectSurah(surah.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-[var(--mushaf-emerald-bg)]'
                    : 'hover:bg-[var(--mushaf-paper-edge)]/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 text-xs font-medium text-[var(--mushaf-gold)] tabular-nums shrink-0">
                    {surah.id}.
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--mushaf-ink)] truncate">
                      <span>{surah.name_simple}</span>
                      <span aria-hidden="true" className="text-[var(--mushaf-ink-muted)]">
                        ·
                      </span>
                      <span className="text-xs text-[var(--mushaf-ink-muted)] truncate font-normal">
                        {surah.translated_name.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--mushaf-ink-muted)] tabular-nums">
                      {revPlace} · {surah.verses_count} versets · Page {surah.pages[0]}
                    </p>
                  </div>
                </div>

                <span
                  dir="rtl"
                  className="font-quran text-lg text-[var(--mushaf-ink)] shrink-0"
                >
                  {surah.name_arabic}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
