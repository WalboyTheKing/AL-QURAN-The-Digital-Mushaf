import type {
  JuzMapping,
  MushafPageData,
  QuranVerse,
  Surah,
  TranslationOption,
} from '../types/quran';
import { clampPage, parseVerseKey, stripHtmlTags } from '../utils/quranPagination';

const QURAN_API_BASE = 'https://api.quran.com/api/v4';

export const AVAILABLE_TRANSLATIONS: TranslationOption[] = [
  {
    id: 136,
    label: 'Français — Montada Islamic Foundation',
    language: 'fr',
    author: 'Montada Islamic Foundation',
  },
  {
    id: 31,
    label: 'Français — Muhammad Hamidullah',
    language: 'fr',
    author: 'Muhammad Hamidullah',
  },
  {
    id: 85,
    label: 'Anglais — M.A.S. Abdel Haleem',
    language: 'en',
    author: 'Abdel Haleem',
  },
];

const pageCache = new Map<number, MushafPageData>();
const inFlightPageRequests = new Map<number, Promise<MushafPageData>>();
let chaptersCache: Surah[] | null = null;
let chaptersPromise: Promise<Surah[]> | null = null;
let juzsCache: JuzMapping[] | null = null;
const juzPageCache = new Map<number, number>();
const hizbPageCache = new Map<number, number>();
const rubPageCache = new Map<number, number>();
const versePageCache = new Map<string, number>();

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erreur API Coran (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function getChapters(): Promise<Surah[]> {
  if (chaptersCache) return chaptersCache;
  if (chaptersPromise) return chaptersPromise;

  chaptersPromise = fetchJson<{ chapters: Surah[] }>(
    `${QURAN_API_BASE}/chapters?language=fr`,
  )
    .then((data) => {
      chaptersCache = data.chapters;
      return data.chapters;
    })
    .finally(() => {
      chaptersPromise = null;
    });

  return chaptersPromise;
}

export async function getJuzs(): Promise<JuzMapping[]> {
  if (juzsCache) return juzsCache;
  const data = await fetchJson<{ juzs: JuzMapping[] }>(`${QURAN_API_BASE}/juzs`);
  // API returns duplicate entries (ids 1..30 and 61..90); deduplicate by juz_number
  const seen = new Set<number>();
  const unique: JuzMapping[] = [];
  for (const j of data.juzs) {
    if (!seen.has(j.juz_number)) {
      seen.add(j.juz_number);
      unique.push(j);
    }
  }
  unique.sort((a, b) => a.juz_number - b.juz_number);
  juzsCache = unique;
  return unique;
}

export async function getMushafPage(pageNumber: number): Promise<MushafPageData> {
  const page = clampPage(pageNumber);
  const cached = pageCache.get(page);
  if (cached) return cached;

  const existing = inFlightPageRequests.get(page);
  if (existing) return existing;

  const request = (async (): Promise<MushafPageData> => {
    const allVerses: QuranVerse[] = [];
    let currentPage = 1;
    let hasNext = true;

    while (hasNext) {
      const url = `${QURAN_API_BASE}/verses/by_page/${page}?per_page=50&page=${currentPage}&language=fr&words=true&word_fields=text_uthmani,line_number,page_number,position&translations=136,31,85&fields=text_uthmani,verse_key,page_number,juz_number,hizb_number,rub_el_hizb_number,sajdah_number`;
      const data = await fetchJson<{
        verses: QuranVerse[];
        pagination?: { next_page: number | null };
      }>(url);

      for (const verse of data.verses) {
        const cleanedTranslations = verse.translations?.map((tr) => ({
          ...tr,
          text: stripHtmlTags(tr.text),
        }));
        allVerses.push({
          ...verse,
          translations: cleanedTranslations,
        });
        versePageCache.set(verse.verse_key, verse.page_number);
      }

      if (data.pagination?.next_page) {
        currentPage = data.pagination.next_page;
      } else {
        hasNext = false;
      }
    }

    const surahIds: number[] = [];
    const surahSet = new Set<number>();
    for (const v of allVerses) {
      const { surahId } = parseVerseKey(v.verse_key);
      if (!surahSet.has(surahId)) {
        surahSet.add(surahId);
        surahIds.push(surahId);
      }
    }

    const first = allVerses[0];
    const result: MushafPageData = {
      pageNumber: page,
      verses: allVerses,
      juzNumber: first?.juz_number ?? 1,
      hizbNumber: first?.hizb_number ?? 1,
      rubElHizbNumber: first?.rub_el_hizb_number ?? 1,
      surahIds,
    };

    pageCache.set(page, result);
    return result;
  })().finally(() => {
    inFlightPageRequests.delete(page);
  });

  inFlightPageRequests.set(page, request);
  return request;
}

export function getCachedMushafPage(pageNumber: number): MushafPageData | undefined {
  return pageCache.get(clampPage(pageNumber));
}

export function prefetchMushafPages(pages: number[]): void {
  for (const p of pages) {
    const clamped = clampPage(p);
    if (!pageCache.has(clamped) && !inFlightPageRequests.has(clamped)) {
      void getMushafPage(clamped).catch(() => {
        // Silent background prefetch failure
      });
    }
  }
}

export async function getPageForJuz(juzNumber: number): Promise<number> {
  const juz = Math.max(1, Math.min(30, juzNumber));
  const cached = juzPageCache.get(juz);
  if (cached) return cached;

  const data = await fetchJson<{ verses: Array<{ page_number: number }> }>(
    `${QURAN_API_BASE}/verses/by_juz/${juz}?per_page=1&fields=page_number`,
  );
  const page = data.verses[0]?.page_number ?? 1;
  juzPageCache.set(juz, page);
  return page;
}

export async function getPageForHizb(hizbNumber: number): Promise<number> {
  const hizb = Math.max(1, Math.min(60, hizbNumber));
  const cached = hizbPageCache.get(hizb);
  if (cached) return cached;

  const data = await fetchJson<{ verses: Array<{ page_number: number }> }>(
    `${QURAN_API_BASE}/verses/by_hizb/${hizb}?per_page=1&fields=page_number`,
  );
  const page = data.verses[0]?.page_number ?? 1;
  hizbPageCache.set(hizb, page);
  return page;
}

export async function getPageForRub(rubNumber: number): Promise<number> {
  const rub = Math.max(1, Math.min(240, rubNumber));
  const cached = rubPageCache.get(rub);
  if (cached) return cached;

  const data = await fetchJson<{ verses: Array<{ page_number: number }> }>(
    `${QURAN_API_BASE}/verses/by_rub/${rub}?per_page=1&fields=page_number`,
  );
  const page = data.verses[0]?.page_number ?? 1;
  rubPageCache.set(rub, page);
  return page;
}

export async function getPageForVerse(verseKey: string): Promise<number> {
  const cached = versePageCache.get(verseKey);
  if (cached) return cached;

  const data = await fetchJson<{ verse: { page_number: number } }>(
    `${QURAN_API_BASE}/verses/by_key/${encodeURIComponent(verseKey)}?fields=page_number`,
  );
  const page = data.verse?.page_number ?? 1;
  versePageCache.set(verseKey, page);
  return page;
}
