import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { del } from "idb-keyval";

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
        .select("is_temp, temp_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const isTemp = !!(data as { is_temp?: boolean }).is_temp;
      const expiresAt = (data as { temp_expires_at?: string | null }).temp_expires_at;
      if (isTemp && expiresAt && new Date(expiresAt) <= new Date()) {
        await supabase.auth.signOut();
        window.location.assign("/auth?expired=temp");
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, loading]);

  // Temp-try accounts: cleanup when the user leaves the site (close tab / unload)
  useEffect(() => {
    if (!user?.id || loading) return;

    const TRY_DOMAIN = "try.autospotters.local";
    const isTempTry = !!user.email && user.email.endsWith(`@${TRY_DOMAIN}`);
    if (!isTempTry) return;

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const QUERY_CACHE_IDB_KEY = "tqs-react-query-cache";
    const CLEANUP_FN = "temp-try-cleanup";

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;

      const accessToken = session?.access_token;
      if (accessToken && SUPABASE_URL) {
        try {
          // keepalive improves the chance the request is sent while the browser is unloading.
          void fetch(`${SUPABASE_URL}/functions/v1/${CLEANUP_FN}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({}),
            keepalive: true,
          }).catch(() => {});
        } catch {
          // ignore
        }
      }

      // Always wipe local client state so the temporary session leaves no data behind.
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
      try {
        void del(QUERY_CACHE_IDB_KEY);
      } catch {
        // ignore
      }
    };

    window.addEventListener("pagehide", cleanup);
    window.addEventListener("beforeunload", cleanup);
    return () => {
      window.removeEventListener("pagehide", cleanup);
      window.removeEventListener("beforeunload", cleanup);
    };
  }, [user?.id, user?.email, session?.access_token, loading, session]);

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
