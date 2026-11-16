import { Maximize2, Minimize2, X } from 'lucide-react';
import { AVAILABLE_TRANSLATIONS } from '../../services/quranApi';
import type { ReadingSettings as ReadingSettingsType } from '../../types/quran';
import { ThemeSelector } from './ThemeSelector';

interface ReadingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReadingSettingsType;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onUpdateSettings: (patch: Partial<ReadingSettingsType>) => void;
}

export function ReadingSettings({
  isOpen,
  onClose,
  settings,
  isFullscreen,
  onToggleFullscreen,
  onUpdateSettings,
}: ReadingSettingsProps) {
  if (!isOpen) return null;

  const toggleTranslation = (id: number) => {
    const exists = settings.translationIds.includes(id);
    const next = exists
      ? settings.translationIds.filter((item) => item !== id)
      : [...settings.translationIds, id];
    onUpdateSettings({
      translationIds: next.length > 0 ? next : [id],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Paramètres de lecture"
        className="relative z-10 flex flex-col w-full max-w-sm h-full bg-[var(--mushaf-paper)] border-l border-[var(--mushaf-border)] shadow-2xl p-5 overflow-y-auto mushaf-scroll"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--mushaf-border)]">
          <h2 className="font-display text-2xl font-semibold text-[var(--mushaf-ink)]">
            Confort de lecture
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les paramètres"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)] hover:bg-[var(--mushaf-paper-edge)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 py-4">
          {/* Theme */}
          <div>
            <span className="block text-xs font-medium text-[var(--mushaf-ink-muted)] mb-2">
              Thème visuel
            </span>
            <ThemeSelector
              theme={settings.theme}
              onChangeTheme={(theme) => onUpdateSettings({ theme })}
            />
          </div>

          {/* Brightness */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-[var(--mushaf-ink-muted)]">
                Luminosité du papier
              </span>
              <span className="tabular-nums text-[var(--mushaf-ink)]">
                {settings.brightness}%
              </span>
            </div>
            <input
              type="range"
              min={65}
              max={110}
              step={5}
              value={settings.brightness}
              onChange={(e) =>
                onUpdateSettings({ brightness: Number(e.target.value) })
              }
              aria-label="Luminosité du papier"
              className="w-full h-1.5 accent-[var(--mushaf-emerald)] cursor-pointer"
            />
          </div>

          {/* Reading Mode: Arabic Only vs Arabic + Translation */}
          <div>
            <span className="block text-xs font-medium text-[var(--mushaf-ink-muted)] mb-2">
              Mode d’affichage
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[var(--mushaf-paper-edge)]">
              <button
                type="button"
                onClick={() => onUpdateSettings({ readingMode: 'arabic' })}
                className={`py-2 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  settings.readingMode === 'arabic'
                    ? 'bg-[var(--mushaf-paper)] text-[var(--mushaf-ink)] shadow-sm'
                    : 'text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)]'
                }`}
              >
                Arabe seul (Mushaf)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ readingMode: 'translation' })}
                className={`py-2 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  settings.readingMode === 'translation'
                    ? 'bg-[var(--mushaf-paper)] text-[var(--mushaf-ink)] shadow-sm'
                    : 'text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)]'
                }`}
              >
                Arabe + Traduction
              </button>
            </div>
          </div>

          {/* Translations selection */}
          <div>
            <span className="block text-xs font-medium text-[var(--mushaf-ink-muted)] mb-2">
              Traductions disponibles
            </span>
            <div className="space-y-2">
              {AVAILABLE_TRANSLATIONS.map((tr) => {
                const checked = settings.translationIds.includes(tr.id);
                return (
                  <label
                    key={tr.id}
                    className="flex items-center gap-2.5 text-xs text-[var(--mushaf-ink)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTranslation(tr.id)}
                      className="w-4 h-4 rounded accent-[var(--mushaf-emerald)] cursor-pointer"
                    />
                    <span>{tr.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-[var(--mushaf-ink-muted)]">
                Taille de l’écriture arabe
              </span>
              <span className="tabular-nums text-[var(--mushaf-ink)]">
                {settings.arabicFontSize} px
              </span>
            </div>
            <input
              type="range"
              min={18}
              max={38}
              step={1}
              value={settings.arabicFontSize}
              onChange={(e) =>
                onUpdateSettings({ arabicFontSize: Number(e.target.value) })
              }
              aria-label="Taille de la police arabe"
              className="w-full h-1.5 accent-[var(--mushaf-emerald)] cursor-pointer"
            />
          </div>

          {/* Line Spacing */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-[var(--mushaf-ink-muted)]">
                Espacement des lignes
              </span>
              <span className="tabular-nums text-[var(--mushaf-ink)]">
                {settings.lineHeightScale.toFixed(1)}×
              </span>
            </div>
            <input
              type="range"
              min={1.6}
              max={2.5}
              step={0.1}
              value={settings.lineHeightScale}
              onChange={(e) =>
                onUpdateSettings({ lineHeightScale: Number(e.target.value) })
              }
              aria-label="Espacement des lignes"
              className="w-full h-1.5 accent-[var(--mushaf-emerald)] cursor-pointer"
            />
          </div>

          {/* Show Verse Numbers */}
          <div className="flex items-center justify-between py-2 border-t border-[var(--mushaf-border)]">
            <span className="text-xs font-medium text-[var(--mushaf-ink)]">
              Numéros des versets (﴿١﴾)
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ showVerseNumbers: !settings.showVerseNumbers })
              }
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                settings.showVerseNumbers
                  ? 'bg-[var(--mushaf-emerald-bg)] text-[var(--mushaf-emerald)]'
                  : 'bg-[var(--mushaf-paper-edge)] text-[var(--mushaf-ink-muted)]'
              }`}
            >
              {settings.showVerseNumbers ? 'Affichés' : 'Masqués'}
            </button>
          </div>

          {/* Fullscreen Mode */}
          <div className="pt-2 border-t border-[var(--mushaf-border)]">
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--mushaf-border)] hover:bg-[var(--mushaf-paper-edge)] text-xs font-medium text-[var(--mushaf-ink)] cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Quitter le plein écran</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>Mode lecture plein écran</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
