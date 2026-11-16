import { useEffect, useRef } from 'react';
import type { QuranVerse, ReadingMode } from '../../types/quran';
import { VerseHighlight } from './VerseHighlight';

interface VerseRendererProps {
  verse: QuranVerse;
  readingMode: ReadingMode;
  showVerseNumbers: boolean;
  translationIds: number[];
  isVerseActive: boolean;
  activeWordPosition: number | null;
  isSelected: boolean;
  isBookmarked: boolean;
  arabicFontSize: number;
  lineHeightScale: number;
  onSelectVerse: (verse: QuranVerse) => void;
}

export function VerseRenderer({
  verse,
  readingMode,
  showVerseNumbers,
  translationIds,
  isVerseActive,
  activeWordPosition,
  isSelected,
  isBookmarked,
  arabicFontSize,
  lineHeightScale,
  onSelectVerse,
}: VerseRendererProps) {
  const verseRef = useRef<HTMLSpanElement | HTMLDivElement | null>(null);

  useEffect(() => {
    if (isVerseActive && verseRef.current) {
      verseRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isVerseActive]);

  const activeTranslations = (verse.translations ?? []).filter((t) =>
    translationIds.includes(t.resource_id),
  );

  if (readingMode === 'translation') {
    return (
      <div
        ref={(el) => {
          verseRef.current = el;
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectVerse(verse);
        }}
        className={`group rounded-lg px-3 py-3 border-b border-[var(--mushaf-border)] transition-colors cursor-pointer ${
          isVerseActive
            ? 'bg-[var(--mushaf-emerald-bg)] ring-1 ring-[var(--mushaf-emerald)]/35'
            : isSelected
              ? 'bg-[var(--mushaf-gold-soft)]/30'
              : 'hover:bg-[var(--mushaf-paper-edge)]/60'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="text-xs font-medium text-[var(--mushaf-gold)] tabular-nums shrink-0">
            {verse.verse_key}
            {isBookmarked ? ' · Marqué' : ''}
          </span>
        </div>

        <p
          dir="rtl"
          className="font-quran text-right text-[var(--mushaf-ink)]"
          style={{
            fontSize: `${arabicFontSize}px`,
            lineHeight: lineHeightScale,
          }}
        >
          {verse.words.map((word) => (
            <VerseHighlight
              key={word.id}
              word={word}
              isVerseActive={isVerseActive}
              isWordActive={isVerseActive && activeWordPosition === word.position}
              showVerseNumber={showVerseNumbers}
              verseNumber={verse.verse_number}
            />
          ))}
        </p>

        {activeTranslations.length > 0 && (
          <div className="mt-2.5 space-y-1.5 text-left" dir="ltr">
            {activeTranslations.map((tr) => (
              <p
                key={tr.id}
                className="text-sm text-[var(--mushaf-ink-muted)] leading-relaxed"
              >
                {tr.text}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Continuous traditional Mushaf Arabic flow
  return (
    <span
      ref={(el) => {
        verseRef.current = el;
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectVerse(verse);
      }}
      className={`inline rounded-[4px] transition-colors duration-150 cursor-pointer box-decoration-clone px-[2px] ${
        isVerseActive
          ? 'bg-[var(--mushaf-emerald-bg)]'
          : isSelected
            ? 'bg-[var(--mushaf-gold-soft)]/45'
            : 'hover:bg-[var(--mushaf-gold-soft)]/20'
      }`}
    >
      {verse.words.map((word) => (
        <VerseHighlight
          key={word.id}
          word={word}
          isVerseActive={isVerseActive}
          isWordActive={isVerseActive && activeWordPosition === word.position}
          showVerseNumber={showVerseNumbers}
          verseNumber={verse.verse_number}
        />
      ))}
    </span>
  );
}
