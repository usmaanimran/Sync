import { useRef, useCallback } from 'react';

const SHEET_OPEN_TRANSITION = 'transform 0.52s cubic-bezier(0.32, 0.72, 0, 1), visibility 0s';
const SHEET_CLOSE_TRANSITION = 'transform 0.28s cubic-bezier(0.5, 0, 1, 1), visibility 0s 0.28s';
const SHEET_SNAPBACK_TRANSITION = 'transform 0.42s cubic-bezier(0.34, 1.2, 0.64, 1), visibility 0s';

const BACKDROP_OPEN_TRANSITION = 'opacity 0.42s cubic-bezier(0.32, 0.72, 0, 1), visibility 0s';
const BACKDROP_CLOSE_TRANSITION = 'opacity 0.24s ease-in, visibility 0s 0.24s';
const BACKDROP_SNAPBACK_TRANSITION = 'opacity 0.38s cubic-bezier(0.32, 0.72, 0, 1), visibility 0s';
const FLING_VELOCITY_THRESHOLD = 0.5;

export default function useSheetDrag(
  isOpen: boolean,
  onClose: () => void,
  { closeThreshold, opacityDivisor }: { closeThreshold: number; opacityDivisor: number }
) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const startY = useRef(0);
  const rawOffset = useRef(0);       
  const visualY = useRef(0);         
  const dragging = useRef(false);
  const frame = useRef<number | null>(null);
  const velSamples = useRef<{ dy: number; dt: number }[]>([]);
  const lastY = useRef(0);
  const lastTime = useRef(0);

  const rubberBand = (delta: number): number => {
    if (delta <= 0) return 0;
    const LINEAR_ZONE = 12;
    if (delta <= LINEAR_ZONE) return delta;
    return LINEAR_ZONE + Math.sqrt((delta - LINEAR_ZONE) * 18);
  };

  const paint = useCallback(() => {
    frame.current = null;
    const y = visualY.current;
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    if (sheet) {
      sheet.style.transition = 'none';
      sheet.style.transform = `translateY(${y}px)`;
    }
    if (backdrop) {
      backdrop.style.transition = 'none';
      const t = Math.max(0, Math.min(1, 1 - y / opacityDivisor));
      backdrop.style.opacity = String(t * (2 - t));
    }
  }, [opacityDivisor]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const clientY = e.touches[0].clientY;
    startY.current = clientY;
    lastY.current = clientY;
    lastTime.current = performance.now();
    rawOffset.current = 0;
    visualY.current = 0;
    velSamples.current = [];
    dragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return;
    const clientY = e.touches[0].clientY;
    const now = performance.now();
    const dt = now - lastTime.current;
    const dy = clientY - lastY.current;
    lastY.current = clientY;
    lastTime.current = now;
    if (dt > 0) velSamples.current.push({ dy, dt });

    if (velSamples.current.length > 12) velSamples.current.shift();
    rawOffset.current = clientY - startY.current;
    visualY.current = rubberBand(rawOffset.current);
    if (frame.current == null) {
      frame.current = requestAnimationFrame(paint);
    }
  }, [paint]);

  const handleTouchEnd = useCallback(() => {
    dragging.current = false;
    if (frame.current != null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    const samples = velSamples.current;
    let avgVelocity = 0;
    if (samples.length > 0) {
      const totalDy = samples.reduce((s, x) => s + x.dy, 0);
      const totalDt = samples.reduce((s, x) => s + x.dt, 0);
      avgVelocity = totalDt > 0 ? totalDy / totalDt : 0;
    }
    velSamples.current = [];

    const draggedFarEnough = rawOffset.current > closeThreshold;
    const flickedDownFast  = rawOffset.current > 8 && avgVelocity > FLING_VELOCITY_THRESHOLD;
    const shouldClose = draggedFarEnough || flickedDownFast;

    rawOffset.current = 0;
    visualY.current = 0;

    if (shouldClose) {
      onClose();
    } else if (sheetRef.current && backdropRef.current) {
      sheetRef.current.style.transition = SHEET_SNAPBACK_TRANSITION;
      sheetRef.current.style.transform = 'translateY(0px)';
      backdropRef.current.style.transition = BACKDROP_SNAPBACK_TRANSITION;
      backdropRef.current.style.opacity = '1';
    }
  }, [closeThreshold, onClose]);

  const sheetStyle: React.CSSProperties = {
    transform: isOpen ? 'translateY(0px)' : 'translateY(100%)',
    visibility: isOpen ? 'visible' : 'hidden', // <-- ADD THIS
    transition: isOpen ? SHEET_OPEN_TRANSITION : SHEET_CLOSE_TRANSITION,
    willChange: 'transform',
    contain: 'layout style',
  };

  const backdropStyle: React.CSSProperties = {
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden', // <-- ADD THIS
    transition: isOpen ? BACKDROP_OPEN_TRANSITION : BACKDROP_CLOSE_TRANSITION,
    willChange: 'opacity',
  };

  return { sheetRef, backdropRef, handleTouchStart, handleTouchMove, handleTouchEnd, sheetStyle, backdropStyle };
}