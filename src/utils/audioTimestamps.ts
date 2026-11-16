import type { SyncState, VerseTimestamp, WordSegment } from '../types/audio';

/**
 * Binary search for active verse timestamp at currentMs.
 */
export function findActiveVerseTimestamp(
  timestamps: VerseTimestamp[],
  currentMs: number,
): VerseTimestamp | null {
  if (!timestamps.length) return null;

  let low = 0;
  let high = timestamps.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const item = timestamps[mid];
    if (currentMs < item.timestamp_from) {
      high = mid - 1;
    } else if (currentMs >= item.timestamp_to) {
      low = mid + 1;
    } else {
      return item;
    }
  }

  // Fallback for brief gaps between verse boundaries
  if (low > 0 && low <= timestamps.length) {
    const prev = timestamps[low - 1];
    const next = timestamps[low];
    if (next && currentMs >= prev.timestamp_to && currentMs < next.timestamp_from) {
      return prev;
    }
  }

  return null;
}

/**
 * Find active word position within a verse's word segments at currentMs.
 */
export function findActiveWordPosition(
  segments: WordSegment[],
  currentMs: number,
): number | null {
  if (!segments.length) return null;

  for (let i = 0; i < segments.length; i++) {
    const [pos, startMs, endMs] = segments[i];
    if (currentMs >= startMs && currentMs < endMs) {
      return pos;
    }
  }

  // Small tolerance before next word starts
  for (let i = 0; i < segments.length; i++) {
    const [pos, startMs, endMs] = segments[i];
    const nextStart = segments[i + 1]?.[1] ?? endMs + 400;
    if (currentMs >= endMs && currentMs < nextStart) {
      return pos;
    }
  }

  return null;
}

export function computeSyncState(
  timestamps: VerseTimestamp[],
  currentMs: number,
  hasWordSegments: boolean,
): SyncState {
  const activeTs = findActiveVerseTimestamp(timestamps, currentMs);
  if (!activeTs) {
    return {
      activeVerseKey: null,
      activeWordPosition: null,
      syncPrecision: hasWordSegments ? 'word' : 'verse',
    };
  }

  const activeWordPosition =
    hasWordSegments && activeTs.segments.length > 0
      ? findActiveWordPosition(activeTs.segments, currentMs)
      : null;

  return {
    activeVerseKey: activeTs.verse_key,
    activeWordPosition,
    syncPrecision: hasWordSegments && activeTs.segments.length > 0 ? 'word' : 'verse',
  };
}

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}
