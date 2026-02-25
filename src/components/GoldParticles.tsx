import { useEffect, useRef } from "react";

const PARTICLE_COUNT = 54;
const GOLD_COLORS = [
  "rgba(212, 175, 55, 0.6)",
  "rgba(200, 160, 50, 0.45)",
  "rgba(180, 145, 40, 0.35)",
  "rgba(230, 195, 80, 0.5)",
];

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

const GoldParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number>(0);

  useEffect(() => {
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
      size: Math.random() * 2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: -Math.random() * 0.25 - 0.08,
      opacity: 0,
      color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
      life: 0,
      maxLife: 120 + Math.random() * 180,
    });

    particles.current = Array.from({ length: PARTICLE_COUNT }, spawn);

    const animate = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i];
        p.life++;
        p.x += p.speedX;
        p.y += p.speedY;

        // Fade in first 25%, fade out last 25%
        const progress = p.life / p.maxLife;
        if (progress < 0.25) p.opacity = progress / 0.25;
        else if (progress > 0.75) p.opacity = (1 - progress) / 0.25;
        else p.opacity = 1;

        if (p.life >= p.maxLife || p.y < -5 || p.x < -5 || p.x > w + 5) {
          particles.current[i] = spawn();
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.opacity * 0.7;
        ctx.fillStyle = p.color;
        ctx.shadowColor = "rgba(212, 175, 55, 0.4)";
        ctx.shadowBlur = 4;
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export default GoldParticles;
