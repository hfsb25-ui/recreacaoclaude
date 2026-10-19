import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { usePageTracking } from "@/hooks/usePageTracking";
import { HotelSplash } from "@/components/hotel/HotelSplash";
import { useState, useEffect, lazy, Suspense } from "react";
import Home from "./pages/Home";
import HotelHome from "./pages/hotel/HotelHome";
const HotelInfo = lazy(() => import("./pages/hotel/HotelInfo"));
const HotelRegiao = lazy(() => import("./pages/hotel/HotelRegiao"));
const HotelAvisos = lazy(() => import("./pages/hotel/HotelAvisos"));
const HotelEstadia = lazy(() => import("./pages/hotel/HotelEstadia"));
import Schedule from "./pages/Schedule";
import Activities from "./pages/Activities";
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
import GuestAuth from "./pages/GuestAuth";
import GuestProfile from "./pages/GuestProfile";
import Ranking from "./pages/Ranking";
const HallOfFame = lazy(() => import("./pages/HallOfFame"));
const Install = lazy(() => import("./pages/Install"));
const Totem = lazy(() => import("./pages/Totem"));
const Games = lazy(() => import("./pages/Games"));
const HotelMap = lazy(() => import("./pages/HotelMap"));
const Pet = lazy(() => import("./pages/Pet"));
import NotFound from "./pages/NotFound";
import Manutencao from "./pages/Manutencao";
import { deveMostrarManutencao } from "./config/manutencao";

// Component that uses hooks that require Router context
const AppRoutes = () => {
  usePageTracking();
  
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
    <Routes>
      <Route path="/" element={<HotelHome />} />
      <Route path="/recreacao" element={<Home />} />
      <Route path="/hotel" element={<HotelInfo />} />
      <Route path="/avisos" element={<HotelAvisos />} />
      <Route path="/estadia" element={<HotelEstadia />} />
      <Route path="/programacao" element={<Schedule />} />
      <Route path="/activities/:ageGroupId" element={<Activities />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/guest-auth" element={<GuestAuth />} />
      <Route path="/guest-profile" element={<GuestProfile />} />
      <Route path="/ranking" element={<Ranking />} />
      <Route path="/hall-of-fame" element={<HallOfFame />} />
      <Route path="/instalar" element={<Install />} />
      <Route path="/totem" element={<Totem />} />
      <Route path="/games" element={<Games />} />
      <Route path="/mapa" element={<HotelMap />} />
      <Route path="/regiao" element={<HotelRegiao />} />
      <Route path="/regiao/:id" element={<HotelRegiao />} />
      <Route path="/bichinho" element={<Pet />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

const AppContent = () => {
  useTheme();
  const [emManutencao] = useState(deveMostrarManutencao);
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    // Check if this is truly the first load of the session
    const hasLoadedBefore = sessionStorage.getItem('app-loaded');
    if (hasLoadedBefore) {
      setShowSplash(false);
      setIsFirstLoad(false);
    } else {
      sessionStorage.setItem('app-loaded', 'true');
    }
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  if (emManutencao) {
    return <Manutencao />;
  }

  if (showSplash && isFirstLoad) {
    return <HotelSplash onFinish={handleSplashFinish} />;
  }
  
  return (
    <div className="overflow-x-hidden w-full">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Sonner />
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
