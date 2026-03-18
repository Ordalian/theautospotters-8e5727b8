import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BlackGoldBg from "@/components/BlackGoldBg";
import { ArrowLeft, Clock, Trash2, Eye, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const TryoutExplainer = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleProceed = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("manage-tryout", {
        body: { action: "create" },
      });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "Error");
      }
      const { email, password } = res.data;
      // Sign in with the created tryout account
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;
      // Store tryout info in sessionStorage for cleanup
      sessionStorage.setItem("tryout_user_id", res.data.user_id);
      sessionStorage.setItem("tryout_expires_at", res.data.expires_at);
      toast.success(t.tryout_started as string);
      navigate("/home");
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-viewport w-full relative">
      <BlackGoldBg />
      <div className="relative z-10 flex flex-col min-h-viewport">
        <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{t.tryout_title as string}</h1>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4 border border-primary/20">
                  <Eye className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{t.tryout_heading as string}</h2>
                <p className="text-muted-foreground mt-2">{t.tryout_subtitle as string}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
                  <Eye className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{t.tryout_full_access as string}</p>
                    <p className="text-xs text-muted-foreground">{t.tryout_full_access_desc as string}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
                  <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{t.tryout_time_limit as string}</p>
                    <p className="text-xs text-muted-foreground">{t.tryout_time_limit_desc as string}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                  <Trash2 className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{t.tryout_data_erased as string}</p>
                    <p className="text-xs text-muted-foreground">{t.tryout_data_erased_desc as string}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">{t.tryout_warning as string}</p>
              </div>

              <Button
                onClick={handleProceed}
                disabled={loading}
                className="w-full font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t.loading as string}
                  </>
                ) : (
                  t.tryout_proceed as string
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                {t.tryout_have_account as string}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/auth")}
                  className="text-primary hover:underline"
                >
                  {t.auth_sign_in as string}
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TryoutExplainer;
