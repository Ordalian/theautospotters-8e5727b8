import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { Loader2 } from "lucide-react";

// Lazy-load all pages
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyGarage = lazy(() => import("./pages/MyGarage"));
const AddCar = lazy(() => import("./pages/AddCar"));
const AutoSpotter = lazy(() => import("./pages/AutoSpotter"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Profile = lazy(() => import("./pages/Profile"));
const GarageSettings = lazy(() => import("./pages/GarageSettings"));
const SpotMap = lazy(() => import("./pages/SpotMap"));
const FriendsGarages = lazy(() => import("./pages/FriendsGarages"));
const DeliverCarChoice = lazy(() => import("./pages/DeliverCarChoice"));
const DeliverSelectFriend = lazy(() => import("./pages/DeliverSelectFriend"));
const CarDetails = lazy(() => import("./pages/CarDetails"));
const VehicleTypeMenu = lazy(() => import("./pages/VehicleTypeMenu"));
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
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/garage" element={<ProtectedRoute><MyGarage /></ProtectedRoute>} />
                <Route path="/garage-menu" element={<ProtectedRoute><VehicleTypeMenu /></ProtectedRoute>} />
                <Route path="/add-car" element={<ProtectedRoute><AddCar /></ProtectedRoute>} />
                <Route path="/autospotter" element={<ProtectedRoute><AutoSpotter /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/garage-settings" element={<ProtectedRoute><GarageSettings /></ProtectedRoute>} />
                <Route path="/friends" element={<ProtectedRoute><FriendsGarages /></ProtectedRoute>} />
                <Route path="/deliver-car" element={<ProtectedRoute><DeliverCarChoice /></ProtectedRoute>} />
                <Route path="/deliver-car/select-friend" element={<ProtectedRoute><DeliverSelectFriend /></ProtectedRoute>} />
                <Route path="/map" element={<ProtectedRoute><SpotMap /></ProtectedRoute>} />
                <Route path="/car/:id" element={<ProtectedRoute><CarDetails /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
