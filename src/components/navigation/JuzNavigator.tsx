import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { JuzMapping, Surah } from '../../types/quran';

interface JuzNavigatorProps {
  juzs: JuzMapping[];
  surahsById: Record<number, Surah>;
  onGoToJuz: (juzNumber: number) => Promise<void>;
  onGoToHizb: (hizbNumber: number) => Promise<void>;
  onGoToRub: (rubNumber: number) => Promise<void>;
}

export function JuzNavigator({
  juzs,
  surahsById,
  onGoToJuz,
  onGoToHizb,
  onGoToRub,
}: JuzNavigatorProps) {
  const [subTab, setSubTab] = useState<'juz' | 'hizb'>('juz');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleJuzClick = async (juzNum: number) => {
    setLoadingId(`juz-${juzNum}`);
    try {
      await onGoToJuz(juzNum);
    } finally {
      setLoadingId(null);
    }
  };

  const handleHizbClick = async (hizbNum: number) => {
    setLoadingId(`hizb-${hizbNum}`);
    try {
      await onGoToHizb(hizbNum);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDemiHizbClick = async (hizbNum: number) => {
    // Each Hizb has 4 Rubs; the half-Hizb starts at the 3rd Rub of that Hizb
    const rubNum = (hizbNum - 1) * 4 + 3;
    setLoadingId(`demi-${hizbNum}`);
    try {
      await onGoToRub(rubNum);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sub-tabs: 30 Juz vs 60 Hizb & Demi-Hizb */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--mushaf-paper-edge)] mb-3">
        <button
          type="button"
          onClick={() => setSubTab('juz')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            subTab === 'juz'
              ? 'bg-[var(--mushaf-paper)] text-[var(--mushaf-ink)] shadow-sm'
              : 'text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)]'
          }`}
        >
          30 Juz
        </button>
        <button
          type="button"
          onClick={() => setSubTab('hizb')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            subTab === 'hizb'
              ? 'bg-[var(--mushaf-paper)] text-[var(--mushaf-ink)] shadow-sm'
              : 'text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)]'
          }`}
        >
          60 Hizb & ½ Hizb
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mushaf-scroll divide-y divide-[var(--mushaf-border)]">
        {subTab === 'juz'
          ? (juzs.length > 0
              ? juzs
              : (Array.from({ length: 30 }, (_, i) => ({
                  id: i + 1,
                  juz_number: i + 1,
                  verse_mapping: {} as Record<string, string>,
                  first_verse_id: 0,
                  last_verse_id: 0,
                  verses_count: 0,
                })) as JuzMapping[])
            ).map((juz) => {
              const entries = Object.entries(juz.verse_mapping) as Array<[string, string]>;
              const firstEntry = entries[0];
              const lastEntry = entries[entries.length - 1];
              const firstSurah = firstEntry ? surahsById[Number(firstEntry[0])] : undefined;
              const lastSurah = lastEntry ? surahsById[Number(lastEntry[0])] : undefined;
              const isBusy = loadingId === `juz-${juz.juz_number}`;

              return (
                <button
                  key={juz.juz_number}
                  type="button"
                  disabled={loadingId !== null}
                  onClick={() => void handleJuzClick(juz.juz_number)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--mushaf-paper-edge)]/70 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--mushaf-ink)] tabular-nums">
                      Juz {juz.juz_number}
                    </div>
                    {firstSurah && (
                      <p className="text-xs text-[var(--mushaf-ink-muted)] truncate">
                        {firstSurah.name_simple} ({firstEntry[1].split('-')[0]})
                        {lastSurah && lastSurah.id !== firstSurah.id
                          ? ` → ${lastSurah.name_simple}`
                          : ''}
                      </p>
                    )}
                  </div>
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--mushaf-emerald)] shrink-0" />
                  ) : (
                    <span className="text-xs text-[var(--mushaf-gold)] font-medium shrink-0">
                      Ouvrir
                    </span>
                  )}
                </button>
              );
            })
          : Array.from({ length: 60 }, (_, idx) => idx + 1).map((hizbNum) => {
              const juzNum = Math.ceil(hizbNum / 2);
              const isBusyHizb = loadingId === `hizb-${hizbNum}`;
              const isBusyDemi = loadingId === `demi-${hizbNum}`;

              return (
                <div
                  key={hizbNum}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="text-xs text-[var(--mushaf-ink)] tabular-nums">
                    <span className="font-medium">Hizb {hizbNum}</span>
                    <span className="text-[var(--mushaf-ink-muted)] ml-1.5">
                      · Juz {juzNum}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={loadingId !== null}
                      onClick={() => void handleHizbClick(hizbNum)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--mushaf-border)] hover:bg-[var(--mushaf-paper-edge)] text-xs text-[var(--mushaf-ink)] cursor-pointer disabled:opacity-50"
                    >
                      {isBusyHizb && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Début</span>
                    </button>
                    <button
                      type="button"
                      disabled={loadingId !== null}
                      onClick={() => void handleDemiHizbClick(hizbNum)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--mushaf-border)] hover:bg-[var(--mushaf-paper-edge)] text-xs text-[var(--mushaf-gold)] font-medium cursor-pointer disabled:opacity-50"
                    >
                      {isBusyDemi && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>½ Hizb</span>
                    </button>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
