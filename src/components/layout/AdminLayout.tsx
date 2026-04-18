import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { CompleteAdminProfileModal } from "@/components/CompleteAdminProfileModal";
import { AdminSidebar } from "./AdminSidebar";
import { UserMenu } from "./UserMenu";

export function AdminLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { data: profile } = useAdminProfile();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "internal_admin") return <Navigate to="/clinic/dashboard" replace />;

  const showProfileModal = profile && profile.profile_complete === false;

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="flex justify-end px-6 pt-4 lg:px-8">
          <UserMenu />
        </div>
        <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-8">
          <Outlet />
        </div>
      </main>
      {showProfileModal && <CompleteAdminProfileModal />}
    </div>
  );
}
