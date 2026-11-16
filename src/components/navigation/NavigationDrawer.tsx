import { useState } from 'react';
import { Bookmark, Trash2, X } from 'lucide-react';
import type { BookmarkItem, JuzMapping, LastReadPosition, Surah } from '../../types/quran';
import { JuzNavigator } from './JuzNavigator';
import { PageNavigator } from './PageNavigator';
import { SurahSelector } from './SurahSelector';
import { VerseNavigator } from './VerseNavigator';

type NavTab = 'surahs' | 'pages' | 'juz' | 'verse' | 'bookmarks';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  surahs: Surah[];
  surahsById: Record<number, Surah>;
  juzs: JuzMapping[];
  currentPage: number;
  bookmarks: BookmarkItem[];
  lastRead: LastReadPosition | null;
  onGoToPage: (page: number) => void;
  onGoToSurah: (surahId: number) => void;
  onGoToJuz: (juzNumber: number) => Promise<void>;
  onGoToHizb: (hizbNumber: number) => Promise<void>;
  onGoToRub: (rubNumber: number) => Promise<void>;
  onGoToVerse: (surahId: number, verseNumber: number) => Promise<void>;
  onPlayVerse: (surahId: number, verseNumber: number) => void;
  onRemoveBookmark: (id: string) => void;
}

export function NavigationDrawer({
  isOpen,
  onClose,
  surahs,
  surahsById,
  juzs,
  currentPage,
  bookmarks,
  lastRead,
  onGoToPage,
  onGoToSurah,
  onGoToJuz,
  onGoToHizb,
  onGoToRub,
  onGoToVerse,
  onPlayVerse,
  onRemoveBookmark,
}: NavigationDrawerProps) {
  const [tab, setTab] = useState<NavTab>('surahs');

  if (!isOpen) return null;

  const navigateAndClose = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Index et navigation du Mushaf"
        className="relative z-10 flex flex-col w-full max-w-md h-full bg-[var(--mushaf-paper)] border-l border-[var(--mushaf-border)] shadow-2xl p-4 sm:p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--mushaf-border)]">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[var(--mushaf-ink)] leading-none">
              Index du Mushaf
            </h2>
            <p className="text-[11px] text-[var(--mushaf-ink-muted)] mt-1">
              Sourates, recherche, pages, Juz, Hizb, versets et marque-pages
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l’index"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5 Organized Navigation Tabs */}
        <div className="grid grid-cols-5 gap-1 p-1 my-3 rounded-lg bg-[var(--mushaf-paper-edge)]">
          {(
            [
              ['surahs', 'Sourates'],
              ['pages', 'Pages'],
              ['juz', 'Juz / Hizb'],
              ['verse', 'Verset'],
              ['bookmarks', 'Repères'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`py-1.5 px-1 rounded-md text-[11px] sm:text-xs font-medium transition-colors cursor-pointer whitespace-nowrap truncate ${
                tab === key
                  ? 'bg-[var(--mushaf-paper)] text-[var(--mushaf-ink)] shadow-sm'
                  : 'text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Active Tab Body */}
        <div className="flex-1 min-h-0 flex flex-col">
          {tab === 'surahs' && (
            <SurahSelector
              surahs={surahs}
              currentPage={currentPage}
              onSelectSurah={(id) => navigateAndClose(() => onGoToSurah(id))}
            />
          )}

          {tab === 'pages' && (
            <PageNavigator
              currentPage={currentPage}
              onGoToPage={(p) => navigateAndClose(() => onGoToPage(p))}
            />
          )}

          {tab === 'juz' && (
            <JuzNavigator
              juzs={juzs}
              surahsById={surahsById}
              onGoToJuz={async (j) => {
                await onGoToJuz(j);
                onClose();
              }}
              onGoToHizb={async (h) => {
                await onGoToHizb(h);
                onClose();
              }}
              onGoToRub={async (r) => {
                await onGoToRub(r);
                onClose();
              }}
            />
          )}

          {tab === 'verse' && (
            <VerseNavigator
              surahs={surahs}
              onGoToVerse={async (s, v) => {
                await onGoToVerse(s, v);
                onClose();
              }}
              onPlayVerse={(s, v) => {
                onPlayVerse(s, v);
                onClose();
              }}
            />
          )}

          {tab === 'bookmarks' && (
            <div className="flex-1 overflow-y-auto mushaf-scroll space-y-4">
              {lastRead && (
                <div className="p-3 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-paper-edge)]/60">
                  <div className="text-xs text-[var(--mushaf-ink-muted)] mb-1">
                    Dernière lecture enregistrée
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-[var(--mushaf-ink)] tabular-nums">
                      Page {lastRead.pageNumber} ·{' '}
                      {surahsById[lastRead.surahId]?.name_simple ?? `Sourate ${lastRead.surahId}`}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateAndClose(() => onGoToPage(lastRead.pageNumber))}
                      className="text-xs font-medium text-[var(--mushaf-emerald)] hover:underline cursor-pointer"
                    >
                      Reprendre
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-[var(--mushaf-ink)] mb-2">
                  Marque-pages enregistrés ({bookmarks.length})
                </h3>
                {bookmarks.length === 0 ? (
                  <p className="text-sm text-[var(--mushaf-ink-muted)] py-6 text-center">
                    Aucun marque-page enregistré. Utilisez « Marquer » au bas d’une page ou cliquez sur un verset.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--mushaf-border)]">
                    {bookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => navigateAndClose(() => onGoToPage(bm.pageNumber))}
                          className="flex items-center gap-2.5 text-left min-w-0 flex-1 cursor-pointer hover:opacity-80"
                        >
                          <Bookmark
                            className="w-4 h-4 text-[var(--mushaf-gold)] shrink-0"
                            fill="currentColor"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--mushaf-ink)] truncate tabular-nums">
                              {bm.surahName}
                              {bm.verseKey ? ` · Verset ${bm.verseKey}` : ''}
                            </div>
                            <div className="text-xs text-[var(--mushaf-ink-muted)] tabular-nums">
                              Page {bm.pageNumber}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveBookmark(bm.id)}
                          aria-label="Supprimer le marque-page"
                          className="p-1.5 rounded text-[var(--mushaf-ink-muted)] hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
