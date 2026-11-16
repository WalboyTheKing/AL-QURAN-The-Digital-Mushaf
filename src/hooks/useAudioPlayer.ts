import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ChapterVerseMeta,
  getAvailableReciters,
  getChapterAudio,
  getChapterVerseMeta,
  getPerVerseAudioUrl,
} from '../services/audioService';
import { findVerseTimestampByKey, getAdjacentVerseKey } from '../services/synchronizationService';
import {
  type ChapterAudioData,
  type HifzConfig,
  type HifzSessionState,
  normalizeRepeatCount,
  type PauseDelaySeconds,
  type RangeRepeatStrategy,
  type ReciterInfo,
  type RepeatCountOption,
  type RepeatMode,
  type SavedHifzProgress,
} from '../types/audio';
import { parseVerseKey } from '../utils/quranPagination';
import { useVerseSynchronization } from './useVerseSynchronization';

const HIFZ_STORAGE_KEY = 'mushaf_hifz_session_v1';

const DEFAULT_HIFZ_CONFIG: HifzConfig = {
  surahId: 1,
  startVerse: 1,
  endVerse: 7,
  reciterId: 'qdc:7',
  repeatCount: 5,
  pauseSeconds: 0,
  strategy: 'individual',
  afterSingleVerseAction: 'stop',
};

function readSavedHifz(): SavedHifzProgress | null {
  try {
    const raw = localStorage.getItem(HIFZ_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedHifzProgress;
  } catch {
    return null;
  }
}

interface UseAudioPlayerArgs {
  onVersePageRequest?: (pageNumber: number, verseKey: string) => void;
}

export function useAudioPlayer({ onVersePageRequest }: UseAudioPlayerArgs) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [reciters, setReciters] = useState<ReciterInfo[]>([]);
  const [recitersLoading, setRecitersLoading] = useState(true);
  const [activeReciter, setActiveReciter] = useState<ReciterInfo | null>(null);

  const [activeSurahId, setActiveSurahId] = useState<number>(1);
  const [chapterAudio, setChapterAudio] = useState<ChapterAudioData | null>(null);
  const [chapterVersesMeta, setChapterVersesMeta] = useState<ChapterVerseMeta[]>([]);
  const [perVerseActiveKey, setPerVerseActiveKey] = useState<string | null>(null);
  const [lockedVerseKey, setLockedVerseKey] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);

  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [continuousPlay, setContinuousPlay] = useState(true);

  const [savedHifz, setSavedHifz] = useState<SavedHifzProgress | null>(() => readSavedHifz());

  const [hifzConfig, setHifzConfig] = useState<HifzConfig>(() => ({
    ...DEFAULT_HIFZ_CONFIG,
    ...(readSavedHifz()?.config ?? {}),
  }));

  const [hifzSession, setHifzSession] = useState<HifzSessionState>(() => {
    const saved = readSavedHifz();
    const cfg = { ...DEFAULT_HIFZ_CONFIG, ...(saved?.config ?? {}) };
    return {
      status: 'idle',
      mode: 'hifz',
      surahId: cfg.surahId,
      startVerse: cfg.startVerse,
      endVerse: cfg.endVerse,
      currentVerseNumber: saved?.currentVerseNumber ?? cfg.startVerse,
      currentRepetition: saved?.currentRepetition ?? 1,
      repeatCount: cfg.repeatCount,
      pauseSeconds: cfg.pauseSeconds,
      strategy: cfg.strategy,
      pauseRemainingSec: 0,
    };
  });

  const sync = useVerseSynchronization({
    audioRef,
    isPlaying,
    chapterAudio,
    activeReciter,
    perVerseActiveKey,
    lockedVerseKey,
  });

  // Refs to avoid stale closures and race conditions
  const activeReciterRef = useRef(activeReciter);
  activeReciterRef.current = activeReciter;
  const activeSurahIdRef = useRef(activeSurahId);
  activeSurahIdRef.current = activeSurahId;
  const chapterAudioRef = useRef(chapterAudio);
  chapterAudioRef.current = chapterAudio;
  const chapterMetaRef = useRef(chapterVersesMeta);
  chapterMetaRef.current = chapterVersesMeta;
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;
  const continuousPlayRef = useRef(continuousPlay);
  continuousPlayRef.current = continuousPlay;
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;
  const hifzConfigRef = useRef(hifzConfig);
  hifzConfigRef.current = hifzConfig;
  const hifzSessionRef = useRef(hifzSession);
  hifzSessionRef.current = hifzSession;
  const syncVerseKeyRef = useRef(sync.activeVerseKey);
  syncVerseKeyRef.current = sync.activeVerseKey;
  const onVersePageRequestRef = useRef(onVersePageRequest);
  onVersePageRequestRef.current = onVersePageRequest;
  const lastNotifiedVerseRef = useRef<string | null>(null);

  const loadRequestIdRef = useRef(0);
  const isHandlingVerseEndRef = useRef(false);
  const pauseTimerRef = useRef<number | null>(null);
  const pendingNextStepRef = useRef<{
    surahId: number;
    verseNumber: number;
    repetition: number;
  } | null>(null);

  const clearPauseTimer = useCallback(() => {
    if (pauseTimerRef.current !== null) {
      window.clearInterval(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }, []);

  const persistHifzProgress = useCallback(
    (cfg: HifzConfig, verseNumber: number, repetition: number) => {
      const payload: SavedHifzProgress = {
        config: cfg,
        currentVerseNumber: verseNumber,
        currentRepetition: repetition,
        updatedAt: Date.now(),
      };
      setSavedHifz(payload);
      try {
        localStorage.setItem(HIFZ_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore storage errors
      }
    },
    [],
  );

  // Initialize persistent HTML5 Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = 0.9;
    audioRef.current = audio;

    return () => {
      clearPauseTimer();
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, [clearPauseTimer]);

  // Load reciters list and match saved reciter if any
  useEffect(() => {
    let active = true;
    getAvailableReciters()
      .then((list) => {
        if (!active) return;
        setReciters(list);
        const savedReciterId = hifzConfigRef.current.reciterId;
        const preferred =
          list.find((r) => r.id === savedReciterId) ??
          list.find((r) => r.id === 'qdc:7') ??
          list[0] ??
          null;
        setActiveReciter(preferred);
        if (preferred) {
          setHifzConfig((prev) => ({ ...prev, reciterId: preferred.id }));
        }
      })
      .catch(() => {
        if (active) setAudioError('Impossible de charger les récitateurs.');
      })
      .finally(() => {
        if (active) setRecitersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Notify Mushaf book to auto-flip page whenever active recited verse changes
  useEffect(() => {
    if (!isPlaying && !sync.activeVerseKey && !lockedVerseKey) return;
    const verseKey = lockedVerseKey ?? sync.activeVerseKey;
    if (!verseKey || verseKey === lastNotifiedVerseRef.current) return;
    lastNotifiedVerseRef.current = verseKey;

    const meta = chapterMetaRef.current.find((m) => m.verse_key === verseKey);
    if (meta && onVersePageRequestRef.current) {
      onVersePageRequestRef.current(meta.page_number, verseKey);
    }
  }, [sync.activeVerseKey, isPlaying, lockedVerseKey]);

  const loadAndPlay = useCallback(
    async (
      reciter: ReciterInfo,
      surahId: number,
      targetVerseNumber = 1,
      autoPlay = true,
    ) => {
      const audio = audioRef.current;
      if (!audio) return;

      const reqId = ++loadRequestIdRef.current;
      clearPauseTimer();
      pendingNextStepRef.current = null;
      setLockedVerseKey(null);
      setAudioError(null);
      setIsBuffering(true);
      setActiveSurahId(surahId);
      isHandlingVerseEndRef.current = true;

      // Pause immediately to prevent any audio overlap while switching
      if (!audio.paused) {
        audio.pause();
      }

      try {
        const [metaList, audioData] = await Promise.all([
          getChapterVerseMeta(surahId),
          getChapterAudio(reciter, surahId),
        ]);

        if (reqId !== loadRequestIdRef.current) return;

        setChapterVersesMeta(metaList);
        setChapterAudio(audioData);

        const clampedVerse = Math.max(
          1,
          Math.min(metaList.length || 1, targetVerseNumber),
        );
        const targetVerseKey = `${surahId}:${clampedVerse}`;

        if (reciter.provider === 'qurancom') {
          const ts = findVerseTimestampByKey(audioData, targetVerseKey);
          const startSec = ts ? ts.timestamp_from / 1000 : 0;

          const applySeekAndPlay = () => {
            if (reqId !== loadRequestIdRef.current) return;
            audio.currentTime = startSec;
            audio.playbackRate = playbackRateRef.current;
            isHandlingVerseEndRef.current = false;
            if (autoPlay) {
              void audio.play().catch(() => {
                setIsPlaying(false);
                setIsBuffering(false);
              });
            } else {
              setIsBuffering(false);
            }
          };

          if (audio.src !== audioData.audioUrl) {
            audio.src = audioData.audioUrl;
            audio.load();
            const onLoaded = () => {
              audio.removeEventListener('loadedmetadata', onLoaded);
              applySeekAndPlay();
            };
            audio.addEventListener('loadedmetadata', onLoaded);
          } else if (audio.readyState >= 1) {
            applySeekAndPlay();
          } else {
            const onLoaded = () => {
              audio.removeEventListener('loadedmetadata', onLoaded);
              applySeekAndPlay();
            };
            audio.addEventListener('loadedmetadata', onLoaded);
          }
        } else {
          const verseMeta =
            metaList.find((m) => m.verse_number === clampedVerse) ?? metaList[0];
          if (!verseMeta || !reciter.editionIdentifier) {
            throw new Error('Verset audio introuvable.');
          }
          setPerVerseActiveKey(verseMeta.verse_key);
          const url = getPerVerseAudioUrl(reciter.editionIdentifier, verseMeta.id);
          audio.src = url;
          audio.load();
          audio.playbackRate = playbackRateRef.current;
          isHandlingVerseEndRef.current = false;
          if (autoPlay) {
            void audio.play().catch(() => {
              setIsPlaying(false);
              setIsBuffering(false);
            });
          } else {
            setIsBuffering(false);
          }
        }

        const targetMeta = metaList.find((m) => m.verse_key === targetVerseKey);
        if (targetMeta && onVersePageRequestRef.current && autoPlay) {
          lastNotifiedVerseRef.current = targetVerseKey;
          onVersePageRequestRef.current(targetMeta.page_number, targetVerseKey);
        }
      } catch (err) {
        if (reqId !== loadRequestIdRef.current) return;
        isHandlingVerseEndRef.current = false;
        const message =
          err instanceof Error ? err.message : 'Erreur lors du chargement audio.';
        setAudioError(message);
        setIsPlaying(false);
        setIsBuffering(false);
      }
    },
    [clearPauseTimer],
  );

  // Execute transition to a specific verse & repetition (used both immediately and after pause timer)
  const executeVerseTransition = useCallback(
    (surahId: number, verseNumber: number, repetition: number) => {
      const reciter = activeReciterRef.current;
      const audio = audioRef.current;
      if (!reciter || !audio) return;

      setLockedVerseKey(null);
      pendingNextStepRef.current = null;

      setHifzSession((prev) => ({
        ...prev,
        status: 'playing',
        surahId,
        currentVerseNumber: verseNumber,
        currentRepetition: repetition,
        pauseRemainingSec: 0,
      }));
      persistHifzProgress(hifzConfigRef.current, verseNumber, repetition);

      if (
        reciter.provider === 'qurancom' &&
        activeSurahIdRef.current === surahId &&
        chapterAudioRef.current &&
        audio.src === chapterAudioRef.current.audioUrl &&
        audio.readyState >= 1
      ) {
        const ts = findVerseTimestampByKey(
          chapterAudioRef.current,
          `${surahId}:${verseNumber}`,
        );
        if (ts) {
          isHandlingVerseEndRef.current = true;
          audio.currentTime = ts.timestamp_from / 1000;
          audio.playbackRate = playbackRateRef.current;
          const onSeeked = () => {
            audio.removeEventListener('seeked', onSeeked);
            isHandlingVerseEndRef.current = false;
          };
          audio.addEventListener('seeked', onSeeked);
          // Safety fallback in case seeked fires synchronously or already at target
          window.setTimeout(() => {
            isHandlingVerseEndRef.current = false;
          }, 120);

          if (audio.paused) {
            void audio.play().catch(() => {
              setIsPlaying(false);
            });
          }
          const meta = chapterMetaRef.current.find(
            (m) => m.verse_key === `${surahId}:${verseNumber}`,
          );
          if (meta && onVersePageRequestRef.current) {
            lastNotifiedVerseRef.current = meta.verse_key;
            onVersePageRequestRef.current(meta.page_number, meta.verse_key);
          }
          return;
        }
      }

      void loadAndPlay(reciter, surahId, verseNumber, true);
    },
    [loadAndPlay, persistHifzProgress],
  );

  // Core handler invoked strictly at the REAL end of a verse's audio playback
  const handleRealVerseFinished = useCallback(
    (finishedVerseNumber: number) => {
      if (isHandlingVerseEndRef.current) return;
      isHandlingVerseEndRef.current = true;

      const audio = audioRef.current;
      const mode = repeatModeRef.current;
      const session = hifzSessionRef.current;
      const cfg = hifzConfigRef.current;
      const surahId = activeSurahIdRef.current;
      const totalVerses = chapterMetaRef.current.length || 1;

      if (mode === 'none' && session.status !== 'playing') {
        isHandlingVerseEndRef.current = false;
        return;
      }

      const limit = cfg.repeatCount; // 0 = unlimited
      const currentRep = session.currentRepetition;
      const pauseSec = cfg.pauseSeconds;

      let nextStep: { surahId: number; verseNumber: number; repetition: number } | null = null;

      if (mode === 'verse') {
        if (limit === 0 || currentRep < limit) {
          nextStep = {
            surahId,
            verseNumber: finishedVerseNumber,
            repetition: currentRep + 1,
          };
        } else if (
          cfg.afterSingleVerseAction === 'next' &&
          finishedVerseNumber < totalVerses
        ) {
          nextStep = {
            surahId,
            verseNumber: finishedVerseNumber + 1,
            repetition: 1,
          };
        }
      } else if (mode === 'range') {
        const startV = Math.max(1, Math.min(totalVerses, cfg.startVerse));
        const endV = Math.max(startV, Math.min(totalVerses, cfg.endVerse));

        if (cfg.strategy === 'individual') {
          if (limit === 0 || currentRep < limit) {
            nextStep = {
              surahId,
              verseNumber: finishedVerseNumber,
              repetition: currentRep + 1,
            };
          } else if (finishedVerseNumber < endV) {
            nextStep = {
              surahId,
              verseNumber: finishedVerseNumber + 1,
              repetition: 1,
            };
          }
        } else {
          // Sequence mode: read startV..endV in order, then repeat sequence
          if (finishedVerseNumber < endV) {
            nextStep = {
              surahId,
              verseNumber: finishedVerseNumber + 1,
              repetition: currentRep,
            };
          } else if (limit === 0 || currentRep < limit) {
            nextStep = {
              surahId,
              verseNumber: startV,
              repetition: currentRep + 1,
            };
          }
        }
      }

      if (!nextStep) {
        // Repetition target reached -> complete session cleanly
        if (audio && !audio.paused) {
          audio.pause();
        }
        setLockedVerseKey(null);
        setIsPlaying(false);
        setHifzSession((prev) => ({
          ...prev,
          status: 'completed',
          pauseRemainingSec: 0,
        }));
        isHandlingVerseEndRef.current = false;
        return;
      }

      if (pauseSec > 0) {
        if (audio && !audio.paused) {
          audio.pause();
        }
        setLockedVerseKey(`${surahId}:${finishedVerseNumber}`);
        pendingNextStepRef.current = nextStep;
        const endTime = Date.now() + pauseSec * 1000;

        setHifzSession((prev) => ({
          ...prev,
          status: 'pausing_between',
          pauseRemainingSec: pauseSec,
        }));

        clearPauseTimer();
        pauseTimerRef.current = window.setInterval(() => {
          const remainingMs = endTime - Date.now();
          if (remainingMs <= 0) {
            clearPauseTimer();
            const pending = pendingNextStepRef.current;
            isHandlingVerseEndRef.current = false;
            if (pending) {
              executeVerseTransition(
                pending.surahId,
                pending.verseNumber,
                pending.repetition,
              );
            }
          } else {
            const ceilSec = Math.ceil(remainingMs / 1000);
            setHifzSession((prev) =>
              prev.pauseRemainingSec === ceilSec
                ? prev
                : { ...prev, pauseRemainingSec: ceilSec },
            );
          }
        }, 200);
      } else {
        isHandlingVerseEndRef.current = false;
        executeVerseTransition(
          nextStep.surahId,
          nextStep.verseNumber,
          nextStep.repetition,
        );
      }
    },
    [clearPauseTimer, executeVerseTransition],
  );

  // High-precision rAF end-of-verse boundary monitor for Quran.com chapter audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;
    if (activeReciter?.provider !== 'qurancom' || !chapterAudio) return;
    if (repeatMode === 'none') return;

    let rafId = 0;
    const checkBoundary = () => {
      if (!audio.paused && !isHandlingVerseEndRef.current) {
        const session = hifzSessionRef.current;
        const surahId = activeSurahIdRef.current;
        const targetKey =
          session.status === 'playing'
            ? `${surahId}:${session.currentVerseNumber}`
            : syncVerseKeyRef.current;

        if (targetKey) {
          const ts = findVerseTimestampByKey(chapterAudio, targetKey);
          const currentMs = audio.currentTime * 1000;
          // Ensure playback genuinely reached the end of this verse (past start + 80ms)
          if (
            ts &&
            currentMs >= ts.timestamp_to - 35 &&
            currentMs > ts.timestamp_from + 80
          ) {
            const { verseNumber } = parseVerseKey(targetKey);
            handleRealVerseFinished(verseNumber);
            return;
          }
        }
      }
      rafId = requestAnimationFrame(checkBoundary);
    };

    rafId = requestAnimationFrame(checkBoundary);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, activeReciter, chapterAudio, repeatMode, handleRealVerseFinished]);

  // HTML5 Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };
    const onPause = () => {
      setIsPlaying(false);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setIsBuffering(false);
    };
    const onError = () => {
      setAudioError('Flux audio momentanément indisponible. Vérifiez votre connexion.');
      setIsPlaying(false);
      setIsBuffering(false);
      isHandlingVerseEndRef.current = false;
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);

      // Update currentVerseNumber passively during free range playback or normal playback
      const reciter = activeReciterRef.current;
      const mode = repeatModeRef.current;
      if (reciter?.provider === 'qurancom' && mode !== 'none') {
        const data = chapterAudioRef.current;
        const session = hifzSessionRef.current;
        const surahId = activeSurahIdRef.current;
        const targetKey =
          session.status === 'playing'
            ? `${surahId}:${session.currentVerseNumber}`
            : syncVerseKeyRef.current;
        if (data && targetKey && !audio.paused && !isHandlingVerseEndRef.current) {
          const ts = findVerseTimestampByKey(data, targetKey);
          const currentMs = audio.currentTime * 1000;
          if (
            ts &&
            currentMs >= ts.timestamp_to - 35 &&
            currentMs > ts.timestamp_from + 80
          ) {
            handleRealVerseFinished(parseVerseKey(targetKey).verseNumber);
          }
        }
      }
    };

    const onEnded = () => {
      const reciter = activeReciterRef.current;
      const surahId = activeSurahIdRef.current;
      const mode = repeatModeRef.current;
      const session = hifzSessionRef.current;

      if (mode !== 'none') {
        const currentKey =
          session.status === 'playing'
            ? `${surahId}:${session.currentVerseNumber}`
            : syncVerseKeyRef.current ?? `${surahId}:1`;
        const { verseNumber } = parseVerseKey(currentKey);
        handleRealVerseFinished(verseNumber);
        return;
      }

      if (reciter?.provider === 'islamicnetwork') {
        const currentKey = syncVerseKeyRef.current ?? `${surahId}:1`;
        const { verseNumber } = parseVerseKey(currentKey);
        const metaList = chapterMetaRef.current;
        if (verseNumber < metaList.length) {
          void loadAndPlay(reciter, surahId, verseNumber + 1, true);
          return;
        }
      }

      if (continuousPlayRef.current && reciter && surahId < 114) {
        void loadAndPlay(reciter, surahId + 1, 1, true);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [loadAndPlay, handleRealVerseFinished]);

  const playFromVerse = useCallback(
    (surahId: number, verseNumber = 1) => {
      const reciter = activeReciterRef.current;
      if (!reciter) return;
      clearPauseTimer();
      pendingNextStepRef.current = null;
      isHandlingVerseEndRef.current = false;

      if (repeatModeRef.current === 'verse') {
        setHifzSession((prev) => ({
          ...prev,
          status: 'playing',
          mode: 'verse',
          surahId,
          startVerse: verseNumber,
          endVerse: verseNumber,
          currentVerseNumber: verseNumber,
          currentRepetition: 1,
          pauseRemainingSec: 0,
        }));
      } else if (repeatModeRef.current === 'range') {
        const cfg = hifzConfigRef.current;
        const clampedStart = Math.min(verseNumber, cfg.endVerse);
        setHifzSession((prev) => ({
          ...prev,
          status: 'playing',
          surahId,
          currentVerseNumber: Math.max(clampedStart, verseNumber),
          currentRepetition: 1,
          pauseRemainingSec: 0,
        }));
      }

      void loadAndPlay(reciter, surahId, verseNumber, true);
    },
    [clearPauseTimer, loadAndPlay],
  );

  // Start or restart a dedicated Hifz / Repeat session
  const startHifzSession = useCallback(
    (overrideConfig?: Partial<HifzConfig>, resumeFromVerse?: number, resumeRep?: number) => {
      const merged: HifzConfig = {
        ...hifzConfigRef.current,
        ...overrideConfig,
      };
      const startV = Math.max(1, merged.startVerse);
      const endV = Math.max(startV, merged.endVerse);
      merged.startVerse = startV;
      merged.endVerse = endV;

      const targetReciter =
        reciters.find((r) => r.id === merged.reciterId) ?? activeReciterRef.current;
      if (!targetReciter) return;

      if (targetReciter.id !== activeReciterRef.current?.id) {
        setActiveReciter(targetReciter);
      }

      const initialVerse =
        resumeFromVerse && resumeFromVerse >= startV && resumeFromVerse <= endV
          ? resumeFromVerse
          : startV;
      const initialRep = resumeRep && resumeRep >= 1 ? resumeRep : 1;

      setHifzConfig(merged);
      setRepeatMode('range');
      setHifzSession({
        status: 'playing',
        mode: 'hifz',
        surahId: merged.surahId,
        startVerse: startV,
        endVerse: endV,
        currentVerseNumber: initialVerse,
        currentRepetition: initialRep,
        repeatCount: merged.repeatCount,
        pauseSeconds: merged.pauseSeconds,
        strategy: merged.strategy,
        pauseRemainingSec: 0,
      });
      persistHifzProgress(merged, initialVerse, initialRep);

      void loadAndPlay(targetReciter, merged.surahId, initialVerse, true);
    },
    [loadAndPlay, persistHifzProgress, reciters],
  );

  // Configure repeat from the quick Repeat popover (either single verse or range)
  const applyRepeatMode = useCallback(
    (
      nextMode: RepeatMode,
      options?: {
        repeatCount?: RepeatCountOption;
        pauseSeconds?: PauseDelaySeconds;
        strategy?: RangeRepeatStrategy;
        surahId?: number;
        startVerse?: number;
        endVerse?: number;
        afterSingleVerseAction?: 'stop' | 'next';
      },
    ) => {
      const currentKey = syncVerseKeyRef.current;
      const parsed = currentKey
        ? parseVerseKey(currentKey)
        : { surahId: activeSurahIdRef.current, verseNumber: 1 };

      const updatedCfg: HifzConfig = {
        ...hifzConfigRef.current,
        surahId: options?.surahId ?? parsed.surahId,
        startVerse:
          options?.startVerse ??
          (nextMode === 'verse' ? parsed.verseNumber : hifzConfigRef.current.startVerse),
        endVerse:
          options?.endVerse ??
          (nextMode === 'verse' ? parsed.verseNumber : hifzConfigRef.current.endVerse),
        repeatCount:
          options?.repeatCount !== undefined
            ? normalizeRepeatCount(options.repeatCount)
            : hifzConfigRef.current.repeatCount,
        pauseSeconds: options?.pauseSeconds ?? hifzConfigRef.current.pauseSeconds,
        strategy: options?.strategy ?? hifzConfigRef.current.strategy,
        afterSingleVerseAction:
          options?.afterSingleVerseAction ?? hifzConfigRef.current.afterSingleVerseAction,
      };

      hifzConfigRef.current = updatedCfg;
      setHifzConfig(updatedCfg);
      repeatModeRef.current = nextMode;
      setRepeatMode(nextMode);

      if (nextMode === 'none') {
        clearPauseTimer();
        pendingNextStepRef.current = null;
        setLockedVerseKey(null);
        setHifzSession((prev) => ({
          ...prev,
          status: 'idle',
          pauseRemainingSec: 0,
        }));
      } else {
        const activeVerse =
          nextMode === 'verse'
            ? parsed.verseNumber
            : Math.max(
                updatedCfg.startVerse,
                Math.min(updatedCfg.endVerse, hifzSessionRef.current.currentVerseNumber),
              );

        setHifzSession((prev) => ({
          ...prev,
          status: isPlaying ? 'playing' : prev.status === 'pausing_between' ? 'pausing_between' : 'paused',
          mode: nextMode,
          surahId: updatedCfg.surahId,
          startVerse: updatedCfg.startVerse,
          endVerse: updatedCfg.endVerse,
          currentVerseNumber: activeVerse,
          currentRepetition:
            prev.status === 'idle' || prev.status === 'completed' ? 1 : prev.currentRepetition,
          repeatCount: updatedCfg.repeatCount,
          pauseSeconds: updatedCfg.pauseSeconds,
          strategy: updatedCfg.strategy,
        }));
      }
    },
    [clearPauseTimer, isPlaying],
  );

  const updateHifzConfig = useCallback((patch: Partial<HifzConfig>) => {
    setHifzConfig((prev) => {
      const next: HifzConfig = {
        ...prev,
        ...patch,
        repeatCount:
          patch.repeatCount !== undefined
            ? normalizeRepeatCount(patch.repeatCount)
            : prev.repeatCount,
      };
      if (next.endVerse < next.startVerse) {
        next.endVerse = next.startVerse;
      }
      hifzConfigRef.current = next;
      setHifzSession((sess) => ({
        ...sess,
        surahId: next.surahId,
        startVerse: next.startVerse,
        endVerse: next.endVerse,
        repeatCount: next.repeatCount,
        pauseSeconds: next.pauseSeconds,
        strategy: next.strategy,
      }));
      persistHifzProgress(
        next,
        hifzSessionRef.current.currentVerseNumber,
        hifzSessionRef.current.currentRepetition,
      );
      return next;
    });
  }, [persistHifzProgress]);

  const setVerseRepeatGoal = useCallback(
    (count: number | 'infinite') => {
      const normalized = normalizeRepeatCount(count);
      const currentKey = lockedVerseKey ?? syncVerseKeyRef.current;
      const parsed = currentKey
        ? parseVerseKey(currentKey)
        : {
            surahId: activeSurahIdRef.current,
            verseNumber: hifzSessionRef.current.currentVerseNumber || 1,
          };

      const prevCfg = hifzConfigRef.current;
      const wasNone = repeatModeRef.current === 'none';

      const nextCfg: HifzConfig = {
        ...prevCfg,
        surahId: wasNone ? parsed.surahId : prevCfg.surahId,
        startVerse: wasNone ? parsed.verseNumber : prevCfg.startVerse,
        endVerse: wasNone ? parsed.verseNumber : prevCfg.endVerse,
        repeatCount: normalized,
      };

      hifzConfigRef.current = nextCfg;
      setHifzConfig(nextCfg);

      if (wasNone) {
        repeatModeRef.current = 'verse';
        setRepeatMode('verse');
      }

      setHifzSession((prev) => {
        const nextVerse = wasNone ? parsed.verseNumber : prev.currentVerseNumber;
        const nextRep =
          wasNone || prev.status === 'idle' || prev.status === 'completed'
            ? 1
            : prev.currentRepetition;
        const nextStatus =
          prev.status === 'pausing_between'
            ? 'pausing_between'
            : isPlaying
              ? 'playing'
              : 'paused';
        const updated: HifzSessionState = {
          ...prev,
          status: nextStatus,
          mode: wasNone ? 'verse' : prev.mode,
          surahId: wasNone ? parsed.surahId : prev.surahId,
          startVerse: wasNone ? parsed.verseNumber : prev.startVerse,
          endVerse: wasNone ? parsed.verseNumber : prev.endVerse,
          currentVerseNumber: nextVerse,
          currentRepetition: nextRep,
          repeatCount: normalized,
        };
        hifzSessionRef.current = updated;
        persistHifzProgress(nextCfg, nextVerse, nextRep);
        return updated;
      });
    },
    [isPlaying, lockedVerseKey, persistHifzProgress],
  );

  const repeatSpecificVerse = useCallback(
    (surahId: number, verseNumber: number, count: number | 'infinite') => {
      const reciter = activeReciterRef.current;
      if (!reciter) return;

      clearPauseTimer();
      pendingNextStepRef.current = null;
      isHandlingVerseEndRef.current = false;
      setLockedVerseKey(null);

      const normalized = normalizeRepeatCount(count);
      const prevCfg = hifzConfigRef.current;
      const nextCfg: HifzConfig = {
        ...prevCfg,
        surahId,
        startVerse: verseNumber,
        endVerse: verseNumber,
        repeatCount: normalized,
      };

      hifzConfigRef.current = nextCfg;
      setHifzConfig(nextCfg);
      repeatModeRef.current = 'verse';
      setRepeatMode('verse');

      const nextSession: HifzSessionState = {
        status: 'playing',
        mode: 'verse',
        surahId,
        startVerse: verseNumber,
        endVerse: verseNumber,
        currentVerseNumber: verseNumber,
        currentRepetition: 1,
        repeatCount: normalized,
        pauseSeconds: nextCfg.pauseSeconds,
        strategy: nextCfg.strategy,
        pauseRemainingSec: 0,
      };
      hifzSessionRef.current = nextSession;
      setHifzSession(nextSession);
      persistHifzProgress(nextCfg, verseNumber, 1);

      void loadAndPlay(reciter, surahId, verseNumber, true);
    },
    [clearPauseTimer, loadAndPlay, persistHifzProgress],
  );

  const pauseSession = useCallback(() => {
    const audio = audioRef.current;
    clearPauseTimer();
    isHandlingVerseEndRef.current = false;
    if (audio && !audio.paused) {
      audio.pause();
    }
    if (repeatModeRef.current !== 'none' || hifzSessionRef.current.status !== 'idle') {
      setHifzSession((prev) => ({
        ...prev,
        status: 'paused',
        pauseRemainingSec: 0,
      }));
    }
  }, [clearPauseTimer]);

  const resumeSession = useCallback(() => {
    const audio = audioRef.current;
    const reciter = activeReciterRef.current;
    if (!audio || !reciter) return;

    // If paused during an inter-repetition wait, execute the pending next repetition immediately
    if (pendingNextStepRef.current) {
      const pending = pendingNextStepRef.current;
      executeVerseTransition(pending.surahId, pending.verseNumber, pending.repetition);
      return;
    }

    if (repeatModeRef.current !== 'none') {
      const sess = hifzSessionRef.current;
      if (sess.status === 'completed') {
        startHifzSession();
        return;
      }
      setHifzSession((prev) => ({ ...prev, status: 'playing', pauseRemainingSec: 0 }));
      if (!audio.src || activeSurahIdRef.current !== sess.surahId) {
        void loadAndPlay(reciter, sess.surahId, sess.currentVerseNumber, true);
        return;
      }
    }

    if (audio.paused && audio.src) {
      void audio.play().catch(() => {
        setAudioError('Lecture impossible, veuillez réessayer.');
      });
    }
  }, [executeVerseTransition, loadAndPlay, startHifzSession]);

  const togglePlayPause = useCallback(
    (fallbackSurahId = 1, fallbackVerseNumber = 1) => {
      const audio = audioRef.current;
      const reciter = activeReciterRef.current;
      if (!audio || !reciter) return;

      if (hifzSessionRef.current.status === 'pausing_between') {
        pauseSession();
        return;
      }

      if (!audio.src) {
        if (repeatModeRef.current !== 'none') {
          startHifzSession();
        } else {
          void loadAndPlay(reciter, fallbackSurahId, fallbackVerseNumber, true);
        }
        return;
      }

      if (audio.paused) {
        resumeSession();
      } else {
        pauseSession();
      }
    },
    [loadAndPlay, pauseSession, resumeSession, startHifzSession],
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    clearPauseTimer();
    pendingNextStepRef.current = null;
    isHandlingVerseEndRef.current = false;
    setLockedVerseKey(null);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrentTime(0);
    setIsPlaying(false);
    setPerVerseActiveKey(null);
    lastNotifiedVerseRef.current = null;
    setHifzSession((prev) => ({
      ...prev,
      status: 'idle',
      currentRepetition: 1,
      pauseRemainingSec: 0,
    }));
  }, [clearPauseTimer]);

  const restartCurrentVerse = useCallback(() => {
    clearPauseTimer();
    pendingNextStepRef.current = null;
    isHandlingVerseEndRef.current = false;
    const sess = hifzSessionRef.current;
    const surahId =
      repeatModeRef.current !== 'none' ? sess.surahId : activeSurahIdRef.current;
    const verseNum =
      repeatModeRef.current !== 'none'
        ? sess.currentVerseNumber
        : parseVerseKey(syncVerseKeyRef.current ?? `${surahId}:1`).verseNumber;

    executeVerseTransition(surahId, verseNum, sess.currentRepetition || 1);
  }, [clearPauseTimer, executeVerseTransition]);

  const jumpVerse = useCallback(
    (direction: 'next' | 'prev') => {
      const reciter = activeReciterRef.current;
      const surahId = activeSurahIdRef.current;
      if (!reciter) return;

      clearPauseTimer();
      pendingNextStepRef.current = null;
      isHandlingVerseEndRef.current = false;
      setLockedVerseKey(null);

      // Inside active range/Hifz mode, step cleanly within [startVerse, endVerse]
      if (repeatModeRef.current === 'range') {
        const cfg = hifzConfigRef.current;
        const sess = hifzSessionRef.current;
        const nextV =
          direction === 'next'
            ? Math.min(cfg.endVerse, sess.currentVerseNumber + 1)
            : Math.max(cfg.startVerse, sess.currentVerseNumber - 1);
        const nextRep = cfg.strategy === 'individual' ? 1 : sess.currentRepetition;
        executeVerseTransition(cfg.surahId, nextV, nextRep);
        return;
      }

      if (reciter.provider === 'qurancom' && chapterAudioRef.current) {
        const audio = audioRef.current;
        const targetKey = getAdjacentVerseKey(
          chapterAudioRef.current.timestamps,
          syncVerseKeyRef.current,
          direction,
        );
        if (targetKey && audio) {
          const { verseNumber } = parseVerseKey(targetKey);
          if (repeatModeRef.current === 'verse') {
            executeVerseTransition(surahId, verseNumber, 1);
            return;
          }
          const ts = findVerseTimestampByKey(chapterAudioRef.current, targetKey);
          if (ts) {
            audio.currentTime = ts.timestamp_from / 1000;
            if (!isPlaying) {
              void audio.play().catch(() => {});
            }
            return;
          }
        }
        if (!targetKey && direction === 'next' && surahId < 114) {
          void loadAndPlay(reciter, surahId + 1, 1, true);
        } else if (!targetKey && direction === 'prev' && surahId > 1) {
          void loadAndPlay(reciter, surahId - 1, 1, true);
        }
      } else {
        const currentKey = syncVerseKeyRef.current ?? `${surahId}:1`;
        const { verseNumber } = parseVerseKey(currentKey);
        const total = chapterMetaRef.current.length || 1;
        if (direction === 'next') {
          if (verseNumber < total) {
            void loadAndPlay(reciter, surahId, verseNumber + 1, true);
          } else if (surahId < 114) {
            void loadAndPlay(reciter, surahId + 1, 1, true);
          }
        } else {
          if (verseNumber > 1) {
            void loadAndPlay(reciter, surahId, verseNumber - 1, true);
          } else if (surahId > 1) {
            void loadAndPlay(reciter, surahId - 1, 1, true);
          }
        }
      }
    },
    [clearPauseTimer, executeVerseTransition, isPlaying, loadAndPlay],
  );

  const selectReciter = useCallback(
    (reciterId: string) => {
      const nextReciter = reciters.find((r) => r.id === reciterId);
      if (!nextReciter) return;
      const wasPlaying = isPlaying || Boolean(audioRef.current?.src);
      const currentKey = lockedVerseKey ?? syncVerseKeyRef.current;
      const parsed = currentKey
        ? parseVerseKey(currentKey)
        : {
            surahId:
              repeatModeRef.current !== 'none'
                ? hifzSessionRef.current.surahId
                : activeSurahIdRef.current,
            verseNumber:
              repeatModeRef.current !== 'none'
                ? hifzSessionRef.current.currentVerseNumber
                : 1,
          };

      setActiveReciter(nextReciter);
      setHifzConfig((prev) => ({ ...prev, reciterId: nextReciter.id }));
      if (wasPlaying) {
        void loadAndPlay(nextReciter, parsed.surahId, parsed.verseNumber, isPlaying);
      }
    },
    [reciters, isPlaying, lockedVerseKey, loadAndPlay],
  );

  const seekToTime = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || seconds, seconds));
    setCurrentTime(audio.currentTime);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      audioRef.current.muted = clamped === 0;
    }
    setIsMuted(clamped === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  }, [isMuted]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  return {
    reciters,
    recitersLoading,
    activeReciter,
    activeSurahId,
    chapterVersesCount: chapterVersesMeta.length,
    isPlaying,
    isBuffering,
    audioError,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    repeatMode,
    continuousPlay,
    hifzConfig,
    hifzSession,
    savedHifz,
    sync,
    playFromVerse,
    togglePlayPause,
    pauseSession,
    resumeSession,
    stop,
    restartCurrentVerse,
    nextVerse: () => jumpVerse('next'),
    prevVerse: () => jumpVerse('prev'),
    selectReciter,
    seekToTime,
    setVolume,
    toggleMute,
    setPlaybackRate,
    applyRepeatMode,
    updateHifzConfig,
    setVerseRepeatGoal,
    repeatSpecificVerse,
    startHifzSession,
    setContinuousPlay,
  };
}
