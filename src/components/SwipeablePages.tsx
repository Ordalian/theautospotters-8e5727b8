import { useState, useRef, useCallback, ReactNode } from "react";

interface SwipeablePagesProps {
  pages: ReactNode[];
  initialPage?: number;
  onPageChange?: (index: number) => void;
}

const SwipeablePages = ({ pages, initialPage = 0, onPageChange }: SwipeablePagesProps) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);

  const THRESHOLD = 60;

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, index));
    setCurrentPage(clamped);
    setOffset(0);
    onPageChange?.(clamped);
  }, [pages.length, onPageChange]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = delta;
    // Resist overscroll at edges
    if ((currentPage === 0 && delta > 0) || (currentPage === pages.length - 1 && delta < 0)) {
      setOffset(delta * 0.3);
    } else {
      setOffset(delta);
    }
  };

  const onTouchEnd = () => {
    setDragging(false);
    if (touchDeltaX.current < -THRESHOLD && currentPage < pages.length - 1) {
      goTo(currentPage + 1);
    } else if (touchDeltaX.current > THRESHOLD && currentPage > 0) {
      goTo(currentPage - 1);
    } else {
      setOffset(0);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden" ref={containerRef}>
      {/* Dots indicator */}
      <div className="absolute top-0 left-0 right-0 z-30 flex justify-center gap-1.5 pt-1 pb-0 pointer-events-none">
        {pages.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${i === currentPage ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
          />
        ))}
      </div>
      <div
        className="flex h-full"
        style={{
          transform: `translateX(calc(-${currentPage * 100}% + ${offset}px))`,
          transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
          width: `${pages.length * 100}%`,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {pages.map((page, i) => (
          <div key={i} className="w-full h-full overflow-y-auto" style={{ flex: `0 0 ${100 / pages.length}%` }}>
            {page}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SwipeablePages;
