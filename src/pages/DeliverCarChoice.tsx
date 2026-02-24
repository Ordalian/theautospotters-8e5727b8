import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, Pencil } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import BlackGoldBg from "@/components/BlackGoldBg";

const DeliverCarChoice = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background relative">
      <BlackGoldBg />
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate("/friends")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.deliver_title as string}</h1>
      </header>

      <div className="relative z-10 p-6 max-w-md mx-auto space-y-4">
        <p className="text-muted-foreground text-sm">{t.deliver_desc as string}</p>
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => navigate("/autospotter?delivery=1")}
            className="flex items-center gap-4 rounded-xl border-2 border-border bg-card p-4 text-left hover:border-primary/40 transition-all"
          >
            <div className="h-14 w-14 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Brain className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <p className="font-bold">{t.deliver_autospotter as string}</p>
              <p className="text-sm text-muted-foreground">{t.deliver_autospotter_desc as string}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigate("/add-car?delivery=1")}
            className="flex items-center gap-4 rounded-xl border-2 border-border bg-card p-4 text-left hover:border-primary/40 transition-all"
          >
            <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Pencil className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-bold">{t.deliver_manual as string}</p>
              <p className="text-sm text-muted-foreground">{t.deliver_manual_desc as string}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliverCarChoice;
