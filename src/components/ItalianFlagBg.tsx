import { useEffect, useState } from "react";

const ItalianFlagBg = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const offset = scrollY * 0.15;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.07]">
      <div
        className="absolute inset-[-50%] w-[200%] h-[200%]"
        style={{
          transform: `translateY(${offset}px) rotate(-25deg)`,
          background: `repeating-linear-gradient(
            90deg,
            #009246 0px,
            #009246 80px,
            transparent 80px,
            transparent 120px,
            #ce2b37 120px,
            #ce2b37 200px,
            transparent 200px,
            transparent 240px
          )`,
        }}
      />
    </div>
  );
};

export default ItalianFlagBg;
