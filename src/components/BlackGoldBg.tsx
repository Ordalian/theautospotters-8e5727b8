import { useTheme } from "@/hooks/useTheme";

const THEME_GRADIENTS: Record<string, string> = {
  "noir-or": `
    linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #0d0d0d 100%),
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212, 175, 55, 0.10) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(212, 175, 55, 0.06) 0%, transparent 50%)
  `,
  "bleu-alpine": `
    linear-gradient(145deg, #050a18 0%, #0d1a3a 50%, #060e20 100%),
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(40, 100, 220, 0.14) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0, 160, 255, 0.08) 0%, transparent 50%)
  `,
  "rose-barbie": `
    linear-gradient(145deg, #10050a 0%, #30081e 50%, #140710 100%),
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(200, 20, 126, 0.22) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(200, 20, 126, 0.12) 0%, transparent 50%)
  `,
  "vert-rallye": `
    linear-gradient(145deg, #040d06 0%, #0a2410 50%, #050e07 100%),
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(39, 174, 96, 0.14) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0, 220, 80, 0.07) 0%, transparent 50%)
  `,
  "glace-arctique": `
    linear-gradient(145deg, #060e18 0%, #0c1e30 50%, #071220 100%),
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(91, 192, 222, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0, 230, 200, 0.08) 0%, transparent 50%)
  `,
  "ferrari-red": `
    linear-gradient(145deg, #0d0505 0%, #2a0a0a 50%, #100606 100%),
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(220, 38, 38, 0.18) 0%, transparent 50%),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(255, 140, 0, 0.08) 0%, transparent 50%)
  `,
};

const BlackGoldBg = () => {
  const { theme } = useTheme();
  const gradient = THEME_GRADIENTS[theme] || THEME_GRADIENTS["noir-or"];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      style={{ backgroundImage: gradient }}
    />
  );
};

export default BlackGoldBg;
