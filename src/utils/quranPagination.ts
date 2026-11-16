export const TOTAL_MUSHAF_PAGES = 604;

export function clampPage(page: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.min(TOTAL_MUSHAF_PAGES, Math.floor(page)));
}

/**
 * In the Madinah Mushaf, spreads are paired right-to-left:
 * Right page = odd (1, 3, 5, ..., 603)
 * Left page  = even (2, 4, 6, ..., 604)
 */
export function getSpreadPages(anchorPage: number): { rightPage: number; leftPage: number } {
  const clamped = clampPage(anchorPage);
  const rightPage = clamped % 2 === 1 ? clamped : clamped - 1;
  const leftPage = Math.min(TOTAL_MUSHAF_PAGES, rightPage + 1);
  return { rightPage, leftPage };
}

export function isPageVisibleInSpread(page: number, anchorPage: number, isSpreadMode: boolean): boolean {
  if (!isSpreadMode) {
    return page === clampPage(anchorPage);
  }
  const { rightPage, leftPage } = getSpreadPages(anchorPage);
  return page === rightPage || page === leftPage;
}

export function toArabicIndicDigits(num: number | string): string {
  const map = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/\d/g, (d) => map[Number(d)] ?? d);
}

export function parseVerseKey(verseKey: string): { surahId: number; verseNumber: number } {
  const [s, v] = verseKey.split(':').map(Number);
  return {
    surahId: Number.isFinite(s) ? s : 1,
    verseNumber: Number.isFinite(v) ? v : 1,
  };
}

export function stripHtmlTags(html: string): string {
  return html
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
