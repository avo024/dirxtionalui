import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

import { ClinicLayout } from "@/components/layout/ClinicLayout";
import ClinicDashboard from "@/pages/clinic/ClinicDashboard";
import CreateReferral from "@/pages/clinic/CreateReferral";
import ReferralsList from "@/pages/clinic/ReferralsList";
import ReferralDetail from "@/pages/clinic/ReferralDetail";
import ClinicSettings from "@/pages/clinic/ClinicSettings";

import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminReferralsList from "@/pages/admin/AdminReferralsList";
import AdminReferralReview from "@/pages/admin/AdminReferralReview";
import BlockedReferrals from "@/pages/admin/BlockedReferrals";
import PharmaciesList from "@/pages/admin/PharmaciesList";
import PharmacyDetail from "@/pages/admin/PharmacyDetail";
import AdminSettings from "@/pages/admin/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />

            {/* Clinic routes */}
            <Route path="/clinic" element={<ClinicLayout />}>
              <Route path="dashboard" element={<ClinicDashboard />} />
              <Route path="referrals/new" element={<CreateReferral />} />
              <Route path="referrals/:id" element={<ReferralDetail />} />
              <Route path="referrals" element={<ReferralsList />} />
              <Route path="settings" element={<ClinicSettings />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="referrals/blocked" element={<BlockedReferrals />} />
              <Route path="referrals/:id" element={<AdminReferralReview />} />
              <Route path="referrals" element={<AdminReferralsList />} />
              <Route path="pharmacies/:id" element={<PharmacyDetail />} />
              <Route path="pharmacies" element={<PharmaciesList />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
