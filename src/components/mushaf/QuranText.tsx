import { Fragment } from 'react';
import type {
  BookmarkItem,
  MushafPageData,
  QuranVerse,
  ReadingSettings,
  Surah,
} from '../../types/quran';
import { parseVerseKey } from '../../utils/quranPagination';
import { VerseRenderer } from './VerseRenderer';

interface QuranTextProps {
  pageData: MushafPageData;
  surahsById: Record<number, Surah>;
  settings: ReadingSettings;
  activeVerseKey: string | null;
  activeWordPosition: number | null;
  selectedVerseKey: string | null;
  bookmarks: BookmarkItem[];
  onSelectVerse: (verse: QuranVerse) => void;
}

function SurahCartouche({ surah }: { surah?: Surah }) {
  if (!surah) return null;
  const revPlace = surah.revelation_place === 'makkah' ? 'Mecquoise' : 'Médinoise';

  return (
    <div className="my-3 first:mt-1 select-none" dir="rtl">
      <div className="relative rounded-md border border-[var(--mushaf-gold)]/55 bg-gradient-to-r from-[var(--mushaf-gold-soft)]/30 via-[var(--mushaf-paper-edge)] to-[var(--mushaf-gold-soft)]/30 px-4 py-2 text-center shadow-[inset_0_0_0_2px_var(--mushaf-paper),inset_0_0_0_3px_var(--mushaf-gold-soft)]">
        <div className="flex items-center justify-center gap-3">
          <span className="text-[var(--mushaf-gold)] text-xs hidden sm:inline" aria-hidden="true">
            ۞
          </span>
          <h2 className="font-quran text-xl sm:text-2xl text-[var(--mushaf-ink)] leading-snug">
            سُورَةُ {surah.name_arabic}
          </h2>
          <span className="text-[var(--mushaf-gold)] text-xs hidden sm:inline" aria-hidden="true">
            ۞
          </span>
        </div>
        <p
          dir="ltr"
          className="mt-0.5 text-[11px] text-[var(--mushaf-ink-muted)] tracking-wide"
        >
          {surah.id}. {surah.name_simple} ({surah.translated_name.name}) · {revPlace} ·{' '}
          <span className="tabular-nums">{surah.verses_count}</span> versets
        </p>
      </div>

      {surah.bismillah_pre && (
        <p
          className="font-quran text-center text-[var(--mushaf-ink)] mt-2.5 mb-1.5"
          style={{ fontSize: '1.35em' }}
        >
          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
        </p>
      )}
    </div>
  );
}

export function QuranText({
  pageData,
  surahsById,
  settings,
  activeVerseKey,
  activeWordPosition,
  selectedVerseKey,
  bookmarks,
  onSelectVerse,
}: QuranTextProps) {
  const isIlluminatedOpening = pageData.pageNumber <= 2;
  const bookmarkedKeys = new Set(bookmarks.map((b) => b.verseKey).filter(Boolean));

  const renderContent = () => {
    if (settings.readingMode === 'translation') {
      return (
        <div className="space-y-1">
          {pageData.verses.map((verse) => {
            const { surahId } = parseVerseKey(verse.verse_key);
            const showHeader = verse.verse_number === 1;
            return (
              <Fragment key={verse.verse_key}>
                {showHeader && <SurahCartouche surah={surahsById[surahId]} />}
                <VerseRenderer
                  verse={verse}
                  readingMode={settings.readingMode}
                  showVerseNumbers={settings.showVerseNumbers}
                  translationIds={settings.translationIds}
                  isVerseActive={activeVerseKey === verse.verse_key}
                  activeWordPosition={
                    activeVerseKey === verse.verse_key ? activeWordPosition : null
                  }
                  isSelected={selectedVerseKey === verse.verse_key}
                  isBookmarked={bookmarkedKeys.has(verse.verse_key)}
                  arabicFontSize={settings.arabicFontSize}
                  lineHeightScale={settings.lineHeightScale}
                  onSelectVerse={onSelectVerse}
                />
              </Fragment>
            );
          })}
        </div>
      );
    }

    // Group verses into Surah segments so each Surah header renders as block while verses flow inline RTL
    const blocks: Array<{ surahId: number; startsSurah: boolean; verses: QuranVerse[] }> = [];
    for (const verse of pageData.verses) {
      const { surahId } = parseVerseKey(verse.verse_key);
      const startsSurah = verse.verse_number === 1;
      const lastBlock = blocks[blocks.length - 1];
      if (!lastBlock || startsSurah || lastBlock.surahId !== surahId) {
        blocks.push({ surahId, startsSurah, verses: [verse] });
      } else {
        lastBlock.verses.push(verse);
      }
    }

    return (
      <div className={isIlluminatedOpening ? 'flex flex-col justify-center min-h-full py-2' : ''}>
        {blocks.map((block, idx) => (
          <div key={`${block.surahId}-${idx}`}>
            {block.startsSurah && <SurahCartouche surah={surahsById[block.surahId]} />}
            <div
              dir="rtl"
              className={`font-quran text-[var(--mushaf-ink)] ${
                isIlluminatedOpening ? 'text-center' : 'text-justify'
              }`}
              style={{
                fontSize: `${settings.arabicFontSize}px`,
                lineHeight: settings.lineHeightScale,
                textAlignLast: isIlluminatedOpening ? 'center' : 'center',
              }}
            >
              {block.verses.map((verse) => (
                <VerseRenderer
                  key={verse.verse_key}
                  verse={verse}
                  readingMode="arabic"
                  showVerseNumbers={settings.showVerseNumbers}
                  translationIds={settings.translationIds}
                  isVerseActive={activeVerseKey === verse.verse_key}
                  activeWordPosition={
                    activeVerseKey === verse.verse_key ? activeWordPosition : null
                  }
                  isSelected={selectedVerseKey === verse.verse_key}
                  isBookmarked={bookmarkedKeys.has(verse.verse_key)}
                  arabicFontSize={settings.arabicFontSize}
                  lineHeightScale={settings.lineHeightScale}
                  onSelectVerse={onSelectVerse}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`h-full overflow-y-auto mushaf-scroll px-2 sm:px-4 py-1 ${
        isIlluminatedOpening
          ? 'border-2 border-[var(--mushaf-gold)]/60 rounded-lg bg-[var(--mushaf-gold-soft)]/10 shadow-[inset_0_0_0_4px_var(--mushaf-paper),inset_0_0_0_5px_var(--mushaf-gold-soft)]'
          : ''
      }`}
    >
      {renderContent()}
    </div>
  );
}
