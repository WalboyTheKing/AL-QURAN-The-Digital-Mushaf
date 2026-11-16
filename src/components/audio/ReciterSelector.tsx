import type { ReciterInfo } from '../../types/audio';

interface ReciterSelectorProps {
  reciters: ReciterInfo[];
  activeReciter: ReciterInfo | null;
  loading: boolean;
  onSelectReciter: (reciterId: string) => void;
}

export function ReciterSelector({
  reciters,
  activeReciter,
  loading,
  onSelectReciter,
}: ReciterSelectorProps) {
  return (
    <div className="flex flex-col min-w-0">
      <label htmlFor="reciter-select" className="sr-only">
        Récitateur
      </label>
      <select
        id="reciter-select"
        disabled={loading || reciters.length === 0}
        value={activeReciter?.id ?? ''}
        onChange={(e) => onSelectReciter(e.target.value)}
        className="w-full sm:w-56 px-2.5 py-1.5 rounded-md border border-[var(--mushaf-border)] bg-[var(--mushaf-paper)] text-xs font-medium text-[var(--mushaf-ink)] truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mushaf-gold)]"
      >
        {loading && <option value="">Chargement des récitateurs…</option>}
        {reciters.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
            {r.style ? ` (${r.style})` : ''} —{' '}
            {r.syncPrecision === 'word' ? 'Mot/mot' : 'Verset'}
          </option>
        ))}
      </select>
    </div>
  );
}
