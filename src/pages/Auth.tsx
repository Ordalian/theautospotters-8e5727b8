import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, type Language } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Car, Globe, Eye, EyeOff, Check, X } from "lucide-react";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signUpLanguage, setSignUpLanguage] = useState<Language | null>(null);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [tempAccessMode, setTempAccessMode] = useState(false);
  const [tempCode, setTempCode] = useState("");
  const [signupsEnabled, setSignupsEnabled] = useState(true);

  useEffect(() => {
    supabase.from("app_config").select("value").eq("key", "signups_enabled").maybeSingle().then(({ data }) => {
      if (data) setSignupsEnabled(data.value === true || data.value === "true");
    });
  }, []);
  const { signIn, signUp } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("expired") === "temp") {
      toast.error(t.auth_temp_expired as string);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, t.auth_temp_expired]);

  const pwdRules = [
    { key: "pwd_min_length", test: password.length >= 8 },
    { key: "pwd_uppercase", test: /[A-Z]/.test(password) },
    { key: "pwd_lowercase", test: /[a-z]/.test(password) },
    { key: "pwd_digit", test: /\d/.test(password) },
    { key: "pwd_symbol", test: /[^A-Za-z0-9]/.test(password) },
  ];
  const passwordValid = pwdRules.every((r) => r.test);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotPassword) {
      setLoading(true);
      try {
        const redirectTo = `${window.location.origin}/reset-password`;
        await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        setResetEmailSent(true);
        toast.success(t.auth_reset_sent as string);
      } catch (err: any) {
        toast.error(err.message || (t.auth_error as string));
      } finally {
        setLoading(false);
      }
      return;
    }
    if (isSignUp && !passwordValid) {
      toast.error(t.pwd_weak as string);
      return;
    }
    if (isSignUp && !signUpLanguage) {
      toast.error(t.auth_choose_language as string);
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        if (signUpLanguage) {
          await setLanguage(signUpLanguage);
        }
        toast.success(t.auth_success_signup as string);
      } else {
        await signIn(email, password);
        toast.success(t.auth_success_signin as string);
      }
      navigate("/home");
    } catch (err: any) {
      toast.error(err.message || (t.auth_error as string));
    } finally {
      setLoading(false);
    }
  };

  const handleTempSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = tempCode.trim();
    if (!code) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_temp_login", { p_code: code });
      if (error) throw error;
      const row = (data as { email: string }[] | null)?.[0];
      if (!row?.email) {
        toast.error(t.auth_temp_access_invalid as string);
        setLoading(false);
        return;
      }
      await signIn(row.email, code);
      toast.success(t.auth_success_signin as string);
      navigate("/home");
    } catch (err: any) {
      toast.error(err.message || (t.auth_temp_access_invalid as string));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-viewport items-center justify-center bg-background px-4 w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{t.auth_title as string}</h1>
          <p className="mt-2 text-muted-foreground slogan-tagline">{t.auth_subtitle as string}</p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">
              {tempAccessMode
                ? (t.auth_temp_access_title as string)
                : forgotPassword
                  ? (t.auth_reset_send_title as string)
                  : isSignUp
                    ? (t.auth_create_account as string)
                    : (t.auth_welcome_back as string)}
            </CardTitle>
            <CardDescription>
              {tempAccessMode
                ? (t.auth_temp_access_desc as string)
                : forgotPassword
                  ? (t.auth_reset_send_desc as string)
                  : isSignUp
                    ? (t.auth_join as string)
                    : (t.auth_sign_in_desc as string)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tempAccessMode ? (
              <form onSubmit={handleTempSubmit} className="space-y-4">
                <Input
                  type="password"
                  placeholder={t.auth_temp_access_code_placeholder as string}
                  value={tempCode}
                  onChange={(e) => setTempCode(e.target.value)}
                  required
                  className="bg-secondary/50"
                  autoComplete="one-time-code"
                />
                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading ? (t.loading as string) : (t.auth_sign_in as string)}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setTempAccessMode(false); setTempCode(""); }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t.back as string}
                  </button>
                </div>
              </form>
            ) : resetEmailSent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t.auth_reset_sent as string}</p>
                <Button variant="outline" className="w-full" onClick={() => { setForgotPassword(false); setResetEmailSent(false); }}>
                  {t.back as string}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder={t.auth_email as string}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-secondary/50"
                />
                {!forgotPassword && (
                  <>
                    <div className="relative">
                      <Input
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {isSignUp && password.length > 0 && (
                      <ul className="space-y-1 text-xs">
                        {pwdRules.map((r) => (
                          <li key={r.key} className={`flex items-center gap-1.5 ${r.test ? "text-green-500" : "text-muted-foreground"}`}>
                            {r.test ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {t[r.key] as string}
                          </li>
                        ))}
                      </ul>
                    )}

                    {isSignUp && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                          <Globe className="h-4 w-4" />
                          {t.auth_choose_language as string}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSignUpLanguage("fr")}
                            className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                              signUpLanguage === "fr"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-secondary/30 hover:border-primary/40"
                            }`}
                          >
                            🇫🇷 {t.auth_language_fr as string}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSignUpLanguage("en")}
                            className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                              signUpLanguage === "en"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-secondary/30 hover:border-primary/40"
                            }`}
                          >
                            🇬🇧 {t.auth_language_en as string}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading
                    ? (t.loading as string)
                    : forgotPassword
                      ? (t.auth_reset_send_btn as string)
                      : isSignUp
                        ? (t.auth_sign_up as string)
                        : (t.auth_sign_in as string)}
                </Button>
              </form>
            )}
            {!resetEmailSent && !tempAccessMode && (
              <div className="mt-4 text-center space-y-2">
                {!forgotPassword && !isSignUp && (
                  <>
                    <div>
                      <button
                        type="button"
                        onClick={() => setForgotPassword(true)}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {t.auth_forgot_password as string}
                      </button>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setTempAccessMode(true)}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {t.auth_temp_access as string}
                      </button>
                    </div>
                  </>
                )}
                {forgotPassword ? (
                  <button
                    type="button"
                    onClick={() => setForgotPassword(false)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t.back as string}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isSignUp ? (t.auth_switch_to_login as string) : (t.auth_switch_to_signup as string)}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
