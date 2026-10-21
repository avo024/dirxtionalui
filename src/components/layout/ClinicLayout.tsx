import { Navigate, Outlet } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";
import { ClinicSidebar } from "./ClinicSidebar";
import { UserMenu } from "./UserMenu";
import { AppFooter } from "./AppFooter";
import { IdleGuard } from "@/components/IdleGuard";
import { ConsentReacceptModal } from "@/components/ConsentReacceptModal";

export function ClinicLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icon name="spinner" size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "clinic_user") return <Navigate to="/admin/referrals" replace />;

  return (
    <div className="flex min-h-screen w-full">
      <ClinicSidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="flex justify-end px-6 pt-4 lg:px-8">
          <UserMenu />
        </div>
        <div className="mx-auto max-w-[1400px] w-full px-6 py-8 lg:px-8 flex-1">
          <Outlet />
        </div>
        <AppFooter />
      </main>
      <ConsentReacceptModal />
      <IdleGuard />
    </div>
  );
}
