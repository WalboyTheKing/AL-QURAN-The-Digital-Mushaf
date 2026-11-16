import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, RotateCcw } from 'lucide-react';
import type { LastReadPosition, MushafPageData, Surah } from '../../types/quran';
import { parseVerseKey, toArabicIndicDigits } from '../../utils/quranPagination';

interface MushafCoverProps {
  isOpening: boolean;
  targetPage: number;
  targetPageData?: MushafPageData;
  lastRead: LastReadPosition | null;
  surahsById: Record<number, Surah>;
  onOpenFresh: () => void;
  onResumeLastRead: () => void;
  onOpenAnimationComplete: () => void;
}

const COVER_IMAGE_URL = '/src/assets/images/mushaf_emerald_cover_1794837932534.jpg';

export function MushafCover({
  isOpening,
  targetPage,
  targetPageData,
  lastRead,
  surahsById,
  onOpenFresh,
  onResumeLastRead,
  onOpenAnimationComplete,
}: MushafCoverProps) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const lastSurah = lastRead ? surahsById[lastRead.surahId] : undefined;

  const targetFirstVerse = targetPageData?.verses[0];
  const targetSurahId = targetFirstVerse
    ? parseVerseKey(targetFirstVerse.verse_key).surahId
    : targetPage <= 2
      ? 1
      : lastRead?.surahId ?? 1;
  const targetSurah = surahsById[targetSurahId];

  return (
    <div className="relative flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 w-full h-full max-w-5xl mx-auto px-4 py-2 overflow-visible">
      {/* 3D Emerald Leather Mushaf Cover Stage (unclipped 3D perspective) */}
      <motion.div
        animate={
          isOpening
            ? {
                scale: 1.03,
              }
            : { scale: 1 }
        }
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="book-stage relative h-[min(54dvh,520px)] lg:h-[min(74dvh,590px)] aspect-[0.71] max-w-full shrink-0 overflow-visible"
      >
        {/* Left Stacked Page Thickness Edge (visible when closed, settles flat as cover opens) */}
        <motion.div
          animate={{ opacity: isOpening ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          aria-hidden="true"
          className="absolute inset-y-2 -left-2 w-2.5 rounded-l-md border-y border-l border-[var(--mushaf-border)] shadow-md"
          style={{
            background:
              'repeating-linear-gradient(to right, #ede3cc 0px, #e3d6b8 1px, #f7f1e3 2px, #e3d6b8 3px)',
          }}
        />

        {/* Underlying Illuminated Target Page Revealed as Cover Swings Open */}
        <div
          className="absolute inset-0 rounded-l-xl rounded-r-sm mushaf-paper-surface border border-[var(--mushaf-border)] shadow-[0_22px_50px_-14px_rgba(10,24,18,0.45)] flex flex-col justify-between p-4 sm:p-6 text-center overflow-hidden"
          aria-hidden="true"
        >
          {/* Spine shadow inside revealed page */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--mushaf-spine)] via-black/[0.04] to-transparent" />

          <div className="relative z-10 w-full h-full border border-[var(--mushaf-gold)]/55 rounded-lg flex flex-col items-center justify-between p-4 sm:p-5 bg-[var(--mushaf-gold-soft)]/10 shadow-[inset_0_0_0_3px_var(--mushaf-paper),inset_0_0_0_4px_var(--mushaf-gold-soft)]">
            <div className="w-full flex items-center justify-between text-[11px] text-[var(--mushaf-ink-muted)] border-b border-[var(--mushaf-border)] pb-1.5">
              <span className="text-[var(--mushaf-gold)] font-medium">
                {targetPageData ? `Juz ${targetPageData.juzNumber}` : 'Juz 1'}
              </span>
              <span className="font-medium text-[var(--mushaf-ink)]">
                {targetSurah ? `${targetSurah.id}. ${targetSurah.name_simple}` : 'Al-Fatihah'}
              </span>
              <span className="font-quran text-sm text-[var(--mushaf-gold)]" dir="rtl">
                {targetSurah ? `سُورَةُ ${targetSurah.name_arabic}` : 'سُورَةُ ٱلْفَاتِحَةِ'}
              </span>
            </div>

            <div className="my-auto flex flex-col items-center justify-center px-2">
              {targetPage <= 2 ? (
                <>
                  <span className="font-quran text-xl sm:text-2xl text-[var(--mushaf-gold)] mb-3" dir="rtl">
                    سُورَةُ ٱلْفَاتِحَةِ
                  </span>
                  <p className="font-quran text-2xl sm:text-3xl text-[var(--mushaf-ink)] leading-loose" dir="rtl">
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                  </p>
                  <p className="font-quran text-xl sm:text-2xl text-[var(--mushaf-ink)] mt-1.5 leading-loose" dir="rtl">
                    ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ
                  </p>
                </>
              ) : (
                <>
                  <span className="font-quran text-2xl sm:text-3xl text-[var(--mushaf-gold)] mb-2" dir="rtl">
                    {targetSurah ? `سُورَةُ ${targetSurah.name_arabic}` : ''}
                  </span>
                  {targetFirstVerse && (
                    <p
                      className="font-quran text-lg sm:text-xl text-[var(--mushaf-ink)] leading-loose line-clamp-3"
                      dir="rtl"
                    >
                      {targetFirstVerse.text_uthmani}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="w-full flex items-center justify-center gap-1.5 pt-1.5 border-t border-[var(--mushaf-border)] text-xs text-[var(--mushaf-ink-muted)] tabular-nums">
              <span className="font-quran text-sm text-[var(--mushaf-gold)]">
                {toArabicIndicDigits(targetPage)}
              </span>
              <span>·</span>
              <span>Page {targetPage}</span>
            </div>
          </div>

          {/* Dynamic Cast Shadow from Opening Cover */}
          <motion.div
            initial={{ opacity: 0.45 }}
            animate={{ opacity: isOpening ? 0 : 0.45 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/35 via-black/15 to-transparent"
          />
        </div>

        {/* 3D Animated Emerald Leather Cover pivoting smoothly around the RIGHT spine (RTL Mushaf) */}
        <motion.div
          initial={{ rotateY: 0, opacity: 1 }}
          animate={
            isOpening
              ? isDesktop
                ? { rotateY: 180, opacity: 1 }
                : { rotateY: 96, opacity: 0 }
              : { rotateY: 0, opacity: 1 }
          }
          transition={{
            duration: isDesktop ? 0.8 : 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
          onAnimationComplete={() => {
            if (isOpening) {
              onOpenAnimationComplete();
            }
          }}
          style={{ transformOrigin: 'right center' }}
          onClick={!isOpening ? onOpenFresh : undefined}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !isOpening) {
              e.preventDefault();
              onOpenFresh();
            }
          }}
          aria-label="Ouvrir le Mushaf"
          className="book-leaf relative z-10 w-full h-full rounded-l-2xl rounded-r-md cursor-pointer select-none shadow-[0_24px_55px_-14px_rgba(8,24,18,0.58)] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mushaf-gold)]"
        >
          {/* FRONT FACE: Emerald Leather & Gold Filigree */}
          <div className="book-face absolute inset-0 rounded-l-2xl rounded-r-md overflow-hidden bg-gradient-to-br from-[#0e3a29] via-[#09291d] to-[#061d14] border border-[#c5a059]/45">
            {/* Scaled to 118% and flipped RTL so only the leather cover & gold border appear (zero beige paper border) */}
            <div className="absolute inset-0 scale-x-[-1] transition-transform duration-500 group-hover:scale-x-[-1.02] group-hover:scale-y-[1.02]">
              <img
                src={COVER_IMAGE_URL}
                alt="Couverture ornementale du Mushaf en cuir vert émeraude et or"
                referrerPolicy="no-referrer"
                className="absolute left-1/2 top-1/2 w-[118%] h-[118%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            {/* Spine Hinge Shading along Right Binding Edge */}
            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/50 via-black/15 to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-5 w-px bg-[#e6cf8b]/25 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 pointer-events-none" />

            {/* Centered Gilded Calligraphic Title inside the Shamsa Medallion */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center pointer-events-none">
              <div className="flex flex-col items-center justify-center">
                <span
                  className="font-quran text-2xl sm:text-3xl text-[#f7e4a8] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] leading-snug"
                  dir="rtl"
                >
                  القرآن الكريم
                </span>
                <span className="mt-1 text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-[#e6cf8b]/90 font-medium drop-shadow">
                  Mushaf de Médine
                </span>
              </div>
            </div>
          </div>

          {/* BACK FACE (Inside Front Cover Endpaper visible as cover opens past 90°) */}
          <div className="book-face book-face-back absolute inset-0 rounded-r-2xl rounded-l-md overflow-hidden bg-gradient-to-bl from-[#0e3928] via-[#09281c] to-[#061c14] border border-[#c5a059]/45 p-4 flex items-center justify-center">
            <div className="w-full h-full rounded-xl border border-[#c5a059]/45 p-2 flex items-center justify-center shadow-[inset_0_0_24px_rgba(0,0,0,0.45)]">
              <div className="w-full h-full rounded-lg border border-[#c5a059]/25 flex flex-col items-center justify-center text-center px-4">
                <span className="font-quran text-xl text-[#e6cf8b]/85" dir="rtl">
                  ۞ مَصْحَفُ ٱلْمَدِينَةِ ٱلنَّبَوِيَّةِ ۞
                </span>
                <span className="mt-2 text-[10px] tracking-[0.24em] uppercase text-[#c5a059]/75">
                  Édition Numérique
                </span>
              </div>
            </div>
            {/* Inner Spine Shadow */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
          </div>
        </motion.div>
      </motion.div>

      {/* Editorial Title & Primary Actions (smoothly clears before cover swings across) */}
      <motion.div
        animate={
          isOpening
            ? { opacity: 0, x: 28, pointerEvents: 'none' as const }
            : { opacity: 1, x: 0, pointerEvents: 'auto' as const }
        }
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-md shrink-0"
      >
        <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-[var(--mushaf-ink)] text-balance">
          AL-QURAN — The Digital Mushaf
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[var(--mushaf-ink-muted)] leading-relaxed">
          604 pages authentiques du Mushaf de Médine · Récitation synchronisée verset par verset et mot par mot · Lecture arabe de droite à gauche.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-3">
          <button
            type="button"
            onClick={onOpenFresh}
            disabled={isOpening}
            className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-lg bg-[#0d4a34] hover:bg-[#0a3b29] text-[#faf6ec] text-sm font-medium shadow-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mushaf-gold)]"
          >
            <BookOpen className="w-4 h-4" />
            <span>Ouvrir le Mushaf</span>
          </button>

          {lastRead && lastRead.pageNumber > 1 && (
            <button
              type="button"
              onClick={onResumeLastRead}
              disabled={isOpening}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] hover:bg-[var(--mushaf-paper-edge)] text-[var(--mushaf-ink)] text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mushaf-gold)]"
            >
              <RotateCcw className="w-4 h-4 text-[var(--mushaf-emerald)]" />
              <span>
                Reprendre · Page {lastRead.pageNumber}
                {lastSurah ? ` (${lastSurah.name_simple})` : ''}
              </span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
