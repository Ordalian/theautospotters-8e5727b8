import { useEffect } from "react";

interface SplashScreenProps {
  fading: boolean;
  onDone: () => void;
}

export function SplashScreen({ fading, onDone }: SplashScreenProps) {
  useEffect(() => {
    if (fading) {
      const t = setTimeout(onDone, 600);
      return () => clearTimeout(t);
    }
  }, [fading, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <img src="/splash.gif" alt="" className="w-48 h-48 object-contain" />
    </div>
  );
}
