import { useNavigate, useLocation } from "react-router-dom";
import { Car, Gamepad2, Users, User, Home } from "lucide-react";
import { useUnreadDMs } from "@/hooks/useUnreadDMs";
import { useLanguage } from "@/i18n/LanguageContext";

const TABS = [
  { key: "home", icon: Home, path: "/home", labelKey: "tab_home" },
  { key: "garage", icon: Car, path: "/garage-menu", labelKey: "tab_garage" },
  { key: "game", icon: Gamepad2, path: "/card-game", labelKey: "tab_game" },
  { key: "friends", icon: Users, path: "/friends", labelKey: "tab_friends" },
  { key: "profile", icon: User, path: "/profile", labelKey: "tab_profile" },
] as const;

function getActiveTab(pathname: string): string {
  if (pathname === "/home" || pathname === "/") return "home";
  if (pathname.startsWith("/garage") || pathname.startsWith("/add-car") || pathname.startsWith("/car/")) return "garage";
  if (pathname.startsWith("/card-game") || pathname.startsWith("/card-game/")) return "game";
  if (pathname.startsWith("/friends") || pathname.startsWith("/messaging")) return "friends";
  if (pathname.startsWith("/profile") || pathname.startsWith("/emblem")) return "profile";
  return "";
}

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const unread = useUnreadDMs();
  const activeTab = getActiveTab(location.pathname);

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 px-4 pb-[env(safe-area-inset-bottom,8px)] pointer-events-none">
      <nav className="glass-tab-bar rounded-2xl mx-auto max-w-md flex items-center justify-around py-2 px-1 pointer-events-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const label = (t as Record<string, string>)[tab.labelKey] ?? tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <tab.icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                {tab.key === "friends" && unread > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground px-1">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-semibold uppercase tracking-wider transition-colors ${isActive ? "text-primary" : ""}`}>
                {label}
              </span>
              {isActive && (
                <div className="absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}