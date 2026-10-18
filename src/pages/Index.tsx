import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      navigate(
        user.role === "clinic_user" ? "/clinic/dashboard" : "/admin/referrals",
        { replace: true },
      );
    } else {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Icon name="spinner" size={24} className="animate-spin text-primary" />
    </div>
  );
};

export default Index;
