import { formatAudioTime } from '../../utils/audioTimestamps';

interface AudioProgressProps {
  currentTime: number;
  duration: number;
  disabled?: boolean;
  onSeek: (seconds: number) => void;
}

export function AudioProgress({
  currentTime,
  duration,
  disabled,
  onSeek,
}: AudioProgressProps) {
  const safeDuration = duration > 0 ? duration : 0;
  const percent = safeDuration > 0 ? Math.min(100, (currentTime / safeDuration) * 100) : 0;

  return (
    <div className="flex items-center gap-2.5 w-full">
      <span className="text-[11px] text-[var(--mushaf-ink-muted)] tabular-nums w-11 text-right shrink-0">
        {formatAudioTime(currentTime)}
      </span>

      <div className="relative flex-1 flex items-center">
        <input
          type="range"
          min={0}
          max={safeDuration || 100}
          step={0.1}
          value={safeDuration > 0 ? currentTime : 0}
          disabled={disabled || safeDuration === 0}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Progression de la récitation"
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--mushaf-emerald)] bg-[var(--mushaf-border)] disabled:opacity-40"
          style={{
            background: `linear-gradient(to right, var(--mushaf-emerald) ${percent}%, var(--mushaf-border) ${percent}%)`,
          }}
        />
      </div>

      <span className="text-[11px] text-[var(--mushaf-ink-muted)] tabular-nums w-11 shrink-0">
        {formatAudioTime(safeDuration)}
      </span>
    </div>
  );
}
