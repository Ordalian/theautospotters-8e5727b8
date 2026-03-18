import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isTryout: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInTryout: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTryout, setIsTryout] = useState(false);

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

  // Temp accounts: if expired, sign out and redirect. Also load is_tryout.
  useEffect(() => {
    if (!user?.id || loading) {
      setIsTryout(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_temp, temp_expires_at, is_tryout")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const isTemp = !!(data as { is_temp?: boolean }).is_temp;
      const expiresAt = (data as { temp_expires_at?: string | null }).temp_expires_at;
      const tryout = !!(data as { is_tryout?: boolean }).is_tryout;
      setIsTryout(tryout);
      if (isTemp && expiresAt && new Date(expiresAt) <= new Date()) {
        await supabase.auth.signOut();
        window.location.assign("/auth?expired=temp");
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, loading]);

  // Tryout: on leave (tab close / navigate away), delete data and sign out
  useEffect(() => {
    if (!isTryout || !user?.id) return;
    const cleanup = () => {
      supabase.rpc("delete_tryout_user").then(() => supabase.auth.signOut()).catch(() => {});
    };
    const onPageHide = () => cleanup();
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [isTryout, user?.id]);

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

  const signInTryout = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    if (data.user?.id) {
      await supabase.from("profiles").update({ is_tryout: true }).eq("user_id", data.user.id);
    }
  };

  const signOut = async () => {
    if (isTryout && user?.id) {
      await supabase.rpc("delete_tryout_user");
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isTryout, signUp, signIn, signInTryout, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
