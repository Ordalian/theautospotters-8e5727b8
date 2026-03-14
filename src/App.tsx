import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { PageTransition } from "@/components/PageTransition";
import { BottomTabBar } from "@/components/BottomTabBar";
import ThemeParticles from "@/components/ThemeParticles";
import { Loader2 } from "lucide-react";
import { usePageTracking } from "@/hooks/usePageTracking";

// Lazy-load all pages
const Auth = lazy(() => import("./pages/Auth"));
const Landing = lazy(() => import("./pages/Landing"));
const Home = lazy(() => import("./pages/Home"));
const MyGarage = lazy(() => import("./pages/MyGarage"));
const AddCar = lazy(() => import("./pages/AddCar"));
const AutoSpotter = lazy(() => import("./pages/AutoSpotter"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const ProfileStats = lazy(() => import("./pages/ProfileStats"));
const ProfileAchievements = lazy(() => import("./pages/ProfileAchievements"));
const ProfileNews = lazy(() => import("./pages/ProfileNews"));
const GarageSettings = lazy(() => import("./pages/GarageSettings"));
const SpotMap = lazy(() => import("./pages/SpotMap"));
const FriendsGarages = lazy(() => import("./pages/FriendsGarages"));
const FriendGarage = lazy(() => import("./pages/FriendGarage"));
const DeliverCarChoice = lazy(() => import("./pages/DeliverCarChoice"));
const DeliverSelectFriend = lazy(() => import("./pages/DeliverSelectFriend"));
const CarDetails = lazy(() => import("./pages/CarDetails"));
const VehicleTypeMenu = lazy(() => import("./pages/VehicleTypeMenu"));
const EmblemPreview = lazy(() => import("./pages/EmblemPreview"));
const Messaging = lazy(() => import("./pages/Messaging"));
const CardGame = lazy(() => import("./pages/CardGame"));
const CardDetailPage = lazy(() => import("./pages/CardDetailPage"));
const DeckBuilder = lazy(() => import("./pages/DeckBuilder"));
const WorldDomination = lazy(() => import("./pages/WorldDomination"));

const AmisList = lazy(() => import("./pages/AmisList"));
const Store = lazy(() => import("./pages/Store"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Support = lazy(() => import("./pages/Support"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min cache
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

function ShowTabBar() {
  const { user } = useAuth();
  const location = useLocation();
  // Hide tab bar on auth, landing, and fullscreen pages
  const hideOn = ["/auth", "/", "/card-game/world-domination"];
  if (!user || hideOn.includes(location.pathname)) return null;
  return <BottomTabBar />;
}

function AnimatedRoutes() {
  const location = useLocation();
  usePageTracking();
  return (
    <>
      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />} key={location.pathname}>
          <Routes location={location} key={location.pathname}>
            <Route path="/auth" element={<AuthRoute><PageTransition><Auth /></PageTransition></AuthRoute>} />
            <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
            <Route path="/home" element={<ProtectedRoute><PageTransition><Home /></PageTransition></ProtectedRoute>} />
            <Route path="/garage" element={<ProtectedRoute><PageTransition><MyGarage /></PageTransition></ProtectedRoute>} />
            <Route path="/garage-menu" element={<ProtectedRoute><PageTransition><VehicleTypeMenu /></PageTransition></ProtectedRoute>} />
            <Route path="/add-car" element={<ProtectedRoute><PageTransition><AddCar /></PageTransition></ProtectedRoute>} />
            <Route path="/autospotter" element={<ProtectedRoute><PageTransition><AutoSpotter /></PageTransition></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><PageTransition><Leaderboard /></PageTransition></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
            <Route path="/profile/settings" element={<ProtectedRoute><PageTransition><ProfileSettings /></PageTransition></ProtectedRoute>} />
            <Route path="/profile/stats" element={<ProtectedRoute><PageTransition><ProfileStats /></PageTransition></ProtectedRoute>} />
            <Route path="/profile/achievements" element={<ProtectedRoute><PageTransition><ProfileAchievements /></PageTransition></ProtectedRoute>} />
            <Route path="/emblem-preview" element={<ProtectedRoute><PageTransition><EmblemPreview /></PageTransition></ProtectedRoute>} />
            <Route path="/profile/news" element={<ProtectedRoute><PageTransition><ProfileNews /></PageTransition></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><PageTransition><AdminPanel /></PageTransition></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute><PageTransition><Support /></PageTransition></ProtectedRoute>} />
            <Route path="/garage-settings" element={<ProtectedRoute><PageTransition><GarageSettings /></PageTransition></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><PageTransition><FriendsGarages /></PageTransition></ProtectedRoute>} />
            <Route path="/friends/:friendId/stats" element={<ProtectedRoute><PageTransition><ProfileStats /></PageTransition></ProtectedRoute>} />
            <Route path="/friends/:friendId/garage" element={<ProtectedRoute><PageTransition><FriendGarage /></PageTransition></ProtectedRoute>} />
            <Route path="/deliver-car" element={<ProtectedRoute><PageTransition><DeliverCarChoice /></PageTransition></ProtectedRoute>} />
            <Route path="/deliver-car/select-friend" element={<ProtectedRoute><PageTransition><DeliverSelectFriend /></PageTransition></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><PageTransition><SpotMap /></PageTransition></ProtectedRoute>} />
            <Route path="/car/:id" element={<ProtectedRoute><PageTransition><CarDetails /></PageTransition></ProtectedRoute>} />
            <Route path="/messaging" element={<ProtectedRoute><PageTransition><Messaging /></PageTransition></ProtectedRoute>} />
            <Route path="/card-game" element={<ProtectedRoute><PageTransition><CardGame /></PageTransition></ProtectedRoute>} />
            <Route path="/card-game/card/:cardId" element={<ProtectedRoute><PageTransition><CardDetailPage /></PageTransition></ProtectedRoute>} />
            <Route path="/card-game/deck-builder" element={<ProtectedRoute><PageTransition><DeckBuilder /></PageTransition></ProtectedRoute>} />
            <Route path="/card-game/world-domination" element={<ProtectedRoute><PageTransition><WorldDomination /></PageTransition></ProtectedRoute>} />
            <Route path="/card-game/friends" element={<ProtectedRoute><PageTransition><AmisList /></PageTransition></ProtectedRoute>} />
            <Route path="/store" element={<ProtectedRoute><PageTransition><Store /></PageTransition></ProtectedRoute>} />

            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </Suspense>
      </AnimatePresence>
      <ShowTabBar />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <ThemeParticles />
            <LanguageProvider>
              <AnimatedRoutes />
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
