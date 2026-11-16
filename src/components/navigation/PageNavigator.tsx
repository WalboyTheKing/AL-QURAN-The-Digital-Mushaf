import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { TOTAL_MUSHAF_PAGES } from '../../utils/quranPagination';

interface PageNavigatorProps {
  currentPage: number;
  onGoToPage: (page: number) => void;
}

const QUICK_MILESTONES = [
  { label: 'Al-Fatihah', page: 1 },
  { label: 'Al-Baqarah', page: 2 },
  { label: 'Ayat Al-Kursi', page: 42 },
  { label: 'Al-Kahf', page: 293 },
  { label: 'Ya-Sin', page: 440 },
  { label: 'Ar-Rahman', page: 531 },
  { label: 'Al-Mulk', page: 562 },
  { label: 'Juz Amma', page: 582 },
  { label: 'Dernière page', page: 604 },
];

export function PageNavigator({
  currentPage,
  onGoToPage,
}: PageNavigatorProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(pageInput);
    if (Number.isFinite(num) && num >= 1 && num <= TOTAL_MUSHAF_PAGES) {
      onGoToPage(Math.floor(num));
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto mushaf-scroll pr-1">
      {/* Direct Page Jump */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--mushaf-ink)] mb-1.5">
          Aller à une page du Mushaf (1 – 604)
        </h3>
        <form onSubmit={handlePageSubmit} className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={TOTAL_MUSHAF_PAGES}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            aria-label="Numéro de page du Mushaf"
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-sm text-[var(--mushaf-ink)] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mushaf-gold)]"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0d4a34] hover:bg-[#0a3b29] text-[#faf6ec] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Ouvrir</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Quick Milestones */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--mushaf-ink)] mb-2">
          Repères fréquents
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_MILESTONES.map((item) => (
            <button
              key={item.page}
              type="button"
              onClick={() => onGoToPage(item.page)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                currentPage === item.page
                  ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)] font-medium'
                  : 'border-[var(--mushaf-border)] hover:bg-[var(--mushaf-paper-edge)]/70 text-[var(--mushaf-ink)]'
              }`}
            >
              <span className="truncate">{item.label}</span>
              <span className="text-[var(--mushaf-ink-muted)] tabular-nums ml-2 shrink-0">
                p. {item.page}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
