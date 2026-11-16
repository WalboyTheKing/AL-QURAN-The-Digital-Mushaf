import { Moon, ScrollText, Sun } from 'lucide-react';
import type { ThemeMode } from '../../types/quran';

interface ThemeSelectorProps {
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
}

const THEMES: Array<{
  id: ThemeMode;
  label: string;
  icon: typeof Sun;
}> = [
  { id: 'day', label: 'Jour', icon: Sun },
  { id: 'sepia', label: 'Sépia', icon: ScrollText },
  { id: 'night', label: 'Nuit', icon: Moon },
];

export function ThemeSelector({ theme, onChangeTheme }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[var(--mushaf-paper-edge)]">
      {THEMES.map((item) => {
        const Icon = item.icon;
        const active = theme === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChangeTheme(item.id)}
            className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              active
                ? 'bg-[var(--mushaf-paper)] text-[var(--mushaf-ink)] shadow-sm'
                : 'text-[var(--mushaf-ink-muted)] hover:text-[var(--mushaf-ink)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
