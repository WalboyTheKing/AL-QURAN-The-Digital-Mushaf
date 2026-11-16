import type { ChapterAudioData, SyncState, VerseTimestamp } from '../types/audio';
import { computeSyncState } from '../utils/audioTimestamps';

export function getSyncAtTime(
  audioData: ChapterAudioData | null,
  currentTimeSeconds: number,
): SyncState {
  if (!audioData || !audioData.timestamps.length) {
    return {
      activeVerseKey: null,
      activeWordPosition: null,
      syncPrecision: 'verse',
    };
  }
  const currentMs = Math.max(0, currentTimeSeconds * 1000);
  return computeSyncState(audioData.timestamps, currentMs, audioData.hasWordSegments);
}

export function findVerseTimestampByKey(
  audioData: ChapterAudioData | null,
  verseKey: string,
): VerseTimestamp | null {
  if (!audioData) return null;
  return audioData.timestamps.find((t) => t.verse_key === verseKey) ?? null;
}

export function getAdjacentVerseKey(
  timestamps: VerseTimestamp[],
  currentVerseKey: string | null,
  direction: 'next' | 'prev',
): string | null {
  if (!timestamps.length) return null;
  if (!currentVerseKey) return timestamps[0].verse_key;

  const idx = timestamps.findIndex((t) => t.verse_key === currentVerseKey);
  if (idx === -1) return timestamps[0].verse_key;

  const targetIdx = direction === 'next' ? idx + 1 : idx - 1;
  if (targetIdx < 0 || targetIdx >= timestamps.length) return null;
  return timestamps[targetIdx].verse_key;
}
