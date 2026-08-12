import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthView } from "@/components/pivote/AuthView";
import { Dashboard } from "@/components/pivote/Dashboard";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pivot'e — Calm Goal Execution with Proof of Work" },
      {
        name: "description",
        content:
          "Pivot'e turns ambitions into focused execution phases: track tasks, attach screenshot proof, and log your focus time automatically.",
      },
      { property: "og:title", content: "Pivot'e — Calm Goal Execution with Proof of Work" },
      {
        property: "og:description",
        content:
          "Plan phases, complete tasks, and store visual proof of work securely in the cloud.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-teal" />
      </div>
    );
  }

  return user ? <Dashboard user={user} /> : <AuthView />;
}
