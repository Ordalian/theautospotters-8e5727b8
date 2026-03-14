import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Car, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";

const PWD_RULES = [
  { key: "pwd_min_length", test: (p: string) => p.length >= 8 },
  { key: "pwd_uppercase", test: (p: string) => /[A-Z]/.test(p) },
  { key: "pwd_lowercase", test: (p: string) => /[a-z]/.test(p) },
  { key: "pwd_digit", test: (p: string) => /\d/.test(p) },
  { key: "pwd_symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

const ResetPassword = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    let resolved = false;
    const done = (hasSession: boolean) => {
      if (resolved) return;
      resolved = true;
      setHasRecoverySession(hasSession);
      setCheckingSession(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "INITIAL_SESSION" && session?.user)) {
        done(!!session?.user);
      }
    });

    const timeoutId = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) done(true);
        else done(false);
      });
    }, 4000);

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const pwdValid = PWD_RULES.every((r) => r.test(password));
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = pwdValid && passwordsMatch && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdValid) {
      toast.error(t.pwd_weak as string);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t.auth_reset_password_mismatch as string);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success(t.auth_reset_success as string);
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast.error(err.message || (t.auth_error as string));
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-viewport items-center justify-center bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasRecoverySession) {
    return (
      <div className="flex min-h-viewport items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">{t.auth_reset_new_title as string}</CardTitle>
            <CardDescription>{t.auth_reset_invalid_link as string}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/auth">{t.auth_sign_in as string}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-viewport items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.auth_reset_new_title as string}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.auth_reset_new_desc as string}</p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t.auth_password as string}</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t.auth_password as string}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-secondary/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <ul className="space-y-1 text-xs mt-1">
                    {PWD_RULES.map((r) => (
                      <li key={r.key} className={`flex items-center gap-1.5 ${r.test(password) ? "text-green-500" : "text-muted-foreground"}`}>
                        {r.test(password) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {t[r.key] as string}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t.auth_reset_confirm_label as string}</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder={t.auth_reset_confirm_placeholder as string}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-secondary/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-xs ${passwordsMatch ? "text-green-500" : "text-destructive"}`}>
                    {passwordsMatch ? "✓ " + (t.auth_reset_confirm_label as string) : (t.auth_reset_password_mismatch as string)}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full font-semibold" disabled={!canSubmit}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (t.auth_reset_btn as string)}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary">
            {t.back as string} {t.auth_sign_in as string}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
