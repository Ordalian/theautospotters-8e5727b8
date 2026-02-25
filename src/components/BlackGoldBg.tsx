import { useTheme } from "@/hooks/useTheme";

const THEME_GRADIENTS: Record<string, string> = {
  "noir-or": `
    linear-gradient(145deg, #070707 0%, #0e0e0e 40%, #090909 100%),
    radial-gradient(ellipse 90% 60% at 25% -10%, rgba(160, 135, 50, 0.04) 0%, transparent 50%),
    radial-gradient(ellipse 50% 30% at 85% 95%, rgba(140, 115, 40, 0.025) 0%, transparent 50%)
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

const MARBLE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.006' numOctaves='4' seed='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='800' height='800' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`;

const MARBLE_GOLD_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Cdefs%3E%3Cfilter id='v'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.003' numOctaves='3' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.6 0 0 0 0 0.5 0 0 0 0 0.2 0 0 0 1 0'/%3E%3C/filter%3E%3C/defs%3E%3Crect width='600' height='600' filter='url(%23v)' opacity='0.025'/%3E%3C/svg%3E")`;

interface BlackGoldBgProps {
  showMarble?: boolean;
}

const BlackGoldBg = ({ showMarble = false }: BlackGoldBgProps) => {
  const { theme } = useTheme();
  const gradient = THEME_GRADIENTS[theme] || THEME_GRADIENTS["noir-or"];
  const isNoirOr = !theme || theme === "noir-or";

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ backgroundImage: gradient }}
      />
      {showMarble && isNoirOr && (
        <>
          <div
            className="pointer-events-none fixed inset-0 z-0"
            style={{
              backgroundImage: MARBLE_SVG,
              backgroundSize: "800px 800px",
              mixBlendMode: "screen",
            }}
          />
          <div
            className="pointer-events-none fixed inset-0 z-0"
            style={{
              backgroundImage: MARBLE_GOLD_SVG,
              backgroundSize: "600px 600px",
              mixBlendMode: "screen",
            }}
          />
        </>
      )}
    </>
  );
};

export default BlackGoldBg;
