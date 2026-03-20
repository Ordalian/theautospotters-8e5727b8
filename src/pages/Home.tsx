import { lazy, Suspense } from "react";
import SwipeablePages from "@/components/SwipeablePages";
import BlackGoldBg from "@/components/BlackGoldBg";
import { PageLoader } from "@/components/PageLoader";
import { HomeMenu } from "@/components/HomeMenu";

const Dashboard = lazy(() => import("./Dashboard"));
const Messaging = lazy(() => import("./Messaging"));

const Home = () => (
  <div className="h-viewport min-h-0 w-full max-w-full overflow-hidden relative">
    <BlackGoldBg />
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
);

export default Home;
