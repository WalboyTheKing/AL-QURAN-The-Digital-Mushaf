import {
  BookOpenCheck,
  Infinity as InfinityIcon,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Square,
  X,
} from 'lucide-react';
import {
  type HifzConfig,
  type HifzSessionState,
  normalizeRepeatCount,
  type PauseDelaySeconds,
  type ReciterInfo,
  type SavedHifzProgress,
} from '../../types/audio';
import type { Surah } from '../../types/quran';

interface HifzPanelProps {
  isOpen: boolean;
  onClose: () => void;
  surahs: Surah[];
  reciters: ReciterInfo[];
  hifzConfig: HifzConfig;
  hifzSession: HifzSessionState;
  savedHifz: SavedHifzProgress | null;
  onUpdateConfig: (patch: Partial<HifzConfig>) => void;
  onSelectReciter: (reciterId: string) => void;
  onStartSession: (
    override?: Partial<HifzConfig>,
    resumeVerse?: number,
    resumeRep?: number,
  ) => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
  onStopSession: () => void;
  onRestartCurrentVerse: () => void;
  onPrevVerse: () => void;
  onNextVerse: () => void;
}

const REPEAT_CHOICES: Array<{ value: number; label: string }> = [
  { value: 1, label: '1' },
  { value: 3, label: '3' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
];

const PAUSE_CHOICES: Array<{ value: PauseDelaySeconds; label: string }> = [
  { value: 0, label: 'Sans pause' },
  { value: 2, label: '2 s' },
  { value: 3, label: '3 s' },
  { value: 5, label: '5 s' },
  { value: 10, label: '10 s' },
];

export function HifzPanel({
  isOpen,
  onClose,
  surahs,
  reciters,
  hifzConfig,
  hifzSession,
  savedHifz,
  onUpdateConfig,
  onSelectReciter,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onStopSession,
  onRestartCurrentVerse,
  onPrevVerse,
  onNextVerse,
}: HifzPanelProps) {
  if (!isOpen) return null;

  const selectedSurah = surahs.find((s) => s.id === hifzConfig.surahId);
  const maxVerse = selectedSurah?.verses_count ?? 286;

  const sessionSurah = surahs.find((s) => s.id === hifzSession.surahId);
  const totalVersesInRange = Math.max(
    1,
    hifzSession.endVerse - hifzSession.startVerse + 1,
  );
  const currentVerseIndex = Math.max(
    1,
    Math.min(
      totalVersesInRange,
      hifzSession.currentVerseNumber - hifzSession.startVerse + 1,
    ),
  );

  const isActive =
    hifzSession.status === 'playing' || hifzSession.status === 'pausing_between';
  const isPaused = hifzSession.status === 'paused';
  const isInfinite = hifzConfig.repeatCount === 0;

  const savedSurah = savedHifz
    ? surahs.find((s) => s.id === savedHifz.config.surahId)
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Mode Hifz — Mémorisation du Coran"
        className="relative z-10 flex flex-col w-full max-w-md h-full bg-[var(--mushaf-paper)] border-l border-[var(--mushaf-border)] shadow-2xl p-5 overflow-y-auto mushaf-scroll"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--mushaf-border)]">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-[var(--mushaf-emerald)]" />
            <div>
              <h2 className="font-display text-2xl font-semibold text-[var(--mushaf-ink)] leading-none">
                Mode Hifz
              </h2>
              <p className="text-[11px] text-[var(--mushaf-ink-muted)] mt-0.5">
                Espace de mémorisation et répétition guidée
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le mode Hifz"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Session Status Box */}
        <div className="mt-4 p-3.5 rounded-xl border border-[var(--mushaf-gold-soft)] bg-[var(--mushaf-paper-edge)]/65 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--mushaf-ink)]">
              {sessionSurah?.name_simple ?? `Sourate ${hifzSession.surahId}`} — Verset{' '}
              <span className="tabular-nums">
                {hifzSession.surahId}:{hifzSession.currentVerseNumber}
              </span>
            </span>
            <span className="text-[11px] font-medium text-[var(--mushaf-emerald)]">
              {hifzSession.status === 'playing' && 'En récitation'}
              {hifzSession.status === 'pausing_between' &&
                `Pause (${hifzSession.pauseRemainingSec}s)`}
              {hifzSession.status === 'paused' && 'En pause'}
              {hifzSession.status === 'completed' && 'Session terminée'}
              {hifzSession.status === 'idle' && 'Prêt'}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--mushaf-ink-muted)] tabular-nums">
            <span>
              Répétition :{' '}
              <strong className="text-[var(--mushaf-ink)]">
                {hifzSession.currentRepetition} /{' '}
                {isInfinite ? '∞ (Indéfini)' : hifzConfig.repeatCount}
              </strong>
            </span>
            <span>
              Progression :{' '}
              <strong className="text-[var(--mushaf-ink)]">
                {currentVerseIndex} / {totalVersesInRange} verset
                {totalVersesInRange > 1 ? 's' : ''}
              </strong>
            </span>
          </div>

          {/* Session Transport Controls */}
          <div className="pt-2 flex flex-wrap items-center gap-1.5">
            {!isActive && !isPaused && (
              <button
                type="button"
                onClick={() => onStartSession()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0d4a34] hover:bg-[#0a3b29] text-[#faf6ec] text-xs font-medium cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Démarrer</span>
              </button>
            )}

            {isActive && (
              <button
                type="button"
                onClick={onPauseSession}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0d4a34] hover:bg-[#0a3b29] text-[#faf6ec] text-xs font-medium cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            )}

            {isPaused && (
              <button
                type="button"
                onClick={onResumeSession}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0d4a34] hover:bg-[#0a3b29] text-[#faf6ec] text-xs font-medium cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Reprendre</span>
              </button>
            )}

            <button
              type="button"
              onClick={onStopSession}
              disabled={hifzSession.status === 'idle'}
              title="Arrêter la session"
              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[var(--mushaf-border)] hover:bg-[var(--mushaf-paper)] text-xs font-medium text-[var(--mushaf-ink)] disabled:opacity-40 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Arrêter</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-1.5 pt-1">
            <button
              type="button"
              onClick={onPrevVerse}
              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] hover:bg-[var(--mushaf-paper-edge)] text-[11px] font-medium text-[var(--mushaf-ink)] cursor-pointer"
            >
              <SkipBack className="w-3 h-3" />
              <span>Précédent</span>
            </button>

            <button
              type="button"
              onClick={onRestartCurrentVerse}
              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] hover:bg-[var(--mushaf-paper-edge)] text-[11px] font-medium text-[var(--mushaf-ink)] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Recommencer</span>
            </button>

            <button
              type="button"
              onClick={onNextVerse}
              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] hover:bg-[var(--mushaf-paper-edge)] text-[11px] font-medium text-[var(--mushaf-ink)] cursor-pointer"
            >
              <span>Suivant</span>
              <SkipForward className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Resume Last Saved Session */}
        {savedHifz && hifzSession.status === 'idle' && (
          <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-emerald-bg)]/50 text-xs">
            <div className="min-w-0">
              <div className="font-medium text-[var(--mushaf-ink)] truncate tabular-nums">
                Dernière session : {savedSurah?.name_simple ?? `S.${savedHifz.config.surahId}`} ·{' '}
                v.{savedHifz.currentVerseNumber} (plage {savedHifz.config.startVerse}–
                {savedHifz.config.endVerse})
              </div>
              <div className="text-[11px] text-[var(--mushaf-ink-muted)] tabular-nums">
                Répétition {savedHifz.currentRepetition} /{' '}
                {savedHifz.config.repeatCount === 0 ? '∞' : savedHifz.config.repeatCount}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onStartSession(
                  savedHifz.config,
                  savedHifz.currentVerseNumber,
                  savedHifz.currentRepetition,
                )
              }
              className="px-2.5 py-1.5 rounded-md bg-[#0d4a34] text-[#faf6ec] text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              Reprendre
            </button>
          </div>
        )}

        {/* Configuration Controls */}
        <div className="mt-5 space-y-4 text-xs">
          {/* Surah */}
          <div>
            <label
              htmlFor="hifz-surah"
              className="block font-medium text-[var(--mushaf-ink-muted)] mb-1"
            >
              Sourate
            </label>
            <select
              id="hifz-surah"
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
              className="w-full px-3 py-2 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-sm text-[var(--mushaf-ink)]"
            >
              {surahs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}. {s.name_simple} ({s.translated_name.name}) · {s.verses_count} v.
                </option>
              ))}
            </select>
          </div>

          {/* Start & End Verses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="hifz-start-verse"
                className="block font-medium text-[var(--mushaf-ink-muted)] mb-1 tabular-nums"
              >
                Premier verset (1–{maxVerse})
              </label>
              <input
                id="hifz-start-verse"
                type="number"
                min={1}
                max={maxVerse}
                value={hifzConfig.startVerse}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(maxVerse, Number(e.target.value) || 1));
                  onUpdateConfig({
                    startVerse: val,
                    endVerse: Math.max(val, hifzConfig.endVerse),
                  });
                }}
                className="w-full px-3 py-2 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-sm tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="hifz-end-verse"
                className="block font-medium text-[var(--mushaf-ink-muted)] mb-1 tabular-nums"
              >
                Dernier verset (1–{maxVerse})
              </label>
              <input
                id="hifz-end-verse"
                type="number"
                min={hifzConfig.startVerse}
                max={maxVerse}
                value={hifzConfig.endVerse}
                onChange={(e) => {
                  const val = Math.max(
                    hifzConfig.startVerse,
                    Math.min(maxVerse, Number(e.target.value) || hifzConfig.startVerse),
                  );
                  onUpdateConfig({ endVerse: val });
                }}
                className="w-full px-3 py-2 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-sm tabular-nums"
              />
            </div>
          </div>

          {/* Reciter */}
          <div>
            <label
              htmlFor="hifz-reciter"
              className="block font-medium text-[var(--mushaf-ink-muted)] mb-1"
            >
              Récitateur
            </label>
            <select
              id="hifz-reciter"
              value={hifzConfig.reciterId}
              onChange={(e) => {
                onUpdateConfig({ reciterId: e.target.value });
                onSelectReciter(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-sm text-[var(--mushaf-ink)]"
            >
              {reciters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.style ? ` (${r.style})` : ''} —{' '}
                  {r.syncPrecision === 'word' ? 'Mot/mot' : 'Verset'}
                </option>
              ))}
            </select>
          </div>

          {/* Strategy: Individual vs Sequence */}
          <div>
            <span className="block font-medium text-[var(--mushaf-ink-muted)] mb-1.5">
              Mode de mémorisation
            </span>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => onUpdateConfig({ strategy: 'individual' })}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                  hifzConfig.strategy === 'individual'
                    ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-ink)]'
                    : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink-muted)] hover:bg-[var(--mushaf-paper-edge)]/60'
                }`}
              >
                <div className="font-semibold text-[var(--mushaf-ink)]">
                  Mode A — Répétition individuelle
                </div>
                <div className="text-[11px] text-[var(--mushaf-ink-muted)] mt-0.5">
                  Répète chaque verset N fois avant de passer au suivant (ex : v.1 × 10, puis v.2 × 10).
                </div>
              </button>

              <button
                type="button"
                onClick={() => onUpdateConfig({ strategy: 'sequence' })}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                  hifzConfig.strategy === 'sequence'
                    ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-ink)]'
                    : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink-muted)] hover:bg-[var(--mushaf-paper-edge)]/60'
                }`}
              >
                <div className="font-semibold text-[var(--mushaf-ink)]">
                  Mode B — Répétition de la séquence
                </div>
                <div className="text-[11px] text-[var(--mushaf-ink-muted)] mt-0.5">
                  Lit toute la plage de versets dans l’ordre puis recommence la séquence N fois.
                </div>
              </button>
            </div>
          </div>

          {/* Number of Repetitions: Presets + Custom Number + Indefinite */}
          <div className="space-y-2">
            <span className="block font-medium text-[var(--mushaf-ink-muted)]">
              Objectif de répétitions par verset / séquence
            </span>
            <div className="flex flex-wrap gap-1.5">
              {REPEAT_CHOICES.map((opt) => {
                const active = !isInfinite && hifzConfig.repeatCount === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdateConfig({ repeatCount: opt.value })}
                    className={`px-3 py-1.5 rounded-md border font-medium tabular-nums transition-colors cursor-pointer ${
                      active
                        ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
                        : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)]'
                    }`}
                  >
                    {opt.label}×
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => onUpdateConfig({ repeatCount: 0 })}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md border font-medium transition-colors cursor-pointer ${
                  isInfinite
                    ? 'border-[var(--mushaf-emerald)] bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
                    : 'border-[var(--mushaf-border)] text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)]'
                }`}
              >
                <InfinityIcon className="w-3.5 h-3.5" />
                <span>Indéfiniment</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="hifz-custom-repeat"
                className="text-[11px] text-[var(--mushaf-ink-muted)] whitespace-nowrap"
              >
                Objectif personnalisé :
              </label>
              <input
                id="hifz-custom-repeat"
                type="number"
                min={1}
                max={999}
                placeholder="ex: 15"
                value={isInfinite ? '' : hifzConfig.repeatCount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val) && val >= 1) {
                    onUpdateConfig({ repeatCount: normalizeRepeatCount(val) });
                  }
                }}
                className="w-20 px-2.5 py-1.5 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-xs tabular-nums"
              />
              <span className="text-[11px] text-[var(--mushaf-ink-muted)]">
                {isInfinite ? 'Mode boucle infinie (∞)' : 'répétitions'}
              </span>
            </div>
          </div>

          {/* Pause Delay */}
          <div>
            <span className="block font-medium text-[var(--mushaf-ink-muted)] mb-1.5">
              Pause après chaque verset
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PAUSE_CHOICES.map((opt) => {
                const active = hifzConfig.pauseSeconds === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdateConfig({ pauseSeconds: opt.value })}
                    className={`px-3 py-1.5 rounded-md border font-medium tabular-nums transition-colors cursor-pointer ${
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
        </div>
      </aside>
    </div>
  );
}
