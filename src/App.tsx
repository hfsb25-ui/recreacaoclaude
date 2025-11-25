import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import Home from "./pages/Home";
import Schedule from "./pages/Schedule";
import Activities from "./pages/Activities";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import GuestAuth from "./pages/GuestAuth";
import GuestProfile from "./pages/GuestProfile";
import Ranking from "./pages/Ranking";
import HallOfFame from "./pages/HallOfFame";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

const AppContent = () => {
  useTheme();
  
  return (
    <div className="overflow-x-hidden w-full">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/programacao" element={<Schedule />} />
          <Route path="/activities/:ageGroupId" element={<Activities />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/guest-auth" element={<GuestAuth />} />
          <Route path="/guest-profile" element={<GuestProfile />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/hall-of-fame" element={<HallOfFame />} />
          <Route path="/instalar" element={<Install />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
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
