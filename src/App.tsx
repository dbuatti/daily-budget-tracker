import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionContextProvider } from "./contexts/SessionContext";
import AuthGuard from "./components/AuthGuard";
import MainLayout from "./components/MainLayout"; // Import MainLayout
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard"; // Import the renamed Dashboard page
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SessionContextProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AuthGuard isProtected={false} />}>
              <Route path="/login" element={<Login />} />
            </Route>
            
            <Route element={<AuthGuard isProtected={true} />}>
              <Route element={<MainLayout />}> {/* Use MainLayout for protected routes */}
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </SessionContextProvider>
  </QueryClientProvider>
);

export default App;