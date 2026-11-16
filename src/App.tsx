import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  BookMarked,
  BookOpen,
  Compass,
  Maximize2,
  Minimize2,
  Moon,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { HifzPanel } from './components/audio/HifzPanel';
import { QuranAudioPlayer } from './components/audio/QuranAudioPlayer';
import { MushafBook } from './components/mushaf/MushafBook';
import { MushafCover } from './components/mushaf/MushafCover';
import { NavigationDrawer } from './components/navigation/NavigationDrawer';
import { ReadingSettings } from './components/settings/ReadingSettings';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useQuran } from './hooks/useQuran';
import type { QuranVerse } from './types/quran';
import {
  clampPage,
  isPageVisibleInSpread,
  parseVerseKey,
  TOTAL_MUSHAF_PAGES,
} from './utils/quranPagination';

export default function App() {
  const {
    surahs,
    surahsById,
    juzs,
    currentPage,
    isSpreadMode,
    pagesMap,
    loadingPages,
    pageError,
    bookmarks,
    lastRead,
    settings,
    goToPage,
    goToSurah,
    goToJuz,
    goToHizb,
    goToRub,
    goToVerse,
    ensurePageLoaded,
    togglePageBookmark,
    removeBookmark,
    updateSettings,
  } = useQuran();

  const [isBookOpen, setIsBookOpen] = useState(false);
  const [isOpeningCover, setIsOpeningCover] = useState(false);
  const [openingTargetPage, setOpeningTargetPage] = useState<number | null>(null);
  const [justOpened, setJustOpened] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hifzPanelOpen, setHifzPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quickPageInput, setQuickPageInput] = useState(String(currentPage));
  const [pendingPlayVerse, setPendingPlayVerse] = useState<{
    surahId: number;
    verseNumber: number;
    verseKey: string;
  } | null>(null);

  useEffect(() => {
    setQuickPageInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      void document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleAudioVersePageRequest = useCallback(
    (targetPage: number) => {
      if (!isBookOpen) {
        setIsBookOpen(true);
      }
      if (!isPageVisibleInSpread(targetPage, currentPage, isSpreadMode)) {
        goToPage(targetPage);
      }
    },
    [isBookOpen, currentPage, isSpreadMode, goToPage],
  );

  const audio = useAudioPlayer({
    onVersePageRequest: handleAudioVersePageRequest,
  });

  const handleOpenBookAt = useCallback(
    (page: number) => {
      if (isOpeningCover) return;
      const clamped = clampPage(page);
      goToPage(clamped);
      setOpeningTargetPage(clamped);
      setIsOpeningCover(true);
    },
    [goToPage, isOpeningCover],
  );

  const handleCoverOpenComplete = useCallback(() => {
    setJustOpened(true);
    setIsBookOpen(true);
    setIsOpeningCover(false);
    setOpeningTargetPage(null);
  }, []);

  const handleCloseToCover = useCallback(() => {
    setIsBookOpen(false);
    setIsOpeningCover(false);
    setOpeningTargetPage(null);
    setJustOpened(false);
  }, []);

  const handleQuickPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(quickPageInput);
    if (Number.isFinite(num) && num >= 1 && num <= TOTAL_MUSHAF_PAGES) {
      goToPage(clampPage(num));
      if (!isBookOpen) setIsBookOpen(true);
    } else {
      setQuickPageInput(String(currentPage));
    }
  };

  const currentPageData = pagesMap[currentPage];
  const currentFirstVerse = currentPageData?.verses[0];
  const currentPageSurahId = currentFirstVerse
    ? parseVerseKey(currentFirstVerse.verse_key).surahId
    : 1;
  const currentPageFirstVerseNum = currentFirstVerse?.verse_number ?? 1;
  const currentSurah = surahsById[currentPageSurahId];

  const isNight = settings.theme === 'night';

  return (
    <div className="app-shell">
      {/* A. HEADER — Barre supérieure compacte à 3 zones */}
      <header className="app-header">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-12 flex items-center justify-between gap-4">
          {/* Gauche : Logo AL-QURAN + nom secondaire */}
          <button
            type="button"
            onClick={() => {
              if (isBookOpen) handleCloseToCover();
            }}
            className="flex items-baseline gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[var(--mushaf-ink)]">
              AL-QURAN
            </span>
            <span className="hidden sm:inline text-[11px] font-medium text-[var(--mushaf-ink-muted)] tracking-wide">
              The Digital Mushaf
            </span>
          </button>

          {/* Centre : Sourate ouverte · Page X / 604 · Juz Y */}
          {isBookOpen ? (
            <div className="hidden md:flex items-center gap-2.5 text-xs text-[var(--mushaf-ink-muted)] min-w-0">
              <span className="font-medium text-[var(--mushaf-ink)] truncate">
                {currentSurah
                  ? `${currentSurah.id}. ${currentSurah.name_simple}`
                  : 'Mushaf de Médine'}
              </span>
              <span aria-hidden="true">·</span>
              <form
                onSubmit={handleQuickPageSubmit}
                className="inline-flex items-center gap-1"
              >
                <label htmlFor="topbar-page-input" className="sr-only">
                  Numéro de page
                </label>
                <span>Page</span>
                <input
                  id="topbar-page-input"
                  type="number"
                  min={1}
                  max={TOTAL_MUSHAF_PAGES}
                  value={quickPageInput}
                  onChange={(e) => setQuickPageInput(e.target.value)}
                  onBlur={handleQuickPageSubmit}
                  className="w-12 px-1 py-0.5 rounded border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-center text-xs font-medium text-[var(--mushaf-ink)] tabular-nums"
                />
                <span className="tabular-nums">/ {TOTAL_MUSHAF_PAGES}</span>
              </form>
              {currentPageData && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums whitespace-nowrap">
                    Juz {currentPageData.juzNumber}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-[var(--mushaf-ink-muted)]">
              <span>Mushaf de Médine</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">604 Pages · 114 Sourates</span>
            </div>
          )}

          {/* Droite : Couverture · Mode nuit · Plein écran · Paramètres · Index */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {isBookOpen && (
              <button
                type="button"
                onClick={handleCloseToCover}
                title="Revenir à la couverture"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Couverture</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => updateSettings({ theme: isNight ? 'day' : 'night' })}
              title={isNight ? 'Passer en mode jour' : 'Passer en mode nuit'}
              aria-label={isNight ? 'Passer en mode jour' : 'Passer en mode nuit'}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] transition-colors cursor-pointer"
            >
              {isNight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="Paramètres de lecture et traductions"
              aria-label="Ouvrir les paramètres"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--mushaf-border)] text-xs font-medium text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paramètres</span>
            </button>

            <button
              type="button"
              onClick={() => setNavDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0d4a34] hover:bg-[#0a3b29] text-[#faf6ec] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {bookmarks.length > 0 ? (
                <BookMarked className="w-3.5 h-3.5" />
              ) : (
                <Compass className="w-3.5 h-3.5" />
              )}
              <span>Index</span>
            </button>
          </div>
        </div>
      </header>

      {/* B. MUSHAF VIEWER — Zone centrale prioritaire, centrée et strictement bornée */}
      <main className="mushaf-viewport">
        {!isBookOpen ? (
          <MushafCover
            isOpening={isOpeningCover}
            targetPage={openingTargetPage ?? 1}
            targetPageData={pagesMap[openingTargetPage ?? 1]}
            lastRead={lastRead}
            surahsById={surahsById}
            onOpenFresh={() => handleOpenBookAt(1)}
            onResumeLastRead={() => handleOpenBookAt(lastRead?.pageNumber ?? 1)}
            onOpenAnimationComplete={handleCoverOpenComplete}
          />
        ) : (
          <MushafBook
            currentPage={currentPage}
            isSpreadMode={isSpreadMode}
            justOpened={justOpened}
            pagesMap={pagesMap}
            loadingPages={loadingPages}
            pageError={pageError}
            surahsById={surahsById}
            settings={settings}
            activeVerseKey={audio.sync.activeVerseKey}
            activeWordPosition={audio.sync.activeWordPosition}
            bookmarks={bookmarks}
            defaultRepeatCount={audio.hifzConfig.repeatCount}
            onGoToPage={goToPage}
            onRetryLoadPage={(p) => {
              void ensurePageLoaded(p);
            }}
            onToggleBookmark={togglePageBookmark}
            onSelectedVerseChange={(verse: QuranVerse | null) => {
              if (!verse) {
                setPendingPlayVerse(null);
              } else {
                const parsed = parseVerseKey(verse.verse_key);
                setPendingPlayVerse({
                  surahId: parsed.surahId,
                  verseNumber: parsed.verseNumber,
                  verseKey: verse.verse_key,
                });
              }
            }}
            onRepeatVerse={(surahId, verseNum, count) => {
              setPendingPlayVerse(null);
              audio.repeatSpecificVerse(surahId, verseNum, count);
            }}
          />
        )}
      </main>

      {/* D. AUDIO PLAYER — Lecteur audio fixe en bas dans sa propre zone */}
      {isBookOpen && (
        <motion.div
          initial={justOpened ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="shrink-0 z-30"
        >
          <QuranAudioPlayer
            surahs={surahs}
            reciters={audio.reciters}
            recitersLoading={audio.recitersLoading}
            activeReciter={audio.activeReciter}
            activeSurahId={audio.activeSurahId}
            currentPageSurahId={currentPageSurahId}
            currentPageFirstVerseNumber={currentPageFirstVerseNum}
            isPlaying={audio.isPlaying}
            isBuffering={audio.isBuffering}
            audioError={audio.audioError}
            currentTime={audio.currentTime}
            duration={audio.duration}
            volume={audio.volume}
            isMuted={audio.isMuted}
            playbackRate={audio.playbackRate}
            repeatMode={audio.repeatMode}
            continuousPlay={audio.continuousPlay}
            hifzConfig={audio.hifzConfig}
            hifzSession={audio.hifzSession}
            sync={audio.sync}
            pendingPlayVerseKey={!audio.isPlaying ? pendingPlayVerse?.verseKey ?? null : null}
            onPlaySurah={(sId, vNum) => {
              setPendingPlayVerse(null);
              audio.playFromVerse(sId, vNum ?? 1);
            }}
            onTogglePlayPause={() => {
              if (!audio.isPlaying && pendingPlayVerse) {
                const target = pendingPlayVerse;
                setPendingPlayVerse(null);
                audio.playFromVerse(target.surahId, target.verseNumber);
                return;
              }
              audio.togglePlayPause(currentPageSurahId, currentPageFirstVerseNum);
            }}
            onStop={audio.stop}
            onRestartCurrentVerse={audio.restartCurrentVerse}
            onPrevVerse={audio.prevVerse}
            onNextVerse={audio.nextVerse}
            onSelectReciter={audio.selectReciter}
            onSeek={audio.seekToTime}
            onChangeVolume={audio.setVolume}
            onToggleMute={audio.toggleMute}
            onChangePlaybackRate={audio.setPlaybackRate}
            onApplyRepeatMode={audio.applyRepeatMode}
            onUpdateHifzConfig={audio.updateHifzConfig}
            onSetVerseRepeatGoal={audio.setVerseRepeatGoal}
            onRepeatSpecificVerse={audio.repeatSpecificVerse}
            onStartHifz={() => audio.startHifzSession()}
            onOpenHifzPanel={() => setHifzPanelOpen(true)}
            onToggleContinuousPlay={() => audio.setContinuousPlay((prev) => !prev)}
          />
        </motion.div>
      )}

      {/* Mode Hifz Panel */}
      <HifzPanel
        isOpen={hifzPanelOpen}
        onClose={() => setHifzPanelOpen(false)}
        surahs={surahs}
        reciters={audio.reciters}
        hifzConfig={audio.hifzConfig}
        hifzSession={audio.hifzSession}
        savedHifz={audio.savedHifz}
        onUpdateConfig={audio.updateHifzConfig}
        onSelectReciter={audio.selectReciter}
        onStartSession={(override, resumeV, resumeRep) => {
          if (!isBookOpen) setIsBookOpen(true);
          audio.startHifzSession(override, resumeV, resumeRep);
        }}
        onPauseSession={audio.pauseSession}
        onResumeSession={audio.resumeSession}
        onStopSession={audio.stop}
        onRestartCurrentVerse={audio.restartCurrentVerse}
        onPrevVerse={audio.prevVerse}
        onNextVerse={audio.nextVerse}
      />

      {/* Drawers (Index complet & Paramètres de lecture) */}
      <NavigationDrawer
        isOpen={navDrawerOpen}
        onClose={() => setNavDrawerOpen(false)}
        surahs={surahs}
        surahsById={surahsById}
        juzs={juzs}
        currentPage={currentPage}
        bookmarks={bookmarks}
        lastRead={lastRead}
        onGoToPage={(p) => {
          goToPage(p);
          if (!isBookOpen) setIsBookOpen(true);
        }}
        onGoToSurah={(id) => {
          goToSurah(id);
          if (!isBookOpen) setIsBookOpen(true);
        }}
        onGoToJuz={async (j) => {
          await goToJuz(j);
          if (!isBookOpen) setIsBookOpen(true);
        }}
        onGoToHizb={async (h) => {
          await goToHizb(h);
          if (!isBookOpen) setIsBookOpen(true);
        }}
        onGoToRub={async (r) => {
          await goToRub(r);
          if (!isBookOpen) setIsBookOpen(true);
        }}
        onGoToVerse={async (s, v) => {
          await goToVerse(s, v);
          if (!isBookOpen) setIsBookOpen(true);
        }}
        onPlayVerse={(s, v) => {
          if (!isBookOpen) setIsBookOpen(true);
          audio.playFromVerse(s, v);
        }}
        onRemoveBookmark={removeBookmark}
      />

      <ReadingSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
}
