import { lazy, Suspense } from "react";
import SwipeablePages from "@/components/SwipeablePages";
import BlackGoldBg from "@/components/BlackGoldBg";
import { PageLoader } from "@/components/PageLoader";
import { HomeMenu } from "@/components/HomeMenu";
import { DashboardWidget } from "@/components/DashboardWidget";

const Dashboard = lazy(() => import("./Dashboard"));
const Messaging = lazy(() => import("./Messaging"));

const Home = () => (
  <div className="h-viewport min-h-0 w-full max-w-full overflow-hidden relative flex flex-col">
    <BlackGoldBg />
    {/* Persistent widget — always visible above swipeable pages */}
    <div className="relative z-20 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1">
      <div className="max-w-2xl mx-auto">
        <DashboardWidget />
      </div>
    </div>
    {/* Swipeable pages fill remaining space */}
    <div className="flex-1 min-h-0 relative">
      <SwipeablePages
        pages={[
          <Suspense fallback={<PageLoader />} key="dash">
            <Dashboard />
          </Suspense>,
          <Suspense fallback={<PageLoader />} key="menu">
            <HomeMenu />
          </Suspense>,
          <Suspense fallback={<PageLoader />} key="msg">
            <Messaging />
          </Suspense>,
        ]}
      />
    </div>
  </div>
);

export default Home;
