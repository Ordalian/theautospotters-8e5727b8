import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale } from "lucide-react";

const Legal = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/50 bg-background/95 backdrop-blur px-4 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t.back as string}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-bold">{t.legal_title as string}</h1>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-12">
        <section id="copyright">
          <h2 className="text-lg font-semibold mb-2">{t.legal_copyright_title as string}</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {t.legal_copyright_text as string}
          </p>
        </section>

        <section id="privacy">
          <h2 className="text-lg font-semibold mb-2">{t.legal_privacy_title as string}</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {t.legal_privacy_text as string}
          </p>
        </section>

        <section id="terms">
          <h2 className="text-lg font-semibold mb-2">{t.legal_terms_title as string}</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {t.legal_terms_text as string}
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 border-t border-border/50">
          {t.legal_last_updated as string}
        </p>
      </div>
    </div>
  );
};

export default Legal;
