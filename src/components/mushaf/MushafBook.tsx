import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Infinity as InfinityIcon,
  Repeat1,
  X,
} from 'lucide-react';
import type {
  BookmarkItem,
  MushafPageData,
  QuranVerse,
  ReadingSettings,
  Surah,
} from '../../types/quran';
import { getSpreadPages, parseVerseKey, TOTAL_MUSHAF_PAGES } from '../../utils/quranPagination';
import { MushafPage } from './MushafPage';
import { usePageFlipController } from './PageFlipController';

interface MushafBookProps {
  currentPage: number;
  isSpreadMode: boolean;
  justOpened: boolean;
  pagesMap: Record<number, MushafPageData>;
  loadingPages: Record<number, boolean>;
  pageError: string | null;
  surahsById: Record<number, Surah>;
  settings: ReadingSettings;
  activeVerseKey: string | null;
  activeWordPosition: number | null;
  bookmarks: BookmarkItem[];
  defaultRepeatCount: number;
  onGoToPage: (page: number) => void;
  onRetryLoadPage: (page: number) => void;
  onToggleBookmark: (pageNumber: number, verseKey?: string) => void;
  onSelectedVerseChange?: (verse: QuranVerse | null) => void;
  onRepeatVerse: (
    surahId: number,
    verseNumber: number,
    count: number | 'infinite',
  ) => void;
}

const SINGLE_PAGE_ASPECT = 0.69; // Authentic Madinah Mushaf page ratio (width / height)
const SPREAD_ASPECT = SINGLE_PAGE_ASPECT * 2; // Two pages side-by-side

export function MushafBook({
  currentPage,
  isSpreadMode,
  justOpened,
  pagesMap,
  loadingPages,
  pageError,
  surahsById,
  settings,
  activeVerseKey,
  activeWordPosition,
  bookmarks,
  defaultRepeatCount,
  onGoToPage,
  onRetryLoadPage,
  onToggleBookmark,
  onSelectedVerseChange,
  onRepeatVerse,
}: MushafBookProps) {
  const [selectedVerse, setSelectedVerse] = useState<QuranVerse | null>(null);

  const toggleSelectVerse = (verse: QuranVerse | null) => {
    setSelectedVerse((prev) => {
      const next =
        verse === null
          ? null
          : prev?.verse_key === verse.verse_key
            ? null
            : verse;
      onSelectedVerseChange?.(next);
      return next;
    });
  };
  const [quickRepeatUnlimited, setQuickRepeatUnlimited] = useState(
    defaultRepeatCount === 0,
  );
  const [quickRepeatInput, setQuickRepeatInput] = useState(
    defaultRepeatCount > 0 ? String(defaultRepeatCount) : '5',
  );
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [bookDimensions, setBookDimensions] = useState<{
    width: number;
    height: number;
    canFitSpread: boolean;
  }>({
    width: 900,
    height: 640,
    canFitSpread: isSpreadMode,
  });

  useEffect(() => {
    if (defaultRepeatCount === 0) {
      setQuickRepeatUnlimited(true);
    } else {
      setQuickRepeatUnlimited(false);
      setQuickRepeatInput(String(defaultRepeatCount));
    }
  }, [defaultRepeatCount]);

  // Measure available central viewport and size the Mushaf proportionally with 3D headroom
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const computeSize = () => {
      const rect = el.getBoundingClientRect();
      const availW = Math.max(260, rect.width);
      const availH = Math.max(280, rect.height);

      // Reserve horizontal space on desktop for side buttons and vertical margin for 3D leaf lift
      const useSpread = isSpreadMode && availW >= 760;
      const sideButtonsReserve = availW >= 768 ? 108 : 0;
      const maxW = Math.max(240, availW - sideButtonsReserve);
      const maxH = Math.max(260, availH - 20);

      const targetAspect = useSpread ? SPREAD_ASPECT : SINGLE_PAGE_ASPECT;

      let height = maxH;
      let width = height * targetAspect;
      if (width > maxW) {
        width = maxW;
        height = width / targetAspect;
      }

      setBookDimensions({
        width: Math.floor(width),
        height: Math.floor(height),
        canFitSpread: useSpread,
      });
    };

    computeSize();
    const observer = new ResizeObserver(computeSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isSpreadMode]);

  const effectiveSpreadMode = bookDimensions.canFitSpread;

  const {
    containerRef,
    flipState,
    canGoNext,
    canGoPrev,
    triggerFlip,
    handleCornerPointerDown,
    handleCornerClick,
    handleTouchStart,
    handleTouchEnd,
  } = usePageFlipController({
    currentPage,
    isSpreadMode: effectiveSpreadMode,
    onCommitPage: onGoToPage,
  });

  // Keyboard navigation in authentic RTL Mushaf order
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerFlip('next');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        triggerFlip('prev');
      } else if (e.key === 'Home') {
        e.preventDefault();
        onGoToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        onGoToPage(TOTAL_MUSHAF_PAGES);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [triggerFlip, onGoToPage]);

  const spread = getSpreadPages(currentPage);
  const isFlipping = Boolean(flipState);

  const renderDesktopSpread = () => {
    let baseLeftPage = spread.leftPage;
    let baseRightPage = spread.rightPage;

    let leafFrontPage: number | null = null;
    let leafBackPage: number | null = null;
    let leafOrigin: 'left' | 'right' = 'right';
    let leafAngleDeg = 0;
    let leafLiftZ = 0;
    let shadowStrength = 0;
    let progress = 0;

    if (flipState) {
      const fromSpread = getSpreadPages(flipState.fromPage);
      const toSpread = getSpreadPages(flipState.toPage);
      progress = flipState.progress;
      shadowStrength = Math.sin(progress * Math.PI);
      leafLiftZ = shadowStrength * 16;

      if (flipState.direction === 'next') {
        baseRightPage = fromSpread.rightPage;
        baseLeftPage = toSpread.leftPage;
        leafOrigin = 'right';
        leafFrontPage = fromSpread.leftPage;
        leafBackPage = toSpread.rightPage;
        leafAngleDeg = progress * 180;
      } else {
        baseLeftPage = fromSpread.leftPage;
        baseRightPage = toSpread.rightPage;
        leafOrigin = 'left';
        leafFrontPage = fromSpread.rightPage;
        leafBackPage = toSpread.leftPage;
        leafAngleDeg = -progress * 180;
      }
    }

    const renderPageProps = (
      pNum: number,
      side: 'left' | 'right',
      allowInteractive = true,
    ) => ({
      pageNumber: pNum,
      side,
      pageData: pagesMap[pNum],
      isLoading: loadingPages[pNum],
      error: pageError,
      surahsById,
      settings,
      activeVerseKey,
      activeWordPosition,
      selectedVerseKey: selectedVerse?.verse_key ?? null,
      bookmarks,
      isFlipping,
      canTurnNext: allowInteractive && side === 'left' && canGoNext,
      canTurnPrev: allowInteractive && side === 'right' && canGoPrev,
      onSelectVerse: (v: QuranVerse) => toggleSelectVerse(v),
      onToggleBookmark: (p: number) => onToggleBookmark(p),
      onRetryLoad: onRetryLoadPage,
      onCornerPointerDown: handleCornerPointerDown,
      onCornerClick: handleCornerClick,
    });

    const crestPos = Math.round(progress * 100);

    return (
      <motion.div
        initial={justOpened ? { opacity: 0.92 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          width: `${bookDimensions.width}px`,
          height: `${bookDimensions.height}px`,
        }}
        className={`mushaf-book rounded-2xl p-[6px] bg-gradient-to-b from-[#0f3c2b] via-[#0a2b1f] to-[#082218] shadow-[0_24px_55px_-16px_rgba(10,24,18,0.45)] border border-[#c5a059]/40 ${
          isFlipping ? 'select-none' : ''
        }`}
      >
        {/* Left Stacked Page Thickness Edge */}
        <div
          className="w-1.5 my-1.5 rounded-l-md bg-[var(--mushaf-paper-edge)] border-y border-l border-[var(--mushaf-border)] shrink-0"
          aria-hidden="true"
        />

        {/* 3D Book Stage */}
        <div className="book-stage relative flex-1 grid grid-cols-2 h-full min-h-0">
          {/* LEFT HALF (Even page: 2, 4, 6...) */}
          <div className="relative h-full min-h-0">
            <MushafPage {...renderPageProps(baseLeftPage, 'left', !isFlipping)} />
            {flipState && flipState.direction === 'next' && (
              <div
                className="pointer-events-none absolute inset-0 z-20 rounded-l-xl"
                style={{
                  background: `linear-gradient(to left, rgba(0,0,0,${(1 - progress) * 0.3}) 0%, rgba(0,0,0,${(1 - progress) * 0.1}) 58%, transparent 100%)`,
                }}
              />
            )}
            {flipState && flipState.direction === 'prev' && progress > 0.5 && (
              <div
                className="pointer-events-none absolute inset-0 z-20 rounded-l-xl"
                style={{
                  background: `linear-gradient(to left, rgba(0,0,0,${(1 - progress) * 0.26}) 0%, transparent 65%)`,
                }}
              />
            )}
          </div>

          {/* RIGHT HALF (Odd page: 1, 3, 5...) */}
          <div className="relative h-full min-h-0">
            <MushafPage {...renderPageProps(baseRightPage, 'right', !isFlipping)} />
            {flipState && flipState.direction === 'prev' && (
              <div
                className="pointer-events-none absolute inset-0 z-20 rounded-r-xl"
                style={{
                  background: `linear-gradient(to right, rgba(0,0,0,${(1 - progress) * 0.3}) 0%, rgba(0,0,0,${(1 - progress) * 0.1}) 58%, transparent 100%)`,
                }}
              />
            )}
            {flipState && flipState.direction === 'next' && progress > 0.5 && (
              <div
                className="pointer-events-none absolute inset-0 z-20 rounded-r-xl"
                style={{
                  background: `linear-gradient(to right, rgba(0,0,0,${(1 - progress) * 0.26}) 0%, transparent 65%)`,
                }}
              />
            )}
          </div>

          {/* Center Spine Seam */}
          <div className="mushaf-spine" aria-hidden="true" />

          {/* 3D Turning Leaf with Realistic Curvature Sheen & Edge Depth */}
          {flipState && leafFrontPage !== null && leafBackPage !== null && (
            <div
              className="book-leaf pointer-events-none absolute top-0 bottom-0 w-1/2 z-30"
              style={{
                left: leafOrigin === 'right' ? '0%' : '50%',
                transformOrigin: leafOrigin === 'right' ? 'right center' : 'left center',
                transform: `translateZ(${leafLiftZ}px) rotateY(${leafAngleDeg}deg)`,
              }}
            >
              {/* Front Face of Turning Leaf */}
              <div
                className="book-face absolute inset-0 overflow-hidden rounded-xl"
                style={{
                  boxShadow: `${leafOrigin === 'right' ? '-' : ''}12px 0 26px rgba(0,0,0,${shadowStrength * 0.3})`,
                }}
              >
                <MushafPage
                  {...renderPageProps(
                    leafFrontPage,
                    leafOrigin === 'right' ? 'left' : 'right',
                    false,
                  )}
                />
                {/* Multi-stop Paper Bow & Specular Highlight */}
                <div
                  className="absolute inset-0 z-20 pointer-events-none"
                  style={{
                    opacity: shadowStrength * 0.85,
                    background:
                      leafOrigin === 'right'
                        ? `linear-gradient(to right, rgba(0,0,0,0.16) 0%, rgba(255,255,255,0.24) ${Math.max(15, 70 - crestPos * 0.4)}%, rgba(0,0,0,0.22) 96%, rgba(0,0,0,0.34) 100%)`
                        : `linear-gradient(to left, rgba(0,0,0,0.16) 0%, rgba(255,255,255,0.24) ${Math.max(15, 70 - crestPos * 0.4)}%, rgba(0,0,0,0.22) 96%, rgba(0,0,0,0.34) 100%)`,
                  }}
                />
              </div>

              {/* Back Face of Turning Leaf */}
              <div
                className="book-face book-face-back absolute inset-0 overflow-hidden rounded-xl"
                style={{
                  boxShadow: `${leafOrigin === 'right' ? '' : '-'}12px 0 26px rgba(0,0,0,${shadowStrength * 0.3})`,
                }}
              >
                <MushafPage
                  {...renderPageProps(
                    leafBackPage,
                    leafOrigin === 'right' ? 'right' : 'left',
                    false,
                  )}
                />
                <div
                  className="absolute inset-0 z-20 pointer-events-none"
                  style={{
                    opacity: shadowStrength * 0.8,
                    background:
                      leafOrigin === 'right'
                        ? 'linear-gradient(to right, rgba(0,0,0,0.26) 0%, rgba(255,255,255,0.2) 38%, rgba(0,0,0,0.08) 100%)'
                        : 'linear-gradient(to left, rgba(0,0,0,0.26) 0%, rgba(255,255,255,0.2) 38%, rgba(0,0,0,0.08) 100%)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Stacked Page Thickness Edge */}
        <div
          className="w-1.5 my-1.5 rounded-r-md bg-[var(--mushaf-paper-edge)] border-y border-r border-[var(--mushaf-border)] shrink-0"
          aria-hidden="true"
        />
      </motion.div>
    );
  };

  const renderMobileSinglePage = () => {
    const activePage = currentPage;
    const p = flipState?.progress ?? 0;
    const isNext = flipState?.direction === 'next';
    const shadowStrength = Math.sin(p * Math.PI);

    // Contained 3D peel & slide so the page turns gracefully inside the bezel without flying off-screen
    const peelShiftPct = flipState ? (isNext ? p * 104 : -p * 104) : 0;
    const peelAngleDeg = flipState ? (isNext ? shadowStrength * 26 : -shadowStrength * 26) : 0;

    return (
      <motion.div
        initial={justOpened ? { opacity: 0.92 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`book-stage relative flex items-center justify-center ${
          isFlipping ? 'select-none' : ''
        }`}
        style={{
          width: `${bookDimensions.width}px`,
          height: `${bookDimensions.height}px`,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full h-full rounded-2xl p-1 bg-gradient-to-b from-[#0f3c2b] to-[#082218] shadow-2xl border border-[#c5a059]/40 overflow-hidden">
          <div className="relative w-full h-full rounded-xl overflow-hidden">
            {/* Underlying target page revealed smoothly */}
            {isFlipping && flipState && (
              <div className="absolute inset-0">
                <MushafPage
                  pageNumber={flipState.toPage}
                  side="single"
                  pageData={pagesMap[flipState.toPage]}
                  isLoading={loadingPages[flipState.toPage]}
                  error={pageError}
                  surahsById={surahsById}
                  settings={settings}
                  activeVerseKey={activeVerseKey}
                  activeWordPosition={activeWordPosition}
                  selectedVerseKey={selectedVerse?.verse_key ?? null}
                  bookmarks={bookmarks}
                  isFlipping
                  onSelectVerse={() => {}}
                  onToggleBookmark={onToggleBookmark}
                />
                <div
                  className="pointer-events-none absolute inset-0 z-20 rounded-xl bg-black"
                  style={{ opacity: (1 - p) * 0.28 }}
                />
              </div>
            )}

            {/* Active Page Leaf peeling cleanly across the frame */}
            <div
              className="book-leaf relative w-full h-full"
              style={{
                transformOrigin: isNext ? 'right center' : 'left center',
                transform: isFlipping
                  ? `translateX(${peelShiftPct}%) rotateY(${peelAngleDeg}deg)`
                  : 'none',
                boxShadow: isFlipping
                  ? `${isNext ? '-' : ''}14px 0 30px rgba(0,0,0,${0.28 * (1 - p * 0.35)})`
                  : undefined,
              }}
            >
              <MushafPage
                pageNumber={activePage}
                side="single"
                pageData={pagesMap[activePage]}
                isLoading={loadingPages[activePage]}
                error={pageError}
                surahsById={surahsById}
                settings={settings}
                activeVerseKey={activeVerseKey}
                activeWordPosition={activeWordPosition}
                selectedVerseKey={selectedVerse?.verse_key ?? null}
                bookmarks={bookmarks}
                isFlipping={isFlipping}
                canTurnNext={!isFlipping && canGoNext}
                canTurnPrev={!isFlipping && canGoPrev}
                onSelectVerse={(v) => toggleSelectVerse(v)}
                onToggleBookmark={(pNum) => onToggleBookmark(pNum)}
                onRetryLoad={onRetryLoadPage}
                onCornerPointerDown={handleCornerPointerDown}
                onCornerClick={handleCornerClick}
              />
              {isFlipping && (
                <div
                  className="pointer-events-none absolute inset-0 z-20 rounded-xl"
                  style={{
                    opacity: shadowStrength * 0.75,
                    background: isNext
                      ? 'linear-gradient(to right, rgba(0,0,0,0.08), rgba(255,255,255,0.22) 58%, rgba(0,0,0,0.24) 100%)'
                      : 'linear-gradient(to left, rgba(0,0,0,0.08), rgba(255,255,255,0.22) 58%, rgba(0,0,0,0.24) 100%)',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const selectedParsed = selectedVerse ? parseVerseKey(selectedVerse.verse_key) : null;
  const isSelectedBookmarked = selectedVerse
    ? bookmarks.some((b) => b.id === `verse:${selectedVerse.verse_key}`)
    : false;

  return (
    <div
      ref={(el) => {
        measureRef.current = el;
        containerRef.current = el;
      }}
      className="relative flex items-center justify-center w-full h-full min-h-0 overflow-visible"
    >
      <div className="flex items-center justify-center gap-3 md:gap-4 max-w-full max-h-full">
        {/* RTL Next Page Button on the LEFT */}
        <button
          type="button"
          onClick={() => triggerFlip('next')}
          disabled={!canGoNext || isFlipping}
          title="Page suivante (←)"
          aria-label="Page suivante"
          className="hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mushaf-gold)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {effectiveSpreadMode ? renderDesktopSpread() : renderMobileSinglePage()}

        {/* RTL Previous Page Button on the RIGHT */}
        <button
          type="button"
          onClick={() => triggerFlip('prev')}
          disabled={!canGoPrev || isFlipping}
          title="Page précédente (→)"
          aria-label="Page précédente"
          className="hidden md:inline-flex items-center justify-center w-10 h-10 rounded-full border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mushaf-gold)]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Edge Turn Buttons */}
      <div className="md:hidden pointer-events-none absolute inset-x-3 bottom-2 flex items-center justify-between z-40">
        <button
          type="button"
          onClick={() => triggerFlip('next')}
          disabled={!canGoNext || isFlipping}
          aria-label="Page suivante"
          className="pointer-events-auto inline-flex items-center gap-1 px-3 py-2 rounded-full border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)]/92 backdrop-blur-sm text-xs font-medium text-[var(--mushaf-ink)] shadow-md disabled:opacity-30 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Suiv.</span>
        </button>
        <button
          type="button"
          onClick={() => triggerFlip('prev')}
          disabled={!canGoPrev || isFlipping}
          aria-label="Page précédente"
          className="pointer-events-auto inline-flex items-center gap-1 px-3 py-2 rounded-full border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)]/92 backdrop-blur-sm text-xs font-medium text-[var(--mushaf-ink)] shadow-md disabled:opacity-30 cursor-pointer"
        >
          <span>Préc.</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Verse Quick Action Bar */}
      {selectedVerse && selectedParsed && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-2 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)]/95 backdrop-blur-md shadow-lg text-xs max-w-[94%]">
          <span className="font-medium text-[var(--mushaf-ink)] tabular-nums whitespace-nowrap">
            {surahsById[selectedParsed.surahId]?.name_simple ?? `Sourate ${selectedParsed.surahId}`}{' '}
            · Verset {selectedVerse.verse_key}
          </span>
          <span aria-hidden="true" className="text-[var(--mushaf-ink-muted)]">
            ·
          </span>
          <div className="inline-flex items-center gap-1 shrink-0">
            <label htmlFor="quick-verse-repeat-input" className="sr-only">
              Nombre de répétitions du verset
            </label>
            <input
              id="quick-verse-repeat-input"
              type="number"
              min={1}
              max={999}
              value={quickRepeatUnlimited ? '' : quickRepeatInput}
              placeholder="∞"
              onChange={(e) => {
                setQuickRepeatUnlimited(false);
                setQuickRepeatInput(e.target.value);
              }}
              aria-label="Nombre de répétitions pour ce verset"
              className="w-12 h-6 px-1 rounded border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-center text-xs font-medium text-[var(--mushaf-ink)] tabular-nums"
            />
            <button
              type="button"
              onClick={() => setQuickRepeatUnlimited((prev) => !prev)}
              title="Répéter ce verset indéfiniment"
              aria-pressed={quickRepeatUnlimited}
              aria-label="Répéter indéfiniment"
              className={`inline-flex items-center justify-center w-6 h-6 rounded border transition-colors cursor-pointer ${
                quickRepeatUnlimited
                  ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
                  : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)]'
              }`}
            >
              <InfinityIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const parsedCount = Math.max(
                  1,
                  Math.min(999, Math.floor(Number(quickRepeatInput) || 5)),
                );
                onRepeatVerse(
                  selectedParsed.surahId,
                  selectedParsed.verseNumber,
                  quickRepeatUnlimited ? 'infinite' : parsedCount,
                );
              }}
              className="inline-flex items-center gap-1 px-2 h-6 rounded bg-[#0d4a34] hover:bg-[#0a3b29] text-[#faf6ec] font-medium cursor-pointer whitespace-nowrap"
            >
              <Repeat1 className="w-3.5 h-3.5" />
              <span>
                Répéter ({quickRepeatUnlimited ? '∞' : `${Math.max(1, Math.min(999, Math.floor(Number(quickRepeatInput) || 5)))}×`})
              </span>
            </button>
          </div>
          <span aria-hidden="true" className="text-[var(--mushaf-ink-muted)]">
            ·
          </span>
          <button
            type="button"
            onClick={() =>
              onToggleBookmark(selectedVerse.page_number, selectedVerse.verse_key)
            }
            className="inline-flex items-center gap-1 font-medium text-[var(--mushaf-gold)] hover:underline cursor-pointer whitespace-nowrap shrink-0"
          >
            <Bookmark
              className="w-3.5 h-3.5"
              fill={isSelectedBookmarked ? 'currentColor' : 'none'}
            />
            <span>{isSelectedBookmarked ? 'Retirer' : 'Marquer'}</span>
          </button>
          <button
            type="button"
            onClick={() => toggleSelectVerse(null)}
            aria-label="Fermer la sélection du verset"
            className="ml-1 text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
