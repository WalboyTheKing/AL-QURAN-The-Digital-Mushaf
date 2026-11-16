import { Bookmark, RefreshCw } from 'lucide-react';
import type {
  BookmarkItem,
  MushafPageData,
  QuranVerse,
  ReadingSettings,
  Surah,
} from '../../types/quran';
import { parseVerseKey, toArabicIndicDigits } from '../../utils/quranPagination';
import { QuranText } from './QuranText';

interface MushafPageProps {
  pageNumber: number;
  side: 'right' | 'left' | 'single';
  pageData?: MushafPageData;
  isLoading?: boolean;
  error?: string | null;
  surahsById: Record<number, Surah>;
  settings: ReadingSettings;
  activeVerseKey: string | null;
  activeWordPosition: number | null;
  selectedVerseKey: string | null;
  bookmarks: BookmarkItem[];
  canTurnNext?: boolean;
  canTurnPrev?: boolean;
  isFlipping?: boolean;
  onSelectVerse: (verse: QuranVerse) => void;
  onToggleBookmark: (pageNumber: number) => void;
  onRetryLoad?: (pageNumber: number) => void;
  onCornerPointerDown?: (direction: 'next' | 'prev', e: React.PointerEvent) => void;
  onCornerClick?: (direction: 'next' | 'prev') => void;
}

export function MushafPage({
  pageNumber,
  side,
  pageData,
  isLoading,
  error,
  surahsById,
  settings,
  activeVerseKey,
  activeWordPosition,
  selectedVerseKey,
  bookmarks,
  canTurnNext = false,
  canTurnPrev = false,
  isFlipping = false,
  onSelectVerse,
  onToggleBookmark,
  onRetryLoad,
  onCornerPointerDown,
  onCornerClick,
}: MushafPageProps) {
  const isPageBookmarked = bookmarks.some((b) => b.id === `page:${pageNumber}`);

  const surahNamesSummary = (() => {
    if (!pageData || !pageData.verses.length) return '';
    const first = pageData.verses[0];
    const last = pageData.verses[pageData.verses.length - 1];
    const firstSurah = surahsById[parseVerseKey(first.verse_key).surahId];
    const lastSurah = surahsById[parseVerseKey(last.verse_key).surahId];
    if (!firstSurah) return '';
    if (!lastSurah || firstSurah.id === lastSurah.id) {
      return `${firstSurah.name_simple} · v. ${first.verse_number}–${last.verse_number}`;
    }
    return `${firstSurah.name_simple} – ${lastSurah.name_simple}`;
  })();

  const cornerRadiusClass =
    side === 'right'
      ? 'rounded-r-xl rounded-l-none'
      : side === 'left'
        ? 'rounded-l-xl rounded-r-none'
        : 'rounded-xl';

  // Spine gutter shadow along inner binding edge
  const gutterShadowClass =
    side === 'right'
      ? 'bg-gradient-to-r from-[var(--mushaf-spine)] via-black/[0.03] to-transparent left-0 w-10'
      : side === 'left'
        ? 'bg-gradient-to-l from-[var(--mushaf-spine)] via-black/[0.03] to-transparent right-0 w-10'
        : 'bg-gradient-to-l from-[var(--mushaf-spine)]/55 via-transparent to-transparent right-0 w-6';

  return (
    <div
      className={`mushaf-page mushaf-paper-surface border border-[var(--mushaf-border)] ${
        isFlipping ? 'select-none' : 'select-text'
      } ${cornerRadiusClass}`}
      style={{
        filter: `brightness(${settings.brightness}%)`,
      }}
    >
      {/* Realistic Spine Gutter Shading */}
      <div
        className={`pointer-events-none absolute inset-y-0 z-10 ${gutterShadowClass}`}
        aria-hidden="true"
      />

      {/* Outer Ornamental Hairline Page Frame */}
      <div className="relative z-0 flex flex-col flex-1 min-h-0 m-1.5 sm:m-2.5 border border-[var(--mushaf-gold-soft)] rounded-md px-2.5 sm:px-4 py-1.5 sm:py-2">
        {/* Page Header Metadata */}
        <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-[var(--mushaf-border)] text-[11px] sm:text-xs text-[var(--mushaf-ink-muted)] shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-medium text-[var(--mushaf-gold)] whitespace-nowrap shrink-0 tabular-nums">
              {pageData ? `Juz ${pageData.juzNumber}` : 'Mushaf'}
            </span>
            {pageData && (
              <>
                <span aria-hidden="true">·</span>
                <span className="whitespace-nowrap shrink-0 tabular-nums">
                  Hizb {pageData.hizbNumber}
                </span>
              </>
            )}
          </div>

          <div className="truncate text-center font-medium text-[var(--mushaf-ink)]">
            {surahNamesSummary}
          </div>

          <div
            className="hidden sm:block font-quran text-sm text-[var(--mushaf-gold)] whitespace-nowrap shrink-0"
            dir="rtl"
          >
            {pageData ? `الجزء ${toArabicIndicDigits(pageData.juzNumber)}` : ''}
          </div>
        </div>

        {/* Main Quranic Text Area */}
        <div className="flex-1 min-h-0 relative">
          {pageData ? (
            <QuranText
              pageData={pageData}
              surahsById={surahsById}
              settings={settings}
              activeVerseKey={activeVerseKey}
              activeWordPosition={activeWordPosition}
              selectedVerseKey={selectedVerseKey}
              bookmarks={bookmarks}
              onSelectVerse={onSelectVerse}
            />
          ) : isLoading ? (
            <div className="flex flex-col justify-center items-center h-full gap-3 py-6">
              <div className="w-3/4 h-3.5 rounded bg-[var(--mushaf-gold-soft)]/40 animate-pulse" />
              <div className="w-5/6 h-3.5 rounded bg-[var(--mushaf-gold-soft)]/30 animate-pulse" />
              <div className="w-2/3 h-3.5 rounded bg-[var(--mushaf-gold-soft)]/40 animate-pulse" />
              <div className="w-4/5 h-3.5 rounded bg-[var(--mushaf-gold-soft)]/30 animate-pulse" />
              <span className="mt-1 text-xs text-[var(--mushaf-ink-muted)] tabular-nums">
                Chargement de la page {pageNumber}…
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3">
              <p className="text-sm text-[var(--mushaf-ink-muted)]">{error}</p>
              {onRetryLoad && (
                <button
                  type="button"
                  onClick={() => onRetryLoad(pageNumber)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--mushaf-border)] text-xs font-medium text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Réessayer</span>
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* Page Footer: Centered Page Numeral + Bookmark Ribbon */}
        <div className="flex items-center justify-between pt-1 mt-1 border-t border-[var(--mushaf-border)] text-xs text-[var(--mushaf-ink-muted)] shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(pageNumber);
            }}
            aria-label={
              isPageBookmarked
                ? `Retirer le marque-page de la page ${pageNumber}`
                : `Marquer la page ${pageNumber}`
            }
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isPageBookmarked
                ? 'text-[var(--mushaf-emerald)] font-medium'
                : 'text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)]'
            }`}
          >
            <Bookmark
              className="w-3.5 h-3.5"
              fill={isPageBookmarked ? 'currentColor' : 'none'}
            />
            <span className="hidden sm:inline">
              {isPageBookmarked ? 'Marquée' : 'Marquer'}
            </span>
          </button>

          <div className="flex items-center gap-1.5 tabular-nums font-medium text-[var(--mushaf-ink)]">
            <span className="font-quran text-sm text-[var(--mushaf-gold)]">
              {toArabicIndicDigits(pageNumber)}
            </span>
            <span aria-hidden="true" className="text-[var(--mushaf-ink-muted)]">
              ·
            </span>
            <span className="text-[11px] text-[var(--mushaf-ink-muted)]">
              Page {pageNumber}
            </span>
          </div>

          <div className="w-10 sm:w-14" aria-hidden="true" />
        </div>
      </div>

      {/* Interactive Outer Edge + Corner Curl Zones (RTL: Left edge/corner = Next page, Right edge/corner = Previous page) */}
      {(side === 'left' || side === 'single') && canTurnNext && (
        <>
          <button
            type="button"
            disabled={isFlipping}
            onPointerDown={(e) => onCornerPointerDown?.('next', e)}
            onClick={() => onCornerClick?.('next')}
            title="Page suivante (glisser ou cliquer)"
            aria-label="Tourner vers la page suivante"
            className="group/edge-next absolute top-8 bottom-12 left-0 z-15 w-5 sm:w-7 cursor-grab active:cursor-grabbing focus-visible:outline-none disabled:pointer-events-none"
          >
            <span className="sr-only">Page suivante</span>
          </button>
          <button
            type="button"
            disabled={isFlipping}
            onPointerDown={(e) => onCornerPointerDown?.('next', e)}
            onClick={() => onCornerClick?.('next')}
            title="Page suivante (tourner la page)"
            aria-label="Tourner vers la page suivante"
            className="group/corner absolute bottom-0 left-0 z-20 w-16 h-16 cursor-grab active:cursor-grabbing focus-visible:outline-none disabled:pointer-events-none"
          >
            <span
              className="absolute bottom-0 left-0 w-5 h-5 opacity-70 group-hover/corner:w-12 group-hover/corner:h-12 group-hover/corner:opacity-100 transition-all duration-200 rounded-tr-xl shadow-[3px_-3px_10px_rgba(0,0,0,0.2)]"
              style={{
                background:
                  'linear-gradient(135deg, transparent 47%, rgba(0,0,0,0.14) 49%, var(--mushaf-paper-edge) 52%, var(--mushaf-paper) 100%)',
              }}
            />
          </button>
        </>
      )}

      {(side === 'right' || side === 'single') && canTurnPrev && (
        <>
          <button
            type="button"
            disabled={isFlipping}
            onPointerDown={(e) => onCornerPointerDown?.('prev', e)}
            onClick={() => onCornerClick?.('prev')}
            title="Page précédente (glisser ou cliquer)"
            aria-label="Revenir à la page précédente"
            className="group/edge-prev absolute top-8 bottom-12 right-0 z-15 w-5 sm:w-7 cursor-grab active:cursor-grabbing focus-visible:outline-none disabled:pointer-events-none"
          >
            <span className="sr-only">Page précédente</span>
          </button>
          <button
            type="button"
            disabled={isFlipping}
            onPointerDown={(e) => onCornerPointerDown?.('prev', e)}
            onClick={() => onCornerClick?.('prev')}
            title="Page précédente (revenir en arrière)"
            aria-label="Revenir à la page précédente"
            className="group/corner absolute bottom-0 right-0 z-20 w-16 h-16 cursor-grab active:cursor-grabbing focus-visible:outline-none disabled:pointer-events-none"
          >
            <span
              className="absolute bottom-0 right-0 w-5 h-5 opacity-70 group-hover/corner:w-12 group-hover/corner:h-12 group-hover/corner:opacity-100 transition-all duration-200 rounded-tl-xl shadow-[-3px_-3px_10px_rgba(0,0,0,0.2)]"
              style={{
                background:
                  'linear-gradient(225deg, transparent 47%, rgba(0,0,0,0.14) 49%, var(--mushaf-paper-edge) 52%, var(--mushaf-paper) 100%)',
              }}
            />
          </button>
        </>
      )}
    </div>
  );
}
