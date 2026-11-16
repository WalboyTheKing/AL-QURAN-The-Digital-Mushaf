import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getCachedMushafPage,
  getChapters,
  getJuzs,
  getMushafPage,
  getPageForHizb,
  getPageForJuz,
  getPageForRub,
  getPageForVerse,
  prefetchMushafPages,
} from '../services/quranApi';
import type {
  BookmarkItem,
  JuzMapping,
  LastReadPosition,
  MushafPageData,
  ReadingSettings,
  Surah,
} from '../types/quran';
import { clampPage, getSpreadPages, parseVerseKey } from '../utils/quranPagination';

const BOOKMARKS_KEY = 'mushaf_bookmarks_v1';
const LAST_READ_KEY = 'mushaf_last_read_v1';
const SETTINGS_KEY = 'mushaf_settings_v1';

const DEFAULT_SETTINGS: ReadingSettings = {
  theme: 'day',
  brightness: 100,
  readingMode: 'arabic',
  showVerseNumbers: true,
  arabicFontSize: 24,
  lineHeightScale: 2.0,
  translationIds: [136],
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useQuran() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [juzs, setJuzs] = useState<JuzMapping[]>([]);
  const [surahsLoading, setSurahsLoading] = useState(true);

  const [lastRead, setLastRead] = useState<LastReadPosition | null>(() =>
    readStorage<LastReadPosition | null>(LAST_READ_KEY, null),
  );

  const [currentPage, setCurrentPage] = useState<number>(() =>
    clampPage(readStorage<LastReadPosition | null>(LAST_READ_KEY, null)?.pageNumber ?? 1),
  );

  const [isSpreadMode, setIsSpreadMode] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 900 : true,
  );

  const [pagesMap, setPagesMap] = useState<Record<number, MushafPageData>>({});
  const [loadingPages, setLoadingPages] = useState<Record<number, boolean>>({});
  const [pageError, setPageError] = useState<string | null>(null);

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() =>
    readStorage<BookmarkItem[]>(BOOKMARKS_KEY, []),
  );

  const [settings, setSettings] = useState<ReadingSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...readStorage<Partial<ReadingSettings>>(SETTINGS_KEY, {}),
  }));

  const surahsRef = useRef<Surah[]>([]);
  surahsRef.current = surahs;

  // Responsive desktop/wide-tablet 2-page spread vs mobile/narrow-tablet 1-page view
  useEffect(() => {
    const handleResize = () => {
      setIsSpreadMode(window.innerWidth >= 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync theme classes to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-sepia', 'theme-night', 'dark');
    if (settings.theme === 'sepia') {
      root.classList.add('theme-sepia');
    } else if (settings.theme === 'night') {
      root.classList.add('theme-night', 'dark');
    }
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors
    }
  }, [settings]);

  // Persist bookmarks
  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch {
      // Ignore storage errors
    }
  }, [bookmarks]);

  // Load 114 surahs and 30 juzs
  useEffect(() => {
    let active = true;
    Promise.all([getChapters(), getJuzs()])
      .then(([chaptersData, juzsData]) => {
        if (!active) return;
        setSurahs(chaptersData);
        setJuzs(juzsData);
      })
      .catch(() => {
        // Error handled on page load UI if offline
      })
      .finally(() => {
        if (active) setSurahsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const ensurePageLoaded = useCallback(async (page: number) => {
    const clamped = clampPage(page);
    const cached = getCachedMushafPage(clamped);
    if (cached) {
      setPagesMap((prev) => (prev[clamped] ? prev : { ...prev, [clamped]: cached }));
      return cached;
    }

    setLoadingPages((prev) => ({ ...prev, [clamped]: true }));
    setPageError(null);
    try {
      const data = await getMushafPage(clamped);
      setPagesMap((prev) => ({ ...prev, [clamped]: data }));
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur de chargement de la page du Mushaf.';
      setPageError(message);
      return null;
    } finally {
      setLoadingPages((prev) => ({ ...prev, [clamped]: false }));
    }
  }, []);

  // Preload opening pages (1 & 2) immediately so opening the Mushaf never flashes a loader
  useEffect(() => {
    prefetchMushafPages([1, 2]);
  }, []);

  // Load current visible page(s) and prefetch neighbors
  useEffect(() => {
    const pagesToLoad = isSpreadMode
      ? (() => {
          const { rightPage, leftPage } = getSpreadPages(currentPage);
          return rightPage === leftPage ? [rightPage] : [rightPage, leftPage];
        })()
      : [currentPage];

    for (const p of pagesToLoad) {
      void ensurePageLoaded(p);
    }

    const base = pagesToLoad[0];
    prefetchMushafPages([
      base - 3,
      base - 2,
      base - 1,
      base + 1,
      base + 2,
      base + 3,
      base + 4,
      base + 5,
    ]);
  }, [currentPage, isSpreadMode, ensurePageLoaded]);

  // Persist last read position whenever currentPage or its data updates
  useEffect(() => {
    const pageData = pagesMap[currentPage];
    const firstVerse = pageData?.verses[0];
    const surahId = firstVerse ? parseVerseKey(firstVerse.verse_key).surahId : 1;
    const nextLastRead: LastReadPosition = {
      pageNumber: currentPage,
      surahId,
      verseKey: firstVerse?.verse_key,
      updatedAt: Date.now(),
    };
    setLastRead(nextLastRead);
    try {
      localStorage.setItem(LAST_READ_KEY, JSON.stringify(nextLastRead));
    } catch {
      // Ignore storage errors
    }
  }, [currentPage, pagesMap]);

  const goToPage = useCallback((page: number) => {
    const clamped = clampPage(page);
    setCurrentPage(clamped);
  }, []);

  const nextSpreadOrPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (isSpreadMode) {
        const { leftPage } = getSpreadPages(prev);
        return clampPage(leftPage + 1);
      }
      return clampPage(prev + 1);
    });
  }, [isSpreadMode]);

  const prevSpreadOrPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (isSpreadMode) {
        const { rightPage } = getSpreadPages(prev);
        return clampPage(rightPage - 2);
      }
      return clampPage(prev - 1);
    });
  }, [isSpreadMode]);

  const goToSurah = useCallback(
    (surahId: number) => {
      const found = surahsRef.current.find((s) => s.id === surahId);
      if (found) {
        goToPage(found.pages[0]);
      }
    },
    [goToPage],
  );

  const goToJuz = useCallback(
    async (juzNumber: number) => {
      const page = await getPageForJuz(juzNumber);
      goToPage(page);
    },
    [goToPage],
  );

  const goToHizb = useCallback(
    async (hizbNumber: number) => {
      const page = await getPageForHizb(hizbNumber);
      goToPage(page);
    },
    [goToPage],
  );

  const goToRub = useCallback(
    async (rubNumber: number) => {
      const page = await getPageForRub(rubNumber);
      goToPage(page);
    },
    [goToPage],
  );

  const goToVerse = useCallback(
    async (surahId: number, verseNumber: number) => {
      const page = await getPageForVerse(`${surahId}:${verseNumber}`);
      goToPage(page);
    },
    [goToPage],
  );

  const togglePageBookmark = useCallback(
    (pageNumber: number, verseKey?: string) => {
      const pageData = pagesMap[pageNumber];
      const surahId = verseKey
        ? parseVerseKey(verseKey).surahId
        : (pageData?.surahIds[0] ?? 1);
      const surah = surahsRef.current.find((s) => s.id === surahId);
      const id = verseKey ? `verse:${verseKey}` : `page:${pageNumber}`;

      setBookmarks((prev) => {
        const exists = prev.some((b) => b.id === id);
        if (exists) {
          return prev.filter((b) => b.id !== id);
        }
        const item: BookmarkItem = {
          id,
          pageNumber,
          surahId,
          surahName: surah?.name_simple ?? `Sourate ${surahId}`,
          surahArabic: surah?.name_arabic ?? '',
          verseKey,
          createdAt: Date.now(),
        };
        return [item, ...prev];
      });
    },
    [pagesMap],
  );

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateSettings = useCallback((patch: Partial<ReadingSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const surahsById = useMemo(() => {
    const map: Record<number, Surah> = {};
    for (const s of surahs) map[s.id] = s;
    return map;
  }, [surahs]);

  return {
    surahs,
    surahsById,
    juzs,
    surahsLoading,
    currentPage,
    isSpreadMode,
    pagesMap,
    loadingPages,
    pageError,
    bookmarks,
    lastRead,
    settings,
    goToPage,
    nextSpreadOrPage,
    prevSpreadOrPage,
    goToSurah,
    goToJuz,
    goToHizb,
    goToRub,
    goToVerse,
    ensurePageLoaded,
    togglePageBookmark,
    removeBookmark,
    updateSettings,
  };
}
