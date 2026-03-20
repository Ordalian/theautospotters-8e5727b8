import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  User,
  Check,
  UserPlus,
  X,
  Car,
  Bell,
  Plus,
  Camera,
  Loader2,
  Globe,
  Scale,
  Download,
  Share,
  Smartphone,
  MoreVertical,
  Trash2,
  EyeOff,
} from "lucide-react";
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed, isPushSupported } from "@/lib/pushNotifications";
import { isStandalone, type BeforeInstallPromptEvent } from "@/lib/pwaUtils";
import UserRoleBadge from "@/components/UserRoleBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { callCarApi } from "@/lib/carApi";
import { resizeImage } from "@/lib/imageUtils";
import { PhotoUploadDialog } from "@/components/PhotoUpload";

interface FriendRequest {
  id: string;
  requester_id: string;
  username: string | null;
}

interface OwnedVehicleRow {
  id: string;
  car_id: string | null;
  license_plate: string;
  created_at: string;
}

interface NotificationRow {
  id: string;
  type: string;
  data: { brand?: string; model?: string; year?: number; spotted_car_id?: string };
  read_at: string | null;
  created_at: string;
}

const NotificationPreferences = ({ user }: { user: any }) => {
  const { t } = useLanguage();
  const [notifyChannels, setNotifyChannels] = useState(true);
  const [notifyDms, setNotifyDms] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const pushSupported = isPushSupported();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("notify_channels, notify_dms")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setNotifyChannels((data as any).notify_channels ?? true);
          setNotifyDms((data as any).notify_dms ?? true);
        }
        setLoaded(true);
      });
    // Check push subscription status
    isPushSubscribed().then(setPushEnabled);
  }, [user]);

  const toggle = async (field: "notify_channels" | "notify_dms", value: boolean) => {
    if (field === "notify_channels") setNotifyChannels(value);
    else setNotifyDms(value);
    await supabase
      .from("profiles")
      .update({ [field]: value } as any)
      .eq("user_id", user.id);
  };

  const handlePushToggle = async (enable: boolean) => {
    setPushLoading(true);
    try {
      if (enable) {
        const ok = await subscribeToPush();
        setPushEnabled(ok);
        if (!ok) toast.error(t.push_not_supported as string);
      } else {
        await unsubscribeFromPush();
        setPushEnabled(false);
      }
    } catch {
      toast.error(t.error as string);
    } finally {
      setPushLoading(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        {t.notif_settings_title as string}
      </h2>
      <div className="space-y-3">
        {pushSupported && (
          <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium">{t.push_notifications as string}</p>
              <p className="text-xs text-muted-foreground">{t.push_notifications_desc as string}</p>
            </div>
            {pushLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => handlePushToggle(e.target.checked)}
                className="h-5 w-5 accent-[hsl(var(--primary))] rounded"
              />
            )}
          </label>
        )}
        <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer">
          <div>
            <p className="text-sm font-medium">{t.notif_channels as string}</p>
            <p className="text-xs text-muted-foreground">{t.notif_channels_desc as string}</p>
          </div>
          <input
            type="checkbox"
            checked={notifyChannels}
            onChange={(e) => toggle("notify_channels", e.target.checked)}
            className="h-5 w-5 accent-[hsl(var(--primary))] rounded"
          />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer">
          <div>
            <p className="text-sm font-medium">{t.notif_dms as string}</p>
            <p className="text-xs text-muted-foreground">{t.notif_dms_desc as string}</p>
          </div>
          <input
            type="checkbox"
            checked={notifyDms}
            onChange={(e) => toggle("notify_dms", e.target.checked)}
            className="h-5 w-5 accent-[hsl(var(--primary))] rounded"
          />
        </label>
      </div>
    </div>
  );
};

const PwaInstallSection = () => {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const standalone = isStandalone();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isFF = /firefox/i.test(navigator.userAgent);

  useEffect(() => {
    if (standalone) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [standalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  // Already installed
  if (standalone) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          {t.pwa_install_title as string}
        </h2>
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-500 shrink-0" />
          <p className="text-sm text-muted-foreground">{t.pwa_settings_installed as string}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-primary" />
        {t.pwa_install_title as string}
      </h2>
      <p className="text-sm text-muted-foreground">{t.pwa_install_desc as string}</p>
      {deferredPrompt ? (
        <Button className="w-full gap-2" onClick={handleInstall}>
          <Download className="h-4 w-4" />
          {t.pwa_install_btn as string}
        </Button>
      ) : isIOS && isSafari ? (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Share className="h-4 w-4 shrink-0" />
            {t.pwa_install_ios_steps as string}
          </p>
        </div>
      ) : isFF ? (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <MoreVertical className="h-4 w-4 shrink-0" />
            {t.pwa_install_firefox_steps as string}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-sm text-muted-foreground">{t.pwa_settings_open_browser as string}</p>
        </div>
      )}
    </div>
  );
};

const ProfileSettings = () => {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [usernameLocked, setUsernameLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [showUsernameConfirmDialog, setShowUsernameConfirmDialog] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [initialUsername, setInitialUsername] = useState<string | null>(null);

  const checkUsernameAvailable = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || !user) {
        setUsernameAvailability("idle");
        return;
      }
      setUsernameAvailability("checking");
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("username", trimmed)
        .neq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      setUsernameAvailability(data ? "taken" : "available");
    },
    [user],
  );

  useEffect(() => {
    if (!username.trim() || usernameLocked) {
      setUsernameAvailability("idle");
      return;
    }
    const timeout = setTimeout(() => checkUsernameAvailable(username), 400);
    return () => clearTimeout(timeout);
  }, [username, usernameLocked, checkUsernameAvailable]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("username, username_locked, is_temp")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.username) {
          setUsername(data.username);
          setInitialUsername(data.username);
        }
        setUsernameLocked(!!(data as any)?.username_locked || !!(data as any)?.is_temp);
      } catch {
        toast.error("Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (data && data.length > 0) {
      const userIds = data.map((r) => r.requester_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, role, is_premium")
        .in("user_id", userIds);
      const profileMap = new Map(
        profiles?.map((p: any) => [p.user_id, { username: p.username, role: p.role, is_premium: p.is_premium }]) || [],
      );
      setRequests(
        data.map((r) => ({
          ...r,
          username: profileMap.get(r.requester_id)?.username || null,
          role: profileMap.get(r.requester_id)?.role ?? null,
          is_premium: profileMap.get(r.requester_id)?.is_premium ?? false,
        })),
      );
    } else {
      setRequests([]);
    }
  };

  const handleAccept = async (id: string) => {
    await supabase.rpc("update_friendship_status", { p_friendship_id: id, p_new_status: "accepted" } as any);
    toast.success(t.profile_accepted as string);
    fetchRequests();
  };

  const handleDecline = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    toast.success(t.profile_declined as string);
    fetchRequests();
  };

  const { data: ownedVehicles = [] } = useQuery({
    queryKey: ["owned-vehicles", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("owned_vehicles")
        .select("id, car_id, license_plate, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data as OwnedVehicleRow[]) ?? [];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, data, read_at, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data as NotificationRow[]) ?? [];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markNotificationRead = async (id: string) => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const handleAddOwnedVehicleFromPhoto = async (file: File) => {
    if (!user) return;
    setShowPhotoDialog(false);
    setAddingVehicle(true);
    try {
      const base64 = await resizeImage(file, 800, 0.7);
      const result = await callCarApi<{ license_plate: string | null }>({
        action: "identify_and_extract_plate",
        images: [base64],
      });
      const plate = result?.license_plate
        ?.replace(/\s|-|\./g, "")
        .toUpperCase()
        .slice(0, 20);
      if (!plate || plate.length < 2) {
        toast.error(t.profile_no_plate as string);
        return;
      }
      const { error } = await supabase.from("owned_vehicles").insert({
        user_id: user.id,
        license_plate: plate,
        car_id: null,
      });
      if (error) throw error;
      toast.success(t.profile_vehicle_registered as string);
      setShowAddVehicle(false);
      queryClient.invalidateQueries({ queryKey: ["owned-vehicles", user.id] });
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? (t.profile_analysis_error as string));
    } finally {
      setAddingVehicle(false);
    }
  };

  const handleRemoveOwnedVehicle = async (id: string) => {
    if (!user || !confirm(t.profile_remove_vehicle as string)) return;
    await supabase.from("owned_vehicles").delete().eq("id", id).eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["owned-vehicles", user.id] });
    toast.success(t.profile_vehicle_removed as string);
  };

  const performSaveUsername = async () => {
    if (!user || !username.trim()) return;
    if (usernameLocked || usernameAvailability === "taken" || usernameAvailability === "checking") return;
    setShowUsernameConfirmDialog(false);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: username.trim(), username_locked: true })
        .eq("user_id", user.id);
      if (error) throw error;
      setUsernameLocked(true);
      setInitialUsername(username.trim());
      setUsernameAvailability("idle");
      toast.success(t.profile_saved as string);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!username.trim() || usernameAvailability === "taken" || usernameAvailability === "checking") return;
    setShowUsernameConfirmDialog(true);
  };

  return (
    <div className="min-h-screen bg-background relative">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50 relative z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.profile_settings_title as string}</h1>
      </header>

      <div className="p-6 max-w-md mx-auto space-y-8 relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
            <User className="h-10 w-10 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {!loading && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t.profile_display_name as string}
              </Label>
              <Input
                placeholder={t.profile_placeholder as string}
                value={username}
                onChange={(e) => !usernameLocked && setUsername(e.target.value)}
                className={`bg-secondary/30 text-lg h-12 ${
                  usernameAvailability === "taken"
                    ? "border-destructive focus-visible:ring-destructive"
                    : usernameAvailability === "available"
                      ? "border-green-500/50 focus-visible:ring-green-500/50"
                      : ""
                }`}
                onKeyDown={(e) => !usernameLocked && e.key === "Enter" && handleSaveClick()}
                disabled={usernameLocked}
                readOnly={usernameLocked}
              />
              {!usernameLocked && username.trim() && (
                <div className="flex items-center gap-2 min-h-[20px]">
                  {usernameAvailability === "checking" && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> {t.profile_checking as string}
                    </span>
                  )}
                  {usernameAvailability === "available" && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                      {t.profile_available as string}
                    </span>
                  )}
                  {usernameAvailability === "taken" && (
                    <span className="text-xs text-destructive font-medium flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive" />
                      {t.profile_taken as string}
                    </span>
                  )}
                </div>
              )}
              {usernameLocked && <p className="text-xs text-muted-foreground">{t.profile_locked as string}</p>}
            </div>
            {!usernameLocked && (
              <Button
                onClick={handleSaveClick}
                disabled={
                  saving || !username.trim() || usernameAvailability === "taken" || usernameAvailability === "checking"
                }
                className="w-full h-12 text-base font-bold rounded-xl gap-2"
              >
                {saving ? (
                  (t.profile_saving as string)
                ) : (
                  <>
                    <Check className="h-5 w-5" /> {t.save as string}
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t.profile_language as string}
          </h2>
          <p className="text-sm text-muted-foreground">{t.profile_language_desc as string}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLanguage("fr")}
              className={`rounded-xl border-2 p-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                language === "fr"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/30 hover:border-primary/40"
              }`}
            >
              🇫🇷 Français
              {language === "fr" && <Check className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`rounded-xl border-2 p-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                language === "en"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/30 hover:border-primary/40"
              }`}
            >
              🇬🇧 English
              {language === "en" && <Check className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            {t.profile_vehicles as string}
          </h2>
          <p className="text-sm text-muted-foreground">{t.profile_vehicles_desc as string}</p>
          {ownedVehicles.map((ov) => (
            <div key={ov.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <span className="text-sm font-medium font-mono">
                {ov.license_plate} · {new Date(ov.created_at).toLocaleDateString("fr-FR")}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => handleRemoveOwnedVehicle(ov.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowAddVehicle(true)}>
            <Plus className="h-4 w-4" /> {t.profile_add_vehicle as string}
          </Button>
        </div>

        {/* Notification Preferences */}
        <NotificationPreferences user={user} />

        {/* PWA Install */}
        <PwaInstallSection />

        {/* Hide email */}
        <HideEmailToggle user={user} />

        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            {t.legal_title as string}
          </h2>
          <p className="text-sm text-muted-foreground">{t.landing_legal as string}</p>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/legal")}>
            <Scale className="h-4 w-4" />
            {t.legal_title as string}
          </Button>
        </div>

        {/* Delete account */}
        <DeleteAccountSection />

        <div className="space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {t.profile_notifications as string}
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">{unreadCount}</span>
            )}
          </h2>
          {loadingNotifications ? (
            <p className="text-sm text-muted-foreground">{t.loading as string}</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.profile_no_notifications as string}</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border border-border bg-card p-3 ${!n.read_at ? "border-primary/30 bg-primary/5" : ""}`}
                >
                  {n.type === "vehicle_spotted" && (
                    <>
                      <p className="font-medium">{t.profile_vehicle_spotted as string}</p>
                      {n.data?.brand && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {n.data.brand} {n.data.model} {n.data.year}
                        </p>
                      )}
                      {!n.read_at && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-xs"
                          onClick={() => markNotificationRead(n.id)}
                        >
                          {t.profile_mark_read as string}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {requests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {t.profile_friend_requests as string}
            </h2>
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
              >
                <span className="font-medium flex items-center gap-1">
                  {req.username || (t.profile_anonymous as string)}{" "}
                  <UserRoleBadge role={(req as any).role} isPremium={(req as any).is_premium} />
                </span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAccept(req.id)} className="gap-1">
                    <Check className="h-4 w-4" /> {t.profile_accept as string}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDecline(req.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showUsernameConfirmDialog} onOpenChange={setShowUsernameConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.profile_confirm_title as string}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">{t.profile_confirm_desc as string}</p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowUsernameConfirmDialog(false)}>
                {t.cancel as string}
              </Button>
              <Button className="flex-1" onClick={performSaveUsername} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (t.confirm as string)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.profile_add_vehicle_title as string}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">{t.profile_add_vehicle_desc as string}</p>
              <Button
                className="w-full gap-2"
                onClick={() => {
                  setShowAddVehicle(false);
                  setShowPhotoDialog(true);
                }}
                disabled={addingVehicle}
              >
                <Camera className="h-5 w-5" />
                {t.profile_take_photo as string}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  setShowAddVehicle(false);
                  navigate("/autospotter?owned=1");
                }}
                disabled={addingVehicle}
              >
                {t.profile_open_autospotter as string}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <PhotoUploadDialog
          open={showPhotoDialog}
          onOpenChange={setShowPhotoDialog}
          onPhotoSelect={(file) => handleAddOwnedVehicleFromPhoto(file)}
        />
      </div>
    </div>
  );
};

export default ProfileSettings;
