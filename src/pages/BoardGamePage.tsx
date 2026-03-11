import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { BoardGame } from "@/components/game/BoardGame";
import type { DeckCard } from "@/components/game/BoardSetup";
import { ALL_GAME_CARDS } from "@/data/gameCards";
import type { CardCondition } from "@/data/gameCards";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function buildDemoDeck(size: number): DeckCard[] {
  return ALL_GAME_CARDS.slice(0, size).map((c) => ({
    ...c,
    condition: "good" as CardCondition,
  }));
}

export default function BoardGamePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const deck = useMemo(() => buildDemoDeck(10), []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label={t.back as string}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">
          {t.board_game_title as string}
        </h1>
      </header>
      <main className="pb-8">
        <BoardGame
          deckPlayer1={deck}
          deckPlayer2={[...deck]}
          onGameEnd={() => {}}
        />
      </main>
    </div>
  );
}
