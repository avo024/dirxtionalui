import { Link } from "react-router-dom";

export function AppFooter() {
  return (
    <footer className="border-t border-border mt-8">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} ScRXpt, LLC</p>
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:text-foreground underline">
            Privacy Policy
          </Link>
          <Link to="/cookies" className="hover:text-foreground underline">
            Cookie Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
