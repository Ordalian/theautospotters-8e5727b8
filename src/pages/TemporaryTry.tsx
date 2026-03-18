import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import BlackGoldBg from "@/components/BlackGoldBg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Car } from "lucide-react";

type TempTryCreateResponse = {
  email?: string;
  password?: string;
  user?: { email?: string; password?: string };
  error?: string;
};

const TEMP_TRY_CREATE_FN = "temp-try-create";

export default function TemporaryTry() {
  const { user, signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/home", { replace: true });
  }, [user, navigate]);

  const handleProceed = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke(TEMP_TRY_CREATE_FN, { body: {} });
      if (res.error) throw new Error(res.error.message);

      const payload = res.data as TempTryCreateResponse | undefined;
      const email = payload?.email ?? payload?.user?.email;
      const password = payload?.password ?? payload?.user?.password;
      if (!email || !password) throw new Error("Réponse invalide du serveur.");

      await signIn(email, password);
      navigate("/home", { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? (t.error as string));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-viewport w-full max-w-full overflow-x-hidden relative">
      <BlackGoldBg />

      <div className="relative z-10 flex min-h-viewport items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Car className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">{t.temporary_try_title as string}</h1>
            <p className="mt-2 text-muted-foreground slogan-tagline">{t.temporary_try_subtitle as string}</p>
          </div>

          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{t.temporary_try_card_title as string}</CardTitle>
              <CardDescription>{t.temporary_try_card_desc as string}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{t.temporary_try_explanation as string}</p>
              <Button
                onClick={handleProceed}
                className="w-full font-semibold"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (t.temporary_try_proceed as string)}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                {(t.back as string)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

