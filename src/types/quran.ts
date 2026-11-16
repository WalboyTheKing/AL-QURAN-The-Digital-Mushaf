export interface Surah {
  id: number;
  revelation_place: 'makkah' | 'madinah' | string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: [number, number];
  translated_name: {
    language_name: string;
    name: string;
  };
}

export interface JuzMapping {
  id: number;
  juz_number: number;
  verse_mapping: Record<string, string>;
  first_verse_id: number;
  last_verse_id: number;
  verses_count: number;
}

export interface QuranWord {
  id: number;
  position: number;
  char_type_name: 'word' | 'end' | string;
  text_uthmani: string;
  line_number: number;
  page_number: number;
}

export interface QuranTranslation {
  id: number;
  resource_id: number;
  text: string;
}

export interface QuranVerse {
  id: number;
  verse_number: number;
  verse_key: string;
  hizb_number: number;
  rub_el_hizb_number: number;
  juz_number: number;
  page_number: number;
  sajdah_number: number | null;
  text_uthmani: string;
  words: QuranWord[];
  translations?: QuranTranslation[];
}

export interface MushafPageData {
  pageNumber: number;
  verses: QuranVerse[];
  juzNumber: number;
  hizbNumber: number;
  rubElHizbNumber: number;
  surahIds: number[];
}

export type ThemeMode = 'day' | 'sepia' | 'night';
export type ReadingMode = 'arabic' | 'translation';

export interface TranslationOption {
  id: number;
  label: string;
  language: 'fr' | 'en';
  author: string;
}

export interface ReadingSettings {
  theme: ThemeMode;
  brightness: number;
  readingMode: ReadingMode;
  showVerseNumbers: boolean;
  arabicFontSize: number;
  lineHeightScale: number;
  translationIds: number[];
}

export interface BookmarkItem {
  id: string;
  pageNumber: number;
  surahId: number;
  surahName: string;
  surahArabic: string;
  verseKey?: string;
  createdAt: number;
}

export interface LastReadPosition {
  pageNumber: number;
  surahId: number;
  verseKey?: string;
  updatedAt: number;
}
