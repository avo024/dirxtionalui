/**
 * PageErrorBoundary — a white screen must never be silent again.
 *
 * Catches render crashes and shows the error message + component stack in
 * place, with a reload button. No PHI concern: it renders the JS error text
 * (code identifiers), never data values.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class PageErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page crashed:", error, info.componentStack);
    this.setState({ info });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ maxWidth: 720, margin: "60px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Something broke on this page</h2>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
          The error below tells us exactly where — screenshot this box or copy the text.
        </p>
        <pre style={{
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
          padding: 14, fontSize: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
          color: "#991b1b", maxHeight: 320, overflow: "auto",
        }}>
          {String(this.state.error?.message || this.state.error)}
          {"\n\n"}
          {this.state.info?.componentStack?.split("\n").slice(0, 12).join("\n")}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 14, padding: "9px 18px", borderRadius: 8, border: "none",
            background: "#0e7c7b", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          Reload the page
        </button>
      </div>
    );
  }
}
