import { useState } from 'react';
import { BookOpen, Loader2, Play } from 'lucide-react';
import type { Surah } from '../../types/quran';

interface VerseNavigatorProps {
  surahs: Surah[];
  onGoToVerse: (surahId: number, verseNumber: number) => Promise<void>;
  onPlayVerse: (surahId: number, verseNumber: number) => void;
}

const NOTABLE_VERSES = [
  { label: 'Al-Fatihah · 1:1', surahId: 1, verse: 1 },
  { label: 'Ayat Al-Kursi · 2:255', surahId: 2, verse: 255 },
  { label: 'Fin Al-Baqarah · 2:285', surahId: 2, verse: 285 },
  { label: 'Verset de la Lumière · 24:35', surahId: 24, verse: 35 },
];

export function VerseNavigator({
  surahs,
  onGoToVerse,
  onPlayVerse,
}: VerseNavigatorProps) {
  const [selectedSurahId, setSelectedSurahId] = useState<number>(1);
  const [verseInput, setVerseInput] = useState<string>('1');
  const [verseBusy, setVerseBusy] = useState(false);

  const selectedSurah = surahs.find((s) => s.id === selectedSurahId);
  const maxVerse = selectedSurah?.verses_count ?? 7;

  const handleGo = async (surahId: number, verseNum: number, playAudio: boolean) => {
    const targetSurah = surahs.find((s) => s.id === surahId);
    const limit = targetSurah?.verses_count ?? 286;
    const clampedVerse = Math.max(1, Math.min(limit, Math.floor(verseNum) || 1));

    setVerseBusy(true);
    try {
      await onGoToVerse(surahId, clampedVerse);
      if (playAudio) {
        onPlayVerse(surahId, clampedVerse);
      }
    } finally {
      setVerseBusy(false);
    }
  };

  return (
    <div className="space-y-5 overflow-y-auto mushaf-scroll pr-1">
      <div>
        <h3 className="text-sm font-semibold text-[var(--mushaf-ink)] mb-1">
          Accès direct à un verset
        </h3>
        <p className="text-xs text-[var(--mushaf-ink-muted)] mb-3">
          Choisissez une sourate et un numéro de verset pour ouvrir sa page ou lancer la récitation.
        </p>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="index-verse-surah"
              className="block text-xs font-medium text-[var(--mushaf-ink-muted)] mb-1"
            >
              Sourate
            </label>
            <select
              id="index-verse-surah"
              value={selectedSurahId}
              onChange={(e) => {
                setSelectedSurahId(Number(e.target.value));
                setVerseInput('1');
              }}
              className="w-full px-3 py-2 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-sm text-[var(--mushaf-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mushaf-gold)]"
            >
              {surahs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}. {s.name_simple} ({s.translated_name.name}) · {s.verses_count} v.
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="index-verse-number"
              className="block text-xs font-medium text-[var(--mushaf-ink-muted)] mb-1 tabular-nums"
            >
              Numéro du verset (1 – {maxVerse})
            </label>
            <input
              id="index-verse-number"
              type="number"
              min={1}
              max={maxVerse}
              value={verseInput}
              onChange={(e) => setVerseInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-sm text-[var(--mushaf-ink)] tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mushaf-gold)]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={verseBusy}
              onClick={() => void handleGo(selectedSurahId, Number(verseInput), false)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--mushaf-border)] hover:bg-[var(--mushaf-paper-edge)] text-xs font-medium text-[var(--mushaf-ink)] cursor-pointer disabled:opacity-50"
            >
              {verseBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BookOpen className="w-3.5 h-3.5" />
              )}
              <span>Afficher la page</span>
            </button>

            <button
              type="button"
              disabled={verseBusy}
              onClick={() => void handleGo(selectedSurahId, Number(verseInput), true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0d4a34] hover:bg-[#0a3b29] text-[#faf6ec] text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Lire & Écouter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Notable Verses */}
      <div className="pt-4 border-t border-[var(--mushaf-border)]">
        <h3 className="text-xs font-semibold text-[var(--mushaf-ink-muted)] uppercase tracking-wider mb-2">
          Accès rapides
        </h3>
        <div className="grid grid-cols-1 gap-1.5">
          {NOTABLE_VERSES.map((item) => (
            <button
              key={`${item.surahId}:${item.verse}`}
              type="button"
              disabled={verseBusy}
              onClick={() => void handleGo(item.surahId, item.verse, false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--mushaf-border)] hover:bg-[var(--mushaf-paper-edge)]/70 text-xs text-[var(--mushaf-ink)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="font-medium">{item.label}</span>
              <span className="text-[var(--mushaf-gold)] font-medium">Ouvrir</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
