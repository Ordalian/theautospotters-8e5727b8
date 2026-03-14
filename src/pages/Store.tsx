import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme, PAID_STYLES, type ThemeId } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, Coins, Crown, Loader2, Package, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import BlackGoldBg from "@/components/BlackGoldBg";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const COIN_PACKS = [
  { coins: 100, priceLabel: "1 €", packSize: 100 },
  { coins: 500, priceLabel: "5 €", packSize: 500 },
  { coins: 1000, priceLabel: "9 €", packSize: 1000 },
] as const;

const BOOSTER_PACKS = [
  { count: 1, cost: 100 },
  { count: 5, cost: 500 },
  { count: 10, cost: 900 },
] as const;

const PREMIUM_PLANS = [
  { plan: "week", labelKey: "store_premium_week", priceLabel: "1,99 €", coinCost: 199 },
  { plan: "month", labelKey: "store_premium_month", priceLabel: "6,99 €", coinCost: 699 },
  { plan: "year", labelKey: "store_premium_year", priceLabel: "78,99 €", coinCost: 7899 },
] as const;

export default function Store() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { ownedStyleIds, refetchOwned, setTheme } = useTheme();
  const [unlockingStyleId, setUnlockingStyleId] = useState<string | null>(null);
  const [buyingPremium, setBuyingPremium] = useState<string | null>(null);

  const { data: profile, isLoading: loadingCoins } = useQuery({
    queryKey: ["profile-coins", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("coins, is_premium, premium_until")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { coins: number; is_premium: boolean; premium_until: string | null } | null;
    },
    enabled: !!user?.id,
  });

  const coins = profile?.coins ?? 0;
  const isPremiumActive = profile?.is_premium && (!profile.premium_until || new Date(profile.premium_until) > new Date());
  const premiumUntilLabel = profile?.premium_until ? new Date(profile.premium_until).toLocaleDateString() : null;

  const handleAddCoins = async (amount: number) => {
    if (!user) return;
    try {
      await supabase.rpc("add_coins", { p_amount: amount });
      await queryClient.invalidateQueries({ queryKey: ["profile-coins", user.id] });
      toast.success(
        typeof t.store_coins_added === "function"
          ? (t.store_coins_added as (n: number) => string)(amount)
          : `${amount} coins added`
      );
    } catch (e) {
      toast.error((e as Error)?.message ?? "Error");
    }
  };

  const handleBuyBoosters = async (packSize: number, cost: number) => {
    if (!user) return;
    if (coins < cost) {
      toast.error(t.store_insufficient_coins as string);
      return;
    }
    try {
      const { data } = await supabase.rpc("add_purchased_boosters", { pack_size: packSize });
      const result = data as { ok?: boolean; error?: string } | null;
      if (result?.ok) {
        await queryClient.invalidateQueries({ queryKey: ["profile-coins", user.id] });
        await queryClient.invalidateQueries({ queryKey: ["user-purchased-boosters", user.id] });
        toast.success(
          typeof t.store_boosters_bought === "function"
            ? (t.store_boosters_bought as (n: number) => string)(packSize)
            : `${packSize} booster(s) added`
        );
      } else {
        toast.error((result?.error && t[`store_${result.error}` as keyof typeof t]) || result?.error || "Error");
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? "Error");
    }
  };

  const handleUnlockStyle = async (styleId: string, price: number) => {
    if (!user) return;
    if (coins < price) {
      toast.error(t.store_insufficient_coins as string);
      return;
    }
    setUnlockingStyleId(styleId);
    try {
      const { error } = await supabase.rpc("unlock_style", { p_style_id: styleId, p_price: price });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile-coins", user.id] });
      await refetchOwned();
      setTheme(styleId as ThemeId);
      toast.success(t.store_style_unlocked as string);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Error");
    } finally {
      setUnlockingStyleId(null);
    }
  };

  const handleBuyPremium = async (plan: string, coinCost: number) => {
    if (!user) return;
    if (coins < coinCost) {
      toast.error(t.store_insufficient_coins as string);
      return;
    }
    setBuyingPremium(plan);
    try {
      const { data } = await supabase.rpc("buy_premium_coins", { p_plan: plan });
      const result = data as { ok?: boolean; error?: string; premium_until?: string } | null;
      if (result?.ok) {
        await queryClient.invalidateQueries({ queryKey: ["profile-coins", user.id] });
        toast.success(t.store_premium_activated as string ?? "Premium activé !");
      } else {
        toast.error(result?.error ?? "Error");
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? "Error");
    } finally {
      setBuyingPremium(null);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <BlackGoldBg />
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.store_title as string}</h1>
        <div className="flex items-center gap-1.5 min-w-[80px] justify-end">
          {loadingCoins ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Coins className="h-5 w-5 text-primary" />
              <span className="font-bold tabular-nums">{coins}</span>
            </>
          )}
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-8 relative z-10">
        {/* Premium Time */}
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {t.store_premium_title as string ?? "Premium"}
          </h2>
          {isPremiumActive && (
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 mb-3 text-center">
              <p className="text-sm font-semibold text-primary">
                ✦ Premium {t.store_premium_active as string ?? "actif"}{premiumUntilLabel ? ` — ${t.store_premium_until as string ?? "jusqu'au"} ${premiumUntilLabel}` : ""}
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground mb-4">{t.store_premium_desc as string ?? "AutoSpotter illimité, boosters toutes les 4h (max 5), badge premium."}</p>
          <div className="space-y-2">
            {PREMIUM_PLANS.map(({ plan, labelKey, priceLabel, coinCost }) => (
              <div key={plan} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="font-semibold text-sm">{t[labelKey] as string ?? plan}</p>
                  <p className="text-xs text-muted-foreground">{priceLabel}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs gap-1"
                  disabled={buyingPremium === plan || coins < coinCost}
                  onClick={() => handleBuyPremium(plan, coinCost)}
                >
                  {buyingPremium === plan ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Coins className="h-3.5 w-3.5" />
                      {coinCost}
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Buy coins (free for now) */}
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            {t.store_buy_coins as string}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{t.store_coins_free_hint as string}</p>
          <div className="grid grid-cols-3 gap-3">
            {COIN_PACKS.map(({ coins: amount, priceLabel, packSize }) => (
              <button
                key={packSize}
                type="button"
                onClick={() => handleAddCoins(packSize)}
                className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-1 hover:border-primary/40 transition-colors"
              >
                <span className="text-2xl font-bold text-primary">{amount}</span>
                <span className="text-xs text-muted-foreground">{priceLabel}</span>
                <span className="text-[10px] text-primary/80 mt-1">{t.store_get as string}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Buy boosters */}
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t.store_buy_boosters as string}
          </h2>
          <div className="space-y-2">
            {BOOSTER_PACKS.map(({ count, cost }) => (
              <button
                key={count}
                type="button"
                onClick={() => handleBuyBoosters(count, cost)}
                disabled={coins < cost}
                className="w-full flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="font-semibold">
                  {count} {count === 1 ? (t.store_booster as string) : (t.store_boosters as string)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="font-mono font-bold">{cost}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Buy / unlock styles */}
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            {t.store_buy_styles as string}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{t.store_buy_styles_sub as string}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-muted-foreground"
            onClick={() => navigate("/garage-settings")}
          >
            {t.store_choose_theme as string}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            {PAID_STYLES.map((s) => {
              const owned = ownedStyleIds.has(s.id);
              const price = s.price ?? 0;
              const canUnlock = coins >= price;
              const unlocking = unlockingStyleId === s.id;
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-card p-3 flex items-center gap-3"
                >
                  <div
                    className="h-12 w-12 shrink-0 rounded-lg border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${s.preview.bg} 0%, ${s.preview.accent} 100%)`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{s.label}</p>
                    {owned ? (
                      <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                        <Check className="h-3 w-3" />
                        {t.store_style_owned as string}
                      </p>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-1.5 h-8 text-xs"
                        disabled={unlocking || !canUnlock}
                        onClick={() => handleUnlockStyle(s.id, price)}
                      >
                        {unlocking ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Coins className="h-3.5 w-3.5 mr-1" />
                            {price}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
