const BlackGoldBg = () => (
  <div
    className="pointer-events-none fixed inset-0 z-0"
    style={{
      background: "linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #0d0d0d 100%)",
      backgroundImage: `
        linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #0d0d0d 100%),
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212, 175, 55, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse 60% 40% at 100% 100%, rgba(212, 175, 55, 0.05) 0%, transparent 50%)
      `,
    }}
  />
);

export default BlackGoldBg;
