import { useCallback, useEffect, useRef, useState } from 'react';
import { TOTAL_MUSHAF_PAGES, getSpreadPages } from '../../utils/quranPagination';

export interface FlipAnimationState {
  direction: 'next' | 'prev';
  progress: number; // 0..1
  isDragging: boolean;
  fromPage: number;
  toPage: number;
}

interface UsePageFlipControllerArgs {
  currentPage: number;
  isSpreadMode: boolean;
  onCommitPage: (targetPage: number) => void;
}

/**
 * Weighted hardcover/archival-paper easing: smooth initial lift, fluid sweep, gentle settle.
 */
function easePageTurn(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function usePageFlipController({
  currentPage,
  isSpreadMode,
  onCommitPage,
}: UsePageFlipControllerArgs) {
  const [flipState, setFlipState] = useState<FlipAnimationState | null>(null);
  const flipStateRef = useRef<FlipAnimationState | null>(null);
  flipStateRef.current = flipState;

  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<{
    direction: 'next' | 'prev';
    startX: number;
    fromPage: number;
    toPage: number;
    moved: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  const canGoNext = isSpreadMode
    ? getSpreadPages(currentPage).leftPage < TOTAL_MUSHAF_PAGES
    : currentPage < TOTAL_MUSHAF_PAGES;

  const canGoPrev = isSpreadMode
    ? getSpreadPages(currentPage).rightPage > 1
    : currentPage > 1;

  const cancelAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => cancelAnimation, [cancelAnimation]);

  const computeTargetPage = useCallback(
    (direction: 'next' | 'prev') => {
      if (isSpreadMode) {
        return direction === 'next'
          ? getSpreadPages(currentPage).leftPage + 1
          : Math.max(1, getSpreadPages(currentPage).rightPage - 2);
      }
      return direction === 'next' ? currentPage + 1 : currentPage - 1;
    },
    [currentPage, isSpreadMode],
  );

  const animateProgress = useCallback(
    (
      direction: 'next' | 'prev',
      fromPage: number,
      toPage: number,
      startProgress: number,
      targetProgress: 0 | 1,
    ) => {
      cancelAnimation();
      const distance = Math.abs(targetProgress - startProgress);
      const duration = Math.max(200, Math.round(540 * distance));
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased =
          startProgress === 0 && targetProgress === 1
            ? easePageTurn(t)
            : startProgress + (targetProgress - startProgress) * (1 - Math.pow(1 - t, 3));

        if (t < 1) {
          setFlipState({
            direction,
            progress: eased,
            isDragging: false,
            fromPage,
            toPage,
          });
          rafRef.current = requestAnimationFrame(step);
        } else {
          rafRef.current = null;
          setFlipState(null);
          if (targetProgress === 1) {
            onCommitPage(toPage);
          }
        }
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [cancelAnimation, onCommitPage],
  );

  const triggerFlip = useCallback(
    (direction: 'next' | 'prev') => {
      if (flipStateRef.current) return;
      if (direction === 'next' && !canGoNext) return;
      if (direction === 'prev' && !canGoPrev) return;

      const target = computeTargetPage(direction);
      animateProgress(direction, currentPage, target, 0, 1);
    },
    [canGoNext, canGoPrev, computeTargetPage, currentPage, animateProgress],
  );

  const handleCornerPointerDown = useCallback(
    (direction: 'next' | 'prev', e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (flipStateRef.current) return;
      if (direction === 'next' && !canGoNext) return;
      if (direction === 'prev' && !canGoPrev) return;

      const target = computeTargetPage(direction);
      dragSessionRef.current = {
        direction,
        startX: e.clientX,
        fromPage: currentPage,
        toPage: target,
        moved: false,
      };
    },
    [canGoNext, canGoPrev, computeTargetPage, currentPage],
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session) return;

      const deltaX = e.clientX - session.startX;
      if (Math.abs(deltaX) > 6) {
        session.moved = true;
      }
      if (!session.moved) return;

      const width = containerRef.current?.clientWidth || 600;
      const travel = isSpreadMode ? width * 0.5 : width * 0.62;
      const raw =
        session.direction === 'next' ? deltaX / travel : -deltaX / travel;
      const progress = Math.max(0.02, Math.min(0.98, raw));

      setFlipState({
        direction: session.direction,
        progress,
        isDragging: true,
        fromPage: session.fromPage,
        toPage: session.toPage,
      });
    };

    const onPointerUp = () => {
      const session = dragSessionRef.current;
      if (!session) return;
      dragSessionRef.current = null;

      if (!session.moved) return;
      suppressNextClickRef.current = true;
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 90);

      const latest = flipStateRef.current;
      if (!latest) return;
      const shouldComplete = latest.progress >= 0.24;
      animateProgress(
        latest.direction,
        latest.fromPage,
        latest.toPage,
        latest.progress,
        shouldComplete ? 1 : 0,
      );
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [animateProgress, isSpreadMode]);

  const handleCornerClick = useCallback(
    (direction: 'next' | 'prev') => {
      if (suppressNextClickRef.current) return;
      triggerFlip(direction);
    },
    [triggerFlip],
  );

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (dragSessionRef.current || flipStateRef.current) {
      touchStartRef.current = null;
      return;
    }
    const t = e.touches[0];
    if (t) {
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || dragSessionRef.current || flipStateRef.current || suppressNextClickRef.current) {
        return;
      }
      const end = e.changedTouches[0];
      if (!end) return;

      const dx = end.clientX - start.x;
      const dy = end.clientY - start.y;
      if (Math.abs(dx) < 46 || Math.abs(dx) < Math.abs(dy) * 1.2) return;

      if (dx > 0) {
        triggerFlip('next');
      } else {
        triggerFlip('prev');
      }
    },
    [triggerFlip],
  );

  return {
    containerRef,
    flipState,
    canGoNext,
    canGoPrev,
    triggerFlip,
    handleCornerPointerDown,
    handleCornerClick,
    handleTouchStart,
    handleTouchEnd,
  };
}
