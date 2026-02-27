/**
 * Preview page: all 4 emblem shapes × 10 levels.
 */
import { useNavigate } from "react-router-dom";
import { Emblem } from "@/components/Emblem";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { EmblemShape } from "@/lib/achievements";

const SHAPES: { shape: EmblemShape; label: string }[] = [
  { shape: "shield", label: "Bouclier (Spotter)" },
  { shape: "globe", label: "Globe (Globe-trotter)" },
  { shape: "diamond", label: "Diamant (Chasseur)" },
  { shape: "hexagon", label: "Hexagone (Collectionneur)" },
];

const EmblemPreview = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6 pb-12">
      <header className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Blasons · 4 formes × 10 niveaux</h1>
      </header>

      {SHAPES.map(({ shape, label }) => (
        <div key={shape} className="mb-10">
          <h2 className="text-lg font-semibold mb-4">{label}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 max-w-3xl">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <div
                key={level}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card"
              >
                <Emblem level={level} shape={shape} size={64} />
                <span className="text-xs font-medium">
                  {level === 0 ? "Verrouillé" : `Niv. ${level}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-center text-sm text-muted-foreground mt-4 max-w-md mx-auto">
        Chaque type de succès a sa propre forme de blason unique.
      </p>
    </div>
  );
};

export default EmblemPreview;
