import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Callback from "./pages/Callback";
import AcceptInvite from "./pages/AcceptInvite";
import InviteAccepter from "./components/InviteAccepter";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import Terms from "./pages/Terms";

import { ClinicLayout } from "@/components/layout/ClinicLayout";
import ClinicDashboard from "@/pages/clinic/ClinicDashboard";
import CreateReferral from "@/pages/clinic/CreateReferral";
import ReferralsList from "@/pages/clinic/ReferralsList";
import ReferralDetail from "@/pages/clinic/ReferralDetail";

import PatientsList from "@/pages/clinic/PatientsList";
import PatientDetail from "@/pages/clinic/PatientDetail";
import CreatePatient from "@/pages/clinic/CreatePatient";
import Services from "@/pages/clinic/Services";

import { AdminLayout } from "@/components/layout/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminReferralsList from "@/pages/admin/AdminReferralsList";
import AdminReferralReview from "@/pages/admin/AdminReferralReview";
import PharmaciesList from "@/pages/admin/PharmaciesList";
import PharmacyDetail from "@/pages/admin/PharmacyDetail";
import AdminInvites from "@/pages/admin/AdminInvites";
import ClinicsList from "@/pages/admin/ClinicsList";
import ClinicDetail from "@/pages/admin/ClinicDetail";
import AdminAddonRequests from "@/pages/admin/AdminAddonRequests";
import AIQuality from "@/pages/admin/AIQuality";
import AIQualityReferral from "@/pages/admin/AIQualityReferral";
import AIQualityCorrections from "@/pages/admin/AIQualityCorrections";
import AdminSupportList from "@/pages/admin/AdminSupportList";
import AdminSupportDetail from "@/pages/admin/AdminSupportDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <InviteAccepter />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/callback" element={<Callback />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/cookie-policy" element={<Cookies />} />
            <Route path="/terms" element={<Terms />} />

            {/* Clinic routes */}
            <Route path="/clinic" element={<ClinicLayout />}>
              <Route path="dashboard" element={<ClinicDashboard />} />
              <Route path="patients/new" element={<CreatePatient />} />
              <Route path="patients/:id" element={<PatientDetail />} />
              <Route path="patients" element={<PatientsList />} />
              <Route path="referrals/new" element={<CreateReferral />} />
              <Route path="referrals/:id" element={<ReferralDetail />} />
              <Route path="referrals" element={<ReferralsList />} />
              <Route path="services" element={<Services />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="referrals/:id" element={<AdminReferralReview />} />
              <Route path="referrals" element={<AdminReferralsList />} />
              <Route path="support/:caseId" element={<AdminSupportDetail />} />
              <Route path="support" element={<AdminSupportList />} />
              <Route path="pharmacies/:id" element={<PharmacyDetail />} />
              <Route path="pharmacies" element={<PharmaciesList />} />
              <Route path="clinics/:id" element={<ClinicDetail />} />
              <Route path="clinics" element={<ClinicsList />} />
              <Route path="addon-requests" element={<AdminAddonRequests />} />
              <Route path="invites" element={<AdminInvites />} />
              <Route path="ai-quality" element={<AIQuality />} />
              <Route path="ai-quality/corrections" element={<AIQualityCorrections />} />
              <Route path="ai-quality/referral/:id" element={<AIQualityReferral />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
