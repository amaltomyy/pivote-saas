import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo, Footer } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function AuthView() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{
          background:
            "radial-gradient(60rem 40rem at 15% 0%, rgba(58,16,120,0.18), transparent 60%), radial-gradient(50rem 35rem at 90% 100%, rgba(11,102,64,0.16), transparent 60%)",
        }}
      />
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8">
        <Logo width={140} height={44} />
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-8 sm:px-8 lg:grid-cols-2">
        <section className="min-w-0">
          <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">
            Calm execution.
            <br />
            <span className="text-teal">Visible proof</span> of work.
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground">
            Pivot&apos;e turns your ambitions into focused phases. Track tasks, attach
            screenshot proof to every win, and watch your completion bar fill up.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-foreground">
            {[
              "Custom execution phases with clean progress tracking",
              "Photo & screenshot proof stored privately in the cloud",
              "Automatic focus-time logging while you work",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-teal" />
                <span className="min-w-0">{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-card min-w-0 p-6 shadow-xl sm:p-8">
          <h2 className="text-xl font-bold text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue your execution."
              : "Start your first phase in seconds."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-glass-border bg-background/60 px-4 py-3 text-base text-foreground outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-glass-border bg-background/60 px-4 py-3 text-base text-foreground outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/30"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-3 text-base font-semibold text-white transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 w-full text-sm text-muted-foreground transition hover:text-foreground"
          >
            {mode === "signin"
              ? "No account yet? Create one"
              : "Already have an account? Sign in"}
          </button>
        </section>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
