import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Temp accounts: if expired, sign out and redirect
  useEffect(() => {
    if (!user?.id || loading) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_temp, temp_expires_at, is_tryout, tryout_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const d = data as any;
      // Temp account expiry
      if (d.is_temp && d.temp_expires_at && new Date(d.temp_expires_at) <= new Date()) {
        await supabase.auth.signOut();
        window.location.assign("/auth?expired=temp");
        return;
      }
      // Tryout account expiry
      if (d.is_tryout && d.tryout_expires_at && new Date(d.tryout_expires_at) <= new Date()) {
        // Cleanup tryout data
        try {
          await supabase.functions.invoke("manage-tryout", {
            body: { action: "cleanup", user_id: user.id },
          });
        } catch {}
        sessionStorage.removeItem("tryout_user_id");
        sessionStorage.removeItem("tryout_expires_at");
        await supabase.auth.signOut();
        window.location.assign("/auth?expired=tryout");
        return;
      }
      // Store tryout info if it's a tryout user
      if (d.is_tryout) {
        sessionStorage.setItem("tryout_user_id", user.id);
        if (d.tryout_expires_at) sessionStorage.setItem("tryout_expires_at", d.tryout_expires_at);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, loading]);

  // Tryout cleanup on page unload
  useEffect(() => {
    const handleUnload = () => {
      const tryoutUserId = sessionStorage.getItem("tryout_user_id");
      if (!tryoutUserId) return;
      // Use sendBeacon for reliable cleanup on close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-tryout`;
      const body = JSON.stringify({ action: "cleanup", user_id: tryoutUserId });
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      sessionStorage.removeItem("tryout_user_id");
      sessionStorage.removeItem("tryout_expires_at");
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
