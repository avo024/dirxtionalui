import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/patterns/PageContainer";
import { usePageTitle } from "@/hooks/usePageTitle";

const NotFound = () => {
  const location = useLocation();
  usePageTitle("Page not found");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageContainer className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="ty-title">This page doesn't exist.</h1>
        <Button asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </PageContainer>
  );
};

export default NotFound;
