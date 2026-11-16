export type ReciterSyncPrecision = 'word' | 'verse';
export type ReciterProvider = 'qurancom' | 'islamicnetwork';

export interface ReciterInfo {
  id: string;
  numericId?: number;
  editionIdentifier?: string;
  provider: ReciterProvider;
  name: string;
  style?: string | null;
  syncPrecision: ReciterSyncPrecision;
  available: boolean;
}

export type WordSegment = [number, number, number];

export interface VerseTimestamp {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
  duration: number;
  segments: WordSegment[];
}

export interface ChapterAudioData {
  reciterId: string;
  chapterId: number;
  audioUrl: string;
  timestamps: VerseTimestamp[];
  hasWordSegments: boolean;
}

export type RepeatMode = 'none' | 'verse' | 'range';

/** 0 means repeat indefinitely (∞); >= 1 means exact number of repetitions */
export type RepeatCountOption = number;

export function normalizeRepeatCount(value: number | 'infinite'): number {
  if (value === 'infinite' || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.max(1, Math.min(999, Math.floor(value)));
}

export type PauseDelaySeconds = 0 | 2 | 3 | 5 | 10;

export type RangeRepeatStrategy = 'individual' | 'sequence';

export type AfterVerseRepeatAction = 'stop' | 'next';

export interface HifzConfig {
  surahId: number;
  startVerse: number;
  endVerse: number;
  reciterId: string;
  repeatCount: RepeatCountOption;
  pauseSeconds: PauseDelaySeconds;
  strategy: RangeRepeatStrategy;
  afterSingleVerseAction: AfterVerseRepeatAction;
}

export type HifzStatus =
  | 'idle'
  | 'playing'
  | 'pausing_between'
  | 'paused'
  | 'completed';

export interface HifzSessionState {
  status: HifzStatus;
  mode: 'verse' | 'range' | 'hifz';
  surahId: number;
  startVerse: number;
  endVerse: number;
  currentVerseNumber: number;
  currentRepetition: number;
  repeatCount: RepeatCountOption;
  pauseSeconds: PauseDelaySeconds;
  strategy: RangeRepeatStrategy;
  pauseRemainingSec: number;
}

export interface SavedHifzProgress {
  config: HifzConfig;
  currentVerseNumber: number;
  currentRepetition: number;
  updatedAt: number;
}

export interface SyncState {
  activeVerseKey: string | null;
  activeWordPosition: number | null;
  syncPrecision: ReciterSyncPrecision;
}
