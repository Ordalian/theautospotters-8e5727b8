import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import BlackGoldBg from "@/components/BlackGoldBg";
import { Car, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TryoutInfo = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { signInTryout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleProceed = async () => {
    setLoading(true);
    try {
      await signInTryout();
      toast.success(t.tryout_started as string);
      navigate("/home", { replace: true });
    } catch (e) {
      toast.error(t.auth_error as string);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-viewport w-full max-w-full overflow-x-hidden relative">
      <BlackGoldBg />

      <div className="relative z-10 flex flex-col min-h-viewport w-full max-w-full items-center justify-center px-4 py-10">
        <div className="mx-auto max-w-md w-full space-y-8">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Car className="h-10 w-10 text-primary" />
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-center text-foreground">
            {t.tryout_title as string}
          </h1>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {t.tryout_warning as string}
            </p>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {t.tryout_desc as string}
          </p>

          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={handleProceed} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t.loading as string}
                </>
              ) : (
                (t.tryout_proceed as string)
              )}
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link to="/">{t.back as string}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TryoutInfo;
