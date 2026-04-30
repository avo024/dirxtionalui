import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { COOKIE_POLICY_MD } from "@/content/cookiePolicy";

export default function Cookies() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1100px] px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="DiRxctional" className="h-9 w-auto" />
          </Link>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-6 py-10 lg:py-14">
        <article
          className="text-[15px] text-slate-700"
          style={{ lineHeight: 1.7 }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-3xl font-bold text-slate-900 mb-2" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="leading-7 mb-4 text-slate-700" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />
              ),
              li: ({ node, ...props }) => <li className="leading-7" {...props} />,
              strong: ({ node, ...props }) => (
                <strong className="font-semibold text-slate-900" {...props} />
              ),
              em: ({ node, ...props }) => (
                <em className="text-slate-500 not-italic block text-sm mb-1" {...props} />
              ),
              a: ({ node, href, ...props }) => {
                const isInternal = href?.startsWith("/");
                if (isInternal) {
                  return (
                    <Link
                      to={href!}
                      className="text-primary underline hover:opacity-80"
                      {...(props as any)}
                    />
                  );
                }
                return (
                  <a
                    href={href}
                    className="text-primary underline hover:opacity-80"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                );
              },
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-6">
                  <table className="w-full border-collapse text-sm" {...props} />
                </div>
              ),
              th: ({ node, ...props }) => (
                <th
                  className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-900"
                  {...props}
                />
              ),
              td: ({ node, ...props }) => (
                <td className="border border-slate-200 px-3 py-2 align-top" {...props} />
              ),
              code: ({ node, ...props }) => (
                <code
                  className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                />
              ),
              hr: ({ node, ...props }) => (
                <hr className="my-10 border-slate-200" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote
                  className="border-l-4 border-amber-400 bg-amber-50 pl-4 py-2 my-6 text-slate-700"
                  {...props}
                />
              ),
            }}
          >
            {COOKIE_POLICY_MD}
          </ReactMarkdown>
        </article>
      </main>

      <footer className="border-t border-border mt-10">
        <div className="mx-auto max-w-[1100px] px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ScRXpt, LLC. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground underline">
              Privacy Policy
            </Link>
            <Link to="/cookie-policy" className="hover:text-foreground underline">
              Cookie Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
