import { lazy, Suspense } from "react";
import SwipeablePages from "@/components/SwipeablePages";
import BlackGoldBg from "@/components/BlackGoldBg";
import { Loader2 } from "lucide-react";

const Dashboard = lazy(() => import("./Dashboard"));
const Messaging = lazy(() => import("./Messaging"));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const Home = () => {
  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <BlackGoldBg />
      <SwipeablePages
        pages={[
          <Suspense fallback={<PageLoader />} key="dash"><Dashboard /></Suspense>,
          <Suspense fallback={<PageLoader />} key="msg"><Messaging /></Suspense>,
        ]}
      />
    </div>
  );
};

export default Home;
