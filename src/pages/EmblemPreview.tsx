/**
 * Preview page: all 10 emblem levels side by side.
 * Route: /emblem-preview (add in App.tsx for dev or keep for demo)
 */
import { useNavigate } from "react-router-dom";
import { Emblem } from "@/components/Emblem";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const EmblemPreview = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6 pb-12">
      <header className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Blasons · 10 niveaux</h1>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 max-w-2xl mx-auto">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
          <div
            key={level}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card"
          >
            <Emblem level={level} size={80} />
            <span className="text-sm font-medium">
              {level === 0 ? "0 (verrouillé)" : `Niveau ${level}`}
            </span>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8 max-w-md mx-auto">
        Du plus simple (niveau 1) au plus détaillé (niveau 10). Niveau 0 = blason non débloqué.
      </p>
    </div>
  );
};

export default EmblemPreview;
