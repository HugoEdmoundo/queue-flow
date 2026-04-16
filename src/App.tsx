import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RealtimeProvider } from "@/context/RealtimeContext";
import Index from "./pages/Index";
import Register from "./pages/Register";
import QueueView from "./pages/QueueView";
import AdminDashboard from "./pages/AdminDashboard";
import Display from "./pages/Display";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RealtimeProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/queue" element={<QueueView />} />
            <Route path="/control" element={<AdminDashboard />} />
            <Route path="/display" element={<Display />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RealtimeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
