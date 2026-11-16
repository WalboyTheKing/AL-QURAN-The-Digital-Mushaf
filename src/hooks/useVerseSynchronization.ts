import { useEffect, useRef, useState } from 'react';
import { getSyncAtTime } from '../services/synchronizationService';
import type { ChapterAudioData, ReciterInfo, SyncState } from '../types/audio';

interface UseVerseSynchronizationArgs {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  chapterAudio: ChapterAudioData | null;
  activeReciter: ReciterInfo | null;
  perVerseActiveKey: string | null;
  lockedVerseKey: string | null;
}

export function useVerseSynchronization({
  audioRef,
  isPlaying,
  chapterAudio,
  activeReciter,
  perVerseActiveKey,
  lockedVerseKey,
}: UseVerseSynchronizationArgs): SyncState {
  const [syncState, setSyncState] = useState<SyncState>({
    activeVerseKey: null,
    activeWordPosition: null,
    syncPrecision: 'verse',
  });

  const lastSnapshotRef = useRef<string>('');

  // Keep active verse highlighted cleanly during inter-repetition pauses
  useEffect(() => {
    if (lockedVerseKey) {
      const precision =
        activeReciter?.syncPrecision === 'word' && chapterAudio?.hasWordSegments
          ? 'word'
          : 'verse';
      const next: SyncState = {
        activeVerseKey: lockedVerseKey,
        activeWordPosition: null,
        syncPrecision: precision,
      };
      const key = `${next.activeVerseKey}|null|${precision}`;
      if (key !== lastSnapshotRef.current) {
        lastSnapshotRef.current = key;
        setSyncState(next);
      }
    }
  }, [lockedVerseKey, activeReciter, chapterAudio]);

  // Per-verse provider (Islamic Network): verse key is directly tracked by audio player
  useEffect(() => {
    if (lockedVerseKey) return;
    if (activeReciter?.provider === 'islamicnetwork') {
      const nextState: SyncState = {
        activeVerseKey: perVerseActiveKey,
        activeWordPosition: null,
        syncPrecision: 'verse',
      };
      const key = `${nextState.activeVerseKey ?? ''}|${nextState.activeWordPosition ?? ''}|verse`;
      if (key !== lastSnapshotRef.current) {
        lastSnapshotRef.current = key;
        setSyncState(nextState);
      }
    }
  }, [activeReciter, perVerseActiveKey, lockedVerseKey]);

  // Chapter-level provider (Quran.com): high-precision rAF + timeupdate binary search
  useEffect(() => {
    if (lockedVerseKey) return;

    if (!activeReciter || activeReciter.provider !== 'qurancom' || !chapterAudio) {
      if (activeReciter?.provider !== 'islamicnetwork') {
        lastSnapshotRef.current = '';
        setSyncState({
          activeVerseKey: null,
          activeWordPosition: null,
          syncPrecision: 'verse',
        });
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    const updateFromTime = () => {
      const next = getSyncAtTime(chapterAudio, audio.currentTime);
      const snapshot = `${next.activeVerseKey ?? ''}|${next.activeWordPosition ?? ''}|${next.syncPrecision}`;
      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setSyncState(next);
      }
    };

    updateFromTime();

    let rafId = 0;
    const tick = () => {
      updateFromTime();
      if (isPlaying) {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      rafId = requestAnimationFrame(tick);
    }

    audio.addEventListener('timeupdate', updateFromTime);
    audio.addEventListener('seeked', updateFromTime);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      audio.removeEventListener('timeupdate', updateFromTime);
      audio.removeEventListener('seeked', updateFromTime);
    };
  }, [audioRef, isPlaying, chapterAudio, activeReciter, lockedVerseKey]);

  return syncState;
}
