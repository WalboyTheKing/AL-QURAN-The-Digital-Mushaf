import { useEffect, useRef, useState } from 'react';
import {
  BookOpenCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  AfterVerseRepeatAction,
  HifzConfig,
  HifzSessionState,
  PauseDelaySeconds,
  RangeRepeatStrategy,
  ReciterInfo,
  RepeatCountOption,
  RepeatMode,
  SyncState,
} from '../../types/audio';
import type { Surah } from '../../types/quran';
import { parseVerseKey } from '../../utils/quranPagination';
import { AudioProgress } from './AudioProgress';
import { ReciterSelector } from './ReciterSelector';
import { RepeatPopover } from './RepeatPopover';

interface QuranAudioPlayerProps {
  surahs: Surah[];
  reciters: ReciterInfo[];
  recitersLoading: boolean;
  activeReciter: ReciterInfo | null;
  activeSurahId: number;
  currentPageSurahId: number;
  currentPageFirstVerseNumber: number;
  isPlaying: boolean;
  isBuffering: boolean;
  audioError: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  repeatMode: RepeatMode;
  continuousPlay: boolean;
  hifzConfig: HifzConfig;
  hifzSession: HifzSessionState;
  sync: SyncState;
  pendingPlayVerseKey?: string | null;
  onPlaySurah: (surahId: number, verseNumber?: number) => void;
  onTogglePlayPause: () => void;
  onStop: () => void;
  onRestartCurrentVerse: () => void;
  onPrevVerse: () => void;
  onNextVerse: () => void;
  onSelectReciter: (reciterId: string) => void;
  onSeek: (seconds: number) => void;
  onChangeVolume: (v: number) => void;
  onToggleMute: () => void;
  onChangePlaybackRate: (rate: number) => void;
  onApplyRepeatMode: (
    nextMode: RepeatMode,
    options?: {
      repeatCount?: RepeatCountOption;
      pauseSeconds?: PauseDelaySeconds;
      strategy?: RangeRepeatStrategy;
      surahId?: number;
      startVerse?: number;
      endVerse?: number;
      afterSingleVerseAction?: AfterVerseRepeatAction;
    },
  ) => void;
  onUpdateHifzConfig: (patch: Partial<HifzConfig>) => void;
  onSetVerseRepeatGoal: (count: number | 'infinite') => void;
  onRepeatSpecificVerse: (
    surahId: number,
    verseNumber: number,
    count: number | 'infinite',
  ) => void;
  onStartHifz: () => void;
  onOpenHifzPanel: () => void;
  onToggleContinuousPlay: () => void;
}

export function QuranAudioPlayer({
  surahs,
  reciters,
  recitersLoading,
  activeReciter,
  activeSurahId,
  currentPageSurahId,
  currentPageFirstVerseNumber,
  isPlaying,
  isBuffering,
  audioError,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  repeatMode,
  continuousPlay,
  hifzConfig,
  hifzSession,
  sync,
  pendingPlayVerseKey,
  onPlaySurah,
  onTogglePlayPause,
  onStop,
  onRestartCurrentVerse,
  onPrevVerse,
  onNextVerse,
  onSelectReciter,
  onSeek,
  onChangeVolume,
  onToggleMute,
  onChangePlaybackRate,
  onApplyRepeatMode,
  onUpdateHifzConfig,
  onSetVerseRepeatGoal,
  onRepeatSpecificVerse,
  onStartHifz,
  onOpenHifzPanel,
  onToggleContinuousPlay,
}: QuranAudioPlayerProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [repeatPopoverOpen, setRepeatPopoverOpen] = useState(false);
  const playerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!repeatPopoverOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (playerRef.current && !playerRef.current.contains(e.target as Node)) {
        setRepeatPopoverOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRepeatPopoverOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [repeatPopoverOpen]);

  const displayedSurahId =
    isPlaying || sync.activeVerseKey ? activeSurahId : currentPageSurahId;
  const activeSurah = surahs.find((s) => s.id === displayedSurahId);
  const currentVerseNumber = sync.activeVerseKey
    ? parseVerseKey(sync.activeVerseKey).verseNumber
    : currentPageFirstVerseNumber;

  const syncPrecisionLabel =
    activeReciter?.syncPrecision === 'word' ? 'Mot par mot' : 'Verset par verset';

  const showRepeatStrip =
    repeatMode !== 'none' ||
    hifzSession.status === 'playing' ||
    hifzSession.status === 'pausing_between' ||
    hifzSession.status === 'paused' ||
    hifzSession.status === 'completed';

  const sessionSurah = surahs.find((s) => s.id === hifzSession.surahId);
  const totalRangeVerses = Math.max(
    1,
    hifzSession.endVerse - hifzSession.startVerse + 1,
  );
  const currentRangeIdx = Math.max(
    1,
    Math.min(
      totalRangeVerses,
      hifzSession.currentVerseNumber - hifzSession.startVerse + 1,
    ),
  );

  return (
    <footer ref={playerRef} className="audio-player relative">
      {/* Repeat Configuration Popover anchored cleanly above audio bar */}
      <RepeatPopover
        isOpen={repeatPopoverOpen}
        onClose={() => setRepeatPopoverOpen(false)}
        surahs={surahs}
        repeatMode={repeatMode}
        hifzConfig={hifzConfig}
        currentVerseNumber={currentVerseNumber}
        currentSurahId={displayedSurahId}
        onApplyRepeat={onApplyRepeatMode}
        onUpdateConfig={onUpdateHifzConfig}
        onSetVerseRepeatGoal={onSetVerseRepeatGoal}
        onRepeatSpecificVerse={onRepeatSpecificVerse}
        onStartHifz={onStartHifz}
        onOpenHifzPanel={onOpenHifzPanel}
      />

      {/* Live Repetition & Hifz Counter Strip (never covers Mushaf pages) */}
      {showRepeatStrip && (
        <div className="border-b border-[var(--mushaf-border)] bg-[var(--mushaf-emerald-bg)]/55 px-3 sm:px-6 py-1">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
            <div className="flex flex-wrap items-center gap-2 text-[var(--mushaf-ink)] tabular-nums">
              <span className="font-semibold text-[var(--mushaf-emerald)]">
                {repeatMode === 'verse' ? 'Répétition verset' : 'Mode Hifz'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {sessionSurah?.name_simple ?? `Sourate ${hifzSession.surahId}`} — Verset{' '}
                <strong>
                  {hifzSession.surahId}:{hifzSession.currentVerseNumber}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Répétition{' '}
                <strong>
                  {hifzSession.currentRepetition} /{' '}
                  {hifzConfig.repeatCount === 0 ? '∞' : hifzConfig.repeatCount}
                </strong>
              </span>
              {repeatMode === 'range' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Progression :{' '}
                    <strong>
                      {currentRangeIdx} / {totalRangeVerses}
                    </strong>{' '}
                    verset{totalRangeVerses > 1 ? 's' : ''}
                  </span>
                </>
              )}
              {hifzSession.status === 'pausing_between' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-[var(--mushaf-gold)]">
                    Pause {hifzSession.pauseRemainingSec}s…
                  </span>
                </>
              )}
              {hifzSession.status === 'completed' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-[var(--mushaf-emerald)]">
                    Terminé
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onRestartCurrentVerse}
                title="Recommencer le verset actuel"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--mushaf-ink)] hover:text-[var(--mushaf-emerald)] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Recommencer</span>
              </button>
              <button
                type="button"
                onClick={onOpenHifzPanel}
                className="text-[11px] font-medium text-[var(--mushaf-gold)] hover:underline cursor-pointer"
              >
                Configurer
              </button>
              <button
                type="button"
                onClick={() => onApplyRepeatMode('none')}
                className="text-[11px] text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] cursor-pointer"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-2">
        {/* Mobile Compact Bar */}
        <div className="flex md:hidden items-center justify-between gap-2">
          <button
            type="button"
            onClick={onTogglePlayPause}
            aria-label={
              isPlaying
                ? 'Pause'
                : pendingPlayVerseKey
                  ? `Lire depuis le verset ${pendingPlayVerseKey}`
                  : 'Lire la récitation'
            }
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#0d4a34] text-[#faf6ec] shrink-0 cursor-pointer"
          >
            {isBuffering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--mushaf-ink)] truncate">
              <span className="truncate">
                {activeSurah ? `${activeSurah.id}. ${activeSurah.name_simple}` : 'Coran Audio'}
              </span>
              {sync.activeVerseKey && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[var(--mushaf-emerald)] tabular-nums shrink-0">
                    {sync.activeVerseKey}
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-[var(--mushaf-ink-muted)] truncate">
              {activeReciter?.name ?? 'Récitateur'} · {syncPrecisionLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenHifzPanel}
            className="inline-flex items-center gap-1 px-2.5 h-9 rounded-md border border-[var(--mushaf-border)] text-xs font-medium text-[var(--mushaf-emerald)] shrink-0 cursor-pointer"
          >
            <BookOpenCheck className="w-3.5 h-3.5" />
            <span>Hifz</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileExpanded((prev) => !prev)}
            aria-label={
              mobileExpanded ? 'Réduire les options audio' : 'Ouvrir les options audio'
            }
            className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-[var(--mushaf-border)] text-[var(--mushaf-ink)] shrink-0 cursor-pointer"
          >
            {mobileExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Desktop 2-Row Bar / Mobile Expanded Secondary Panel */}
        <div
          className={`${
            mobileExpanded
              ? 'mt-2.5 pt-2.5 border-t border-[var(--mushaf-border)] max-h-[42dvh] overflow-y-auto block space-y-2.5'
              : 'hidden md:block space-y-1.5'
          }`}
        >
          {/* ROW 1 (.audio-player-main): Left (Surah/Reciter/Sync/Verse) | Center (Transport) | Right (Répéter/Mode Hifz/Continu/Vitesse/Volume) */}
          <div className="audio-player-main flex-col md:flex-row">
            {/* Left Zone */}
            <div className="flex flex-wrap items-center gap-2 min-w-0 w-full md:w-auto">
              <select
                value={displayedSurahId}
                onChange={(e) => onPlaySurah(Number(e.target.value), 1)}
                aria-label="Sourate à réciter"
                className="px-2 py-1 rounded-md border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-xs font-medium text-[var(--mushaf-ink)] max-w-[165px] truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mushaf-gold)]"
              >
                {surahs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}. {s.name_simple}
                  </option>
                ))}
              </select>

              <ReciterSelector
                reciters={reciters}
                activeReciter={activeReciter}
                loading={recitersLoading}
                onSelectReciter={onSelectReciter}
              />

              <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-[var(--mushaf-ink-muted)] whitespace-nowrap">
                <span>{syncPrecisionLabel}</span>
                {!isPlaying && pendingPlayVerseKey ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[var(--mushaf-emerald)] tabular-nums">
                      Prêt : v. {pendingPlayVerseKey}
                    </span>
                  </>
                ) : (
                  sync.activeVerseKey && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[var(--mushaf-emerald)] tabular-nums">
                        Verset {sync.activeVerseKey}
                      </span>
                    </>
                  )
                )}
              </div>
            </div>

            {/* Center Zone: Transport Controls */}
            <div className="flex items-center justify-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onPrevVerse}
                title="Verset précédent"
                aria-label="Verset précédent"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper)] transition-colors cursor-pointer"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onTogglePlayPause}
                title={
                  isPlaying
                    ? 'Pause'
                    : pendingPlayVerseKey
                      ? `Lire depuis le verset ${pendingPlayVerseKey}`
                      : 'Lecture'
                }
                aria-label={
                  isPlaying
                    ? 'Mettre en pause'
                    : pendingPlayVerseKey
                      ? `Lire depuis le verset ${pendingPlayVerseKey}`
                      : 'Lire la récitation'
                }
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#0d4a34] hover:bg-[#0a3b29] text-[#faf6ec] shadow-sm transition-colors cursor-pointer"
              >
                {isBuffering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onStop}
                title="Arrêter"
                aria-label="Arrêter la récitation"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper)] transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onNextVerse}
                title="Verset suivant"
                aria-label="Verset suivant"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper)] transition-colors cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Right Zone: Répéter, Mode Hifz, Continu, Vitesse, Volume */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setRepeatPopoverOpen((prev) => !prev)}
                aria-expanded={repeatPopoverOpen}
                title="Configurer un nombre exact de répétitions ou une répétition illimitée"
                className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  repeatMode !== 'none'
                    ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
                    : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper)]'
                }`}
              >
                {repeatMode === 'verse' ? (
                  <Repeat1 className="w-3.5 h-3.5" />
                ) : (
                  <Repeat className="w-3.5 h-3.5" />
                )}
                <span>Répéter</span>
                {repeatMode !== 'none' && (
                  <span className="tabular-nums text-[11px]">
                    ({hifzConfig.repeatCount === 0 ? '∞' : `${hifzConfig.repeatCount}×`})
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRepeatPopoverOpen(false);
                  onOpenHifzPanel();
                }}
                title="Ouvrir l’espace de mémorisation (Mode Hifz)"
                className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  hifzSession.status !== 'idle' && repeatMode === 'range'
                    ? 'bg-[#0d4a34] text-[#faf6ec]'
                    : 'border border-[var(--mushaf-gold)]/50 text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper)]'
                }`}
              >
                <BookOpenCheck className="w-3.5 h-3.5 text-[var(--mushaf-gold)]" />
                <span>Mode Hifz</span>
              </button>

              <button
                type="button"
                onClick={onToggleContinuousPlay}
                title="Lecture continue d'une sourate à la suivante"
                className={`inline-flex items-center px-2 h-7 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  continuousPlay
                    ? 'bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
                    : 'text-[var(--mushaf-ink-muted)] hover:bg-[var(--mushaf-paper)]'
                }`}
              >
                Continu
              </button>

              <select
                value={playbackRate}
                onChange={(e) => onChangePlaybackRate(Number(e.target.value))}
                aria-label="Vitesse de lecture"
                className="px-1.5 h-7 rounded-md border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-xs font-medium text-[var(--mushaf-ink)] tabular-nums cursor-pointer"
              >
                <option value={0.75}>0.75×</option>
                <option value={1}>1×</option>
                <option value={1.25}>1.25×</option>
                <option value={1.5}>1.5×</option>
              </select>

              <div className="hidden lg:flex items-center gap-1 pl-1">
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onChangeVolume(Number(e.target.value))}
                  aria-label="Volume"
                  className="w-16 h-1.5 accent-[var(--mushaf-emerald)] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* ROW 2 (.audio-player-progress): Elapsed Time · Seekbar · Total Duration */}
          <div className="audio-player-progress">
            <AudioProgress
              currentTime={currentTime}
              duration={duration}
              disabled={activeReciter?.provider === 'islamicnetwork'}
              onSeek={onSeek}
            />
          </div>

          {audioError && (
            <p className="text-xs text-red-600 dark:text-red-400 text-center">
              {audioError}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
