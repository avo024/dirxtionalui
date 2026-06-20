import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminSidebar } from "./AdminSidebar";
import { UserMenu } from "./UserMenu";
import { AppFooter } from "./AppFooter";

export function AdminLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "internal_admin") return <Navigate to="/clinic/dashboard" replace />;

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="flex justify-end px-6 pt-4 lg:px-8">
          <UserMenu />
        </div>
        <div className="mx-auto max-w-[1680px] w-full px-6 py-8 lg:px-8 flex-1">
          <Outlet />
        </div>
        <AppFooter />
      </main>
    </div>
  );
}
