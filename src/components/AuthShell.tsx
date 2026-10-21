import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-white.svg";
import "@/auth.css";

interface AuthShellProps {
  children: ReactNode;
  /** Top-align the body (long forms) instead of centring it vertically. */
  top?: boolean;
}

/** Split layout shared by sign-in, callback and invite: navy brand panel + off-white body. */
export function AuthShell({ children, top = false }: AuthShellProps) {
  return (
    <main className="au">
      <aside className="au-brand">
        <img src={logo} alt="Dirxctional" className="au-logo" />
        <div>
          <p className="au-tag">Prior authorizations, off your desk.</p>
          <p className="au-sub">Sign in to your clinic's workspace.</p>
        </div>
      </aside>
      <section className="au-main">
        <div className="au-body" data-top={top ? "" : undefined}>
          {children}
        </div>
        <nav className="au-foot" aria-label="Legal">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/cookie-policy">Cookie Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </nav>
      </section>
    </main>
  );
}
