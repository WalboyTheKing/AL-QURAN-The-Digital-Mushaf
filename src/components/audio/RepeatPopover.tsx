import { BookOpenCheck, Infinity as InfinityIcon, Play, X } from 'lucide-react';
import {
  type AfterVerseRepeatAction,
  type HifzConfig,
  normalizeRepeatCount,
  type PauseDelaySeconds,
  type RangeRepeatStrategy,
  type RepeatCountOption,
  type RepeatMode,
} from '../../types/audio';
import type { Surah } from '../../types/quran';

interface RepeatPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  surahs: Surah[];
  repeatMode: RepeatMode;
  hifzConfig: HifzConfig;
  currentVerseNumber: number;
  currentSurahId: number;
  onApplyRepeat: (
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
  onUpdateConfig: (patch: Partial<HifzConfig>) => void;
  onSetVerseRepeatGoal: (count: number | 'infinite') => void;
  onRepeatSpecificVerse: (
    surahId: number,
    verseNumber: number,
    count: number | 'infinite',
  ) => void;
  onStartHifz: () => void;
  onOpenHifzPanel: () => void;
}

const REPEAT_PRESETS: Array<{ value: number; label: string }> = [
  { value: 1, label: '1×' },
  { value: 3, label: '3×' },
  { value: 5, label: '5×' },
  { value: 7, label: '7×' },
  { value: 10, label: '10×' },
  { value: 20, label: '20×' },
  { value: 50, label: '50×' },
];

const PAUSE_OPTIONS: Array<{ value: PauseDelaySeconds; label: string }> = [
  { value: 0, label: 'Sans pause' },
  { value: 2, label: '2 s' },
  { value: 3, label: '3 s' },
  { value: 5, label: '5 s' },
  { value: 10, label: '10 s' },
];

export function RepeatPopover({
  isOpen,
  onClose,
  surahs,
  repeatMode,
  hifzConfig,
  currentVerseNumber,
  currentSurahId,
  onApplyRepeat,
  onUpdateConfig,
  onSetVerseRepeatGoal,
  onRepeatSpecificVerse,
  onStartHifz,
  onOpenHifzPanel,
}: RepeatPopoverProps) {
  if (!isOpen) return null;

  const selectedSurah = surahs.find((s) => s.id === hifzConfig.surahId);
  const maxVerse = selectedSurah?.verses_count ?? 286;
  const isInfinite = hifzConfig.repeatCount === 0;

  return (
    <div className="absolute bottom-full right-3 sm:right-6 mb-2 z-50 w-[min(94vw,430px)] rounded-xl border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] shadow-2xl p-4 text-xs">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[var(--mushaf-border)]">
        <span className="font-display text-lg font-semibold text-[var(--mushaf-ink)]">
          Objectif de répétition & mémorisation
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer les options de répétition"
          className="p-1 rounded text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3.5 max-h-[62dvh] overflow-y-auto mushaf-scroll pr-0.5">
        {/* Repeat Mode */}
        <div>
          <span className="block text-[11px] font-medium text-[var(--mushaf-ink-muted)] mb-1.5">
            Mode de répétition
          </span>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[var(--mushaf-paper-edge)]">
            {(
              [
                ['none', 'Désactivé'],
                ['verse', 'Verset'],
                ['range', 'Plage'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  onApplyRepeat(mode, {
                    surahId: mode === 'verse' ? currentSurahId : hifzConfig.surahId,
                    startVerse:
                      mode === 'verse' ? currentVerseNumber : hifzConfig.startVerse,
                    endVerse:
                      mode === 'verse' ? currentVerseNumber : hifzConfig.endVerse,
                  })
                }
                className={`py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  repeatMode === mode
                    ? 'bg-[var(--mushaf-paper)] text-[var(--mushaf-ink)] shadow-sm'
                    : 'text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Repetition Count: Presets + Custom Number + Indefinite */}
        <div className="space-y-2">
          <span className="block text-[11px] font-medium text-[var(--mushaf-ink-muted)]">
            Nombre de répétitions (objectif de mémorisation)
          </span>

          <div className="flex flex-wrap gap-1.5">
            {REPEAT_PRESETS.map((opt) => {
              const active = !isInfinite && hifzConfig.repeatCount === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSetVerseRepeatGoal(opt.value)}
                  className={`px-2.5 py-1 rounded-md border font-medium tabular-nums transition-colors cursor-pointer ${
                    active
                      ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
                      : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onSetVerseRepeatGoal('infinite')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                isInfinite
                  ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
                  : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)]'
              }`}
            >
              <InfinityIcon className="w-3.5 h-3.5" />
              <span>Indéfiniment</span>
            </button>
          </div>

          {/* Custom Exact Count */}
          <div className="flex items-center gap-2 pt-0.5">
            <label
              htmlFor="custom-repeat-count"
              className="text-[11px] text-[var(--mushaf-ink-muted)] whitespace-nowrap"
            >
              Nombre personnalisé :
            </label>
            <input
              id="custom-repeat-count"
              type="number"
              min={1}
              max={999}
              placeholder="ex: 15"
              value={isInfinite ? '' : hifzConfig.repeatCount}
              onChange={(e) => {
                const raw = Number(e.target.value);
                if (Number.isFinite(raw) && raw >= 1) {
                  onSetVerseRepeatGoal(normalizeRepeatCount(raw));
                }
              }}
              className="w-20 px-2 py-1 rounded-md border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-xs text-[var(--mushaf-ink)] tabular-nums"
            />
            <span className="text-[11px] text-[var(--mushaf-ink-muted)]">
              {isInfinite ? '(∞ en continu)' : 'fois'}
            </span>
          </div>
        </div>

        {/* Single-verse end action */}
        {repeatMode === 'verse' && !isInfinite && (
          <div>
            <span className="block text-[11px] font-medium text-[var(--mushaf-ink-muted)] mb-1.5">
              Une fois l’objectif atteint
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateConfig({ afterSingleVerseAction: 'stop' })}
                className={`py-1.5 px-2 rounded-md border font-medium transition-colors cursor-pointer ${
                  hifzConfig.afterSingleVerseAction === 'stop'
                    ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
                    : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink-muted)]'
                }`}
              >
                Arrêter la lecture
              </button>
              <button
                type="button"
                onClick={() => onUpdateConfig({ afterSingleVerseAction: 'next' })}
                className={`py-1.5 px-2 rounded-md border font-medium transition-colors cursor-pointer ${
                  hifzConfig.afterSingleVerseAction === 'next'
                    ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
                    : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink-muted)]'
                }`}
              >
                Verset suivant
              </button>
            </div>
          </div>
        )}

        {/* Range Options */}
        {repeatMode === 'range' && (
          <div className="space-y-2.5 pt-1 border-t border-[var(--mushaf-border)]">
            <div>
              <label
                htmlFor="repeat-surah"
                className="block text-[11px] font-medium text-[var(--mushaf-ink-muted)] mb-1"
              >
                Sourate de la plage
              </label>
              <select
                id="repeat-surah"
                value={hifzConfig.surahId}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  const s = surahs.find((item) => item.id === newId);
                  onUpdateConfig({
                    surahId: newId,
                    startVerse: 1,
                    endVerse: Math.min(5, s?.verses_count ?? 7),
                  });
                }}
                className="w-full px-2.5 py-1.5 rounded-md border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-xs text-[var(--mushaf-ink)]"
              >
                {surahs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}. {s.name_simple} ({s.verses_count} v.)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="repeat-start"
                  className="block text-[11px] text-[var(--mushaf-ink-muted)] mb-1"
                >
                  Début
                </label>
                <input
                  id="repeat-start"
                  type="number"
                  min={1}
                  max={maxVerse}
                  value={hifzConfig.startVerse}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(maxVerse, Number(e.target.value) || 1));
                    onUpdateConfig({
                      startVerse: v,
                      endVerse: Math.max(v, hifzConfig.endVerse),
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-xs tabular-nums"
                />
              </div>
              <div>
                <label
                  htmlFor="repeat-end"
                  className="block text-[11px] text-[var(--mushaf-ink-muted)] mb-1"
                >
                  Fin
                </label>
                <input
                  id="repeat-end"
                  type="number"
                  min={hifzConfig.startVerse}
                  max={maxVerse}
                  value={hifzConfig.endVerse}
                  onChange={(e) => {
                    const v = Math.max(
                      hifzConfig.startVerse,
                      Math.min(maxVerse, Number(e.target.value) || hifzConfig.startVerse),
                    );
                    onUpdateConfig({ endVerse: v });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-xs tabular-nums"
                />
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-medium text-[var(--mushaf-ink-muted)] mb-1.5">
                Stratégie de plage
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ strategy: 'individual' })}
                  className={`py-1.5 px-2 rounded-md border text-left transition-colors cursor-pointer ${
                    hifzConfig.strategy === 'individual'
                      ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)] font-medium'
                      : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink-muted)]'
                  }`}
                >
                  Mode A · Verset par verset
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ strategy: 'sequence' })}
                  className={`py-1.5 px-2 rounded-md border text-left transition-colors cursor-pointer ${
                    hifzConfig.strategy === 'sequence'
                      ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)] font-medium'
                      : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink-muted)]'
                  }`}
                >
                  Mode B · Séquence complète
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pause Delay */}
        <div>
          <span className="block text-[11px] font-medium text-[var(--mushaf-ink-muted)] mb-1.5">
            Pause après chaque verset
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PAUSE_OPTIONS.map((opt) => {
              const active = hifzConfig.pauseSeconds === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdateConfig({ pauseSeconds: opt.value })}
                  className={`px-2.5 py-1 rounded-md border font-medium tabular-nums transition-colors cursor-pointer ${
                    active
                      ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
                      : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-[var(--mushaf-border)] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenHifzPanel();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--mushaf-gold)] hover:underline cursor-pointer"
          >
            <BookOpenCheck className="w-3.5 h-3.5" />
            <span>Ouvrir Mode Hifz</span>
          </button>

          {repeatMode === 'range' ? (
            <button
              type="button"
              onClick={() => {
                onStartHifz();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#0d4a34] hover:bg-[#0a3b29] text-[#faf6ec] text-xs font-medium cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>Démarrer la plage</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onRepeatSpecificVerse(
                  currentSurahId,
                  currentVerseNumber,
                  isInfinite ? 'infinite' : hifzConfig.repeatCount || 5,
                );
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#0d4a34] hover:bg-[#0a3b29] text-[#faf6ec] text-xs font-medium cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>
                Répéter v.{currentSurahId}:{currentVerseNumber} (
                {isInfinite ? '∞' : `${hifzConfig.repeatCount}×`})
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
