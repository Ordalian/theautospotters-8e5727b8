import { useEffect, useRef } from "react";
import { useTheme, type ThemeId } from "@/hooks/useTheme";

const PREMIUM_STYLES_WITH_PARTICLES: ThemeId[] = [
  "style-neon",
  "style-gold",
  "style-cyber",
  "style-cosmic",
];

const PARTICLE_COUNT = 72;

const THEME_COLORS: Record<string, string[]> = {
  "style-neon": [
    "rgba(168, 85, 247, 0.5)",
    "rgba(232, 121, 249, 0.4)",
    "rgba(192, 132, 252, 0.35)",
    "rgba(167, 139, 250, 0.45)",
  ],
  "style-gold": [
    "rgba(234, 179, 8, 0.5)",
    "rgba(252, 211, 77, 0.4)",
    "rgba(245, 158, 11, 0.35)",
    "rgba(250, 204, 21, 0.45)",
  ],
  "style-cyber": [
    "rgba(6, 182, 212, 0.5)",
    "rgba(34, 211, 238, 0.4)",
    "rgba(34, 211, 238, 0.35)",
    "rgba(103, 232, 249, 0.45)",
  ],
  "style-cosmic": [
    "rgba(139, 92, 246, 0.5)",
    "rgba(167, 139, 250, 0.4)",
    "rgba(196, 181, 253, 0.35)",
    "rgba(129, 140, 248, 0.45)",
  ],
};

const THEME_SHADOW: Record<string, string> = {
  "style-neon": "rgba(168, 85, 247, 0.35)",
  "style-gold": "rgba(234, 179, 8, 0.35)",
  "style-cyber": "rgba(6, 182, 212, 0.35)",
  "style-cosmic": "rgba(139, 92, 246, 0.35)",
};

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  driftPhase: number;
  driftAmplitude: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

const ThemeParticles = () => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number>(0);

  const active = PREMIUM_STYLES_WITH_PARTICLES.includes(theme);

  useEffect(() => {
    if (!active) return;
    const colors = THEME_COLORS[theme];
    const shadowColor = THEME_SHADOW[theme];
    if (!colors?.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = (): Particle => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      size: Math.random() * 2.2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.2,
      speedY: -Math.random() * 0.25 - 0.05,
      driftPhase: Math.random() * Math.PI * 2,
      driftAmplitude: 0.1 + Math.random() * 0.15,
      opacity: 0,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      life: 0,
      maxLife: 180 + Math.random() * 220,
    });

    particles.current = Array.from({ length: PARTICLE_COUNT }, spawn);

    const animate = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const time = performance.now() * 0.001;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i]!;
        p.life++;
        const drift = Math.sin(time + p.driftPhase) * p.driftAmplitude;
        p.x += p.speedX + drift;
        p.y += p.speedY;

        const progress = p.life / p.maxLife;
        if (progress < 0.2) p.opacity = progress / 0.2;
        else if (progress > 0.8) p.opacity = (1 - progress) / 0.2;
        else p.opacity = 1;

        if (p.life >= p.maxLife || p.y < -10 || p.x < -10 || p.x > w + 10) {
          particles.current[i] = spawn();
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.opacity * 0.78;
        ctx.fillStyle = p.color;
        ctx.shadowColor = shadowColor ?? p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      raf.current = requestAnimationFrame(animate);
    };

    raf.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
    };
  }, [theme, active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{ width: "100%", height: "100%" }}
      aria-hidden
    />
  );
};

export default ThemeParticles;
