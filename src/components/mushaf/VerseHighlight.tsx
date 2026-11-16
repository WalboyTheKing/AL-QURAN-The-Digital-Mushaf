import type { QuranWord } from '../../types/quran';
import { toArabicIndicDigits } from '../../utils/quranPagination';

interface VerseHighlightProps {
  word: QuranWord;
  isVerseActive: boolean;
  isWordActive: boolean;
  showVerseNumber: boolean;
  verseNumber: number;
}

export function VerseHighlight({
  word,
  isVerseActive,
  isWordActive,
  showVerseNumber,
  verseNumber,
}: VerseHighlightProps) {
  if (word.char_type_name === 'end') {
    if (!showVerseNumber) return null;
    return (
      <span
        className={`inline-flex items-center justify-center mx-1 px-1 text-[0.82em] select-none transition-colors duration-150 tabular-nums ${
          isVerseActive
            ? 'text-[var(--mushaf-emerald)] font-semibold'
            : 'text-[var(--mushaf-gold)]'
        }`}
        aria-label={`Verset ${verseNumber}`}
      >
        <span className="font-quran">﴿{toArabicIndicDigits(verseNumber)}﴾</span>
      </span>
    );
  }

  return (
    <span
      className={`inline transition-colors duration-100 rounded-[3px] px-[1px] ${
        isWordActive
          ? 'bg-[var(--mushaf-word-bg)] text-[var(--mushaf-emerald)] shadow-[inset_0_-2px_0_var(--mushaf-emerald)]'
          : isVerseActive
            ? 'text-[var(--mushaf-ink)]'
            : ''
      }`}
    >
      {word.text_uthmani}{' '}
    </span>
  );
}
