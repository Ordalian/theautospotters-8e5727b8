import { useState, useRef, useCallback, ReactNode } from "react";

interface SwipeablePagesProps {
  pages: ReactNode[];
  initialPage?: number;
  onPageChange?: (index: number) => void;
}

const SwipeablePages = ({ pages, initialPage = 0, onPageChange }: SwipeablePagesProps) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const directionLocked = useRef<"h" | "v" | null>(null);

  const THRESHOLD = 60;
  const LOCK_THRESHOLD = 10;

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, index));
    setCurrentPage(clamped);
    setOffset(0);
    onPageChange?.(clamped);
  }, [pages.length, onPageChange]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    directionLocked.current = null;
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Lock direction after small movement
    if (!directionLocked.current) {
      if (Math.abs(dx) > LOCK_THRESHOLD || Math.abs(dy) > LOCK_THRESHOLD) {
        directionLocked.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
      return;
    }

    // If vertical scroll, don't interfere
    if (directionLocked.current === "v") return;

    // Horizontal swipe
    touchDeltaX.current = dx;
    if ((currentPage === 0 && dx > 0) || (currentPage === pages.length - 1 && dx < 0)) {
      setOffset(dx * 0.3);
    } else {
      setOffset(dx);
    }
  };

  const onTouchEnd = () => {
    setDragging(false);
    if (directionLocked.current === "h") {
      if (touchDeltaX.current < -THRESHOLD && currentPage < pages.length - 1) {
        goTo(currentPage + 1);
      } else if (touchDeltaX.current > THRESHOLD && currentPage > 0) {
        goTo(currentPage - 1);
      } else {
        setOffset(0);
      }
    } else {
      setOffset(0);
    }
    directionLocked.current = null;
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Dots indicator (safe area for notch) */}
      <div className="absolute top-0 left-0 right-0 z-30 flex justify-center gap-2 pb-0 pointer-events-none" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        {pages.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === currentPage
                ? "w-6 h-1.5 bg-primary"
                : "w-2 h-1.5 bg-muted-foreground/40"
            }`}
          />
        ))}
      </div>
      <div
        className="flex h-full"
        style={{
          transform: `translateX(calc(-${currentPage * (100 / pages.length)}% + ${offset}px))`,
          transition: dragging && directionLocked.current === "h" ? "none" : "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
          width: `${pages.length * 100}%`,
        }}
      >
        {pages.map((page, i) => (
          <div key={i} className="w-full h-full min-w-0 min-h-0 overflow-y-auto overflow-x-hidden" style={{ flex: `0 0 ${100 / pages.length}%`, isolation: "isolate" }}>
            {page}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SwipeablePages;
