import {
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { RepeatMode } from '../../types/audio';

interface AudioControlsProps {
  isPlaying: boolean;
  isBuffering: boolean;
  repeatMode: RepeatMode;
  rangeBounds: { start: number; end: number };
  maxVerseInSurah: number;
  continuousPlay: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  onTogglePlayPause: () => void;
  onStop: () => void;
  onPrevVerse: () => void;
  onNextVerse: () => void;
  onCycleRepeatMode: () => void;
  onChangeRangeBounds: (bounds: { start: number; end: number }) => void;
  onToggleContinuousPlay: () => void;
  onChangePlaybackRate: (rate: number) => void;
  onChangeVolume: (volume: number) => void;
  onToggleMute: () => void;
}

export function AudioControls({
  isPlaying,
  isBuffering,
  repeatMode,
  rangeBounds,
  maxVerseInSurah,
  continuousPlay,
  playbackRate,
  volume,
  isMuted,
  onTogglePlayPause,
  onStop,
  onPrevVerse,
  onNextVerse,
  onCycleRepeatMode,
  onChangeRangeBounds,
  onToggleContinuousPlay,
  onChangePlaybackRate,
  onChangeVolume,
  onToggleMute,
}: AudioControlsProps) {
  const safeMax = Math.max(1, maxVerseInSurah);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      {/* Previous Verse */}
      <button
        type="button"
        onClick={onPrevVerse}
        title="Verset précédent"
        aria-label="Verset précédent"
        className="inline-flex items-center justify-center w-9 h-9 rounded-md text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] transition-colors cursor-pointer"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* Play / Pause */}
      <button
        type="button"
        onClick={onTogglePlayPause}
        title={isPlaying ? 'Pause' : 'Lecture'}
        aria-label={isPlaying ? 'Mettre en pause' : 'Lire la récitation'}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#0d4a34] hover:bg-[#0a3b29] text-[#faf6ec] shadow-sm transition-colors cursor-pointer"
      >
        {isBuffering ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Stop */}
      <button
        type="button"
        onClick={onStop}
        title="Arrêter"
        aria-label="Arrêter la récitation"
        className="inline-flex items-center justify-center w-9 h-9 rounded-md text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] transition-colors cursor-pointer"
      >
        <Square className="w-3.5 h-3.5" />
      </button>

      {/* Next Verse */}
      <button
        type="button"
        onClick={onNextVerse}
        title="Verset suivant"
        aria-label="Verset suivant"
        className="inline-flex items-center justify-center w-9 h-9 rounded-md text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] transition-colors cursor-pointer"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* Repeat Cycle: None -> Verse -> Range */}
      <button
        type="button"
        onClick={onCycleRepeatMode}
        title={
          repeatMode === 'none'
            ? 'Répétition désactivée'
            : repeatMode === 'verse'
              ? 'Répéter le verset actif'
              : 'Répéter une plage de versets'
        }
        aria-label="Changer le mode de répétition"
        className={`inline-flex items-center gap-1 px-2.5 h-8 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          repeatMode !== 'none'
            ? 'bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
            : 'text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)]'
        }`}
      >
        {repeatMode === 'verse' ? (
          <Repeat1 className="w-3.5 h-3.5" />
        ) : (
          <Repeat className="w-3.5 h-3.5" />
        )}
        <span className="hidden xl:inline">
          {repeatMode === 'none'
            ? 'Répéter'
            : repeatMode === 'verse'
              ? 'Verset'
              : 'Plage'}
        </span>
      </button>

      {/* Range bounds inputs when repeatMode === 'range' */}
      {repeatMode === 'range' && (
        <div className="flex items-center gap-1 text-xs text-[var(--mushaf-ink)] tabular-nums">
          <input
            type="number"
            min={1}
            max={safeMax}
            value={rangeBounds.start}
            onChange={(e) => {
              const val = Math.max(1, Math.min(safeMax, Number(e.target.value) || 1));
              onChangeRangeBounds({
                start: val,
                end: Math.max(val, rangeBounds.end),
              });
            }}
            aria-label="Premier verset de la plage"
            className="w-12 px-1.5 py-1 rounded border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-center text-xs"
          />
          <span aria-hidden="true">–</span>
          <input
            type="number"
            min={rangeBounds.start}
            max={safeMax}
            value={rangeBounds.end}
            onChange={(e) => {
              const val = Math.max(
                rangeBounds.start,
                Math.min(safeMax, Number(e.target.value) || rangeBounds.start),
              );
              onChangeRangeBounds({ start: rangeBounds.start, end: val });
            }}
            aria-label="Dernier verset de la plage"
            className="w-12 px-1.5 py-1 rounded border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-center text-xs"
          />
        </div>
      )}

      {/* Continuous play toggle */}
      <button
        type="button"
        onClick={onToggleContinuousPlay}
        title="Lecture continue d'une sourate à la suivante"
        className={`hidden sm:inline-flex items-center px-2.5 h-8 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          continuousPlay
            ? 'bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
            : 'text-[var(--mushaf-ink-muted)] hover:bg-[var(--mushaf-paper-edge)]'
        }`}
      >
        Continu
      </button>

      {/* Playback Speed */}
      <select
        value={playbackRate}
        onChange={(e) => onChangePlaybackRate(Number(e.target.value))}
        aria-label="Vitesse de lecture"
        className="hidden sm:block px-2 h-8 rounded-md border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-xs font-medium text-[var(--mushaf-ink)] tabular-nums cursor-pointer"
      >
        <option value={0.75}>0.75×</option>
        <option value={1}>1×</option>
        <option value={1.25}>1.25×</option>
        <option value={1.5}>1.5×</option>
      </select>

      {/* Volume */}
      <div className="hidden lg:flex items-center gap-1.5 pl-1">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] cursor-pointer"
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
  );
}
