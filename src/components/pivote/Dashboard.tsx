import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Logo, Footer } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { useUsageTracking } from "./useUsageTracking";
import { toast } from "sonner";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
  Menu,
  Plus,
  Trash2,
  X,
} from "lucide-react";

type Phase = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

type Task = {
  id: string;
  phase_id: string;
  title: string;
  is_completed: boolean;
  proof_image_url: string | null;
  created_at: string;
};

export function Dashboard({ user }: { user: User }) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useUsageTracking(user.id);

  const loadAll = useCallback(async () => {
    const [{ data: p, error: pe }, { data: t, error: te }] = await Promise.all([
      supabase
        .from("pivote_phases")
        .select("id, title, description, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("pivote_tasks")
        .select("id, phase_id, title, is_completed, proof_image_url, created_at")
        .order("created_at", { ascending: true }),
    ]);
    if (pe || te) toast.error(pe?.message ?? te?.message ?? "Failed to load data");
    setPhases(p ?? []);
    setTasks(t ?? []);
    setActiveId((cur) => cur ?? p?.[0]?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const activeIndex = phases.findIndex((p) => p.id === activeId);
  const activePhase = activeIndex >= 0 ? phases[activeIndex] : undefined;
  const phaseTasks = useMemo(
    () => tasks.filter((t) => t.phase_id === activeId),
    [tasks, activeId],
  );
  const globalPct = tasks.length
    ? Math.round((tasks.filter((t) => t.is_completed).length / tasks.length) * 100)
    : 0;

  async function addPhase() {
    const title = window.prompt("Name your execution phase");
    if (!title?.trim()) return;
    const { data, error } = await supabase
      .from("pivote_phases")
      .insert({ user_id: user.id, title: title.trim() })
      .select("id, title, description, created_at")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Could not create phase");
      return;
    }
    setPhases((prev) => [...prev, data]);
    setActiveId(data.id);
    setDrawerOpen(false);
  }

  async function deletePhase(id: string) {
    if (!window.confirm("Delete this phase and all its tasks?")) return;
    const prevPhases = phases;
    const prevTasks = tasks;
    setPhases((p) => p.filter((x) => x.id !== id));
    setTasks((t) => t.filter((x) => x.phase_id !== id));
    if (activeId === id) setActiveId(prevPhases.find((p) => p.id !== id)?.id ?? null);
    const { error } = await supabase.from("pivote_phases").delete().eq("id", id);
    if (error) {
      setPhases(prevPhases);
      setTasks(prevTasks);
      toast.error(error.message);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTask.trim();
    if (!title || !activeId) return;
    setNewTask("");
    const { data, error } = await supabase
      .from("pivote_tasks")
      .insert({ user_id: user.id, phase_id: activeId, title })
      .select("id, phase_id, title, is_completed, proof_image_url, created_at")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Could not add task");
      return;
    }
    setTasks((prev) => [...prev, data]);
  }

  async function toggleTask(task: Task) {
    const next = !task.is_completed;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_completed: next } : t)),
    );
    const { error } = await supabase
      .from("pivote_tasks")
      .update({ is_completed: next })
      .eq("id", task.id);
    if (error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_completed: !next } : t)),
      );
      toast.error(error.message);
    }
  }

  async function deleteTask(id: string) {
    const prev = tasks;
    setTasks((t) => t.filter((x) => x.id !== id));
    const { error } = await supabase.from("pivote_tasks").delete().eq("id", id);
    if (error) {
      setTasks(prev);
      toast.error(error.message);
    }
  }

  async function uploadProof(task: Task, file: File) {
    setUploadingId(task.id);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${task.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("task_proofs")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("pivote_tasks")
        .update({ proof_image_url: path })
        .eq("id", task.id);
      if (error) throw error;
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, proof_image_url: path } : t)),
      );
      toast.success("Proof uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  }

  async function openProof(task: Task) {
    if (!task.proof_image_url) return;
    const { data, error } = await supabase.storage
      .from("task_proofs")
      .createSignedUrl(task.proof_image_url, 300);
    if (error || !data) {
      toast.error(error?.message ?? "Could not open image");
      return;
    }
    setViewer({ url: data.signedUrl, title: task.title });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const phaseList = (
    <nav className="flex h-full min-h-0 flex-col">
      <p className="px-1 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Your phases
      </p>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {phases.map((p) => {
          const pt = tasks.filter((t) => t.phase_id === p.id);
          const done = pt.filter((t) => t.is_completed).length;
          const active = p.id === activeId;
          return (
            <li key={p.id}>
              <div
                className={`group flex items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                  active
                    ? "border-transparent bg-teal text-white"
                    : "border-glass-border bg-glass text-foreground hover:bg-accent"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(p.id);
                    setDrawerOpen(false);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-semibold">{p.title}</span>
                  <span
                    className={`text-xs ${active ? "text-white/75" : "text-muted-foreground"}`}
                  >
                    {done}/{pt.length} done
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${p.title}`}
                  onClick={() => deletePhase(p.id)}
                  className={`shrink-0 rounded-lg p-1.5 transition ${active ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-destructive"}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={addPhase}
        className="mt-4 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" /> Add New Phase
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(60rem 40rem at 10% -10%, rgba(0,78,100,0.10), transparent 60%), radial-gradient(50rem 35rem at 100% 110%, rgba(59,145,168,0.10), transparent 60%)",
        }}
      />

      <header className="glass-card sticky top-0 z-30 mx-2 mt-2 rounded-2xl sm:mx-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Open phases"
              onClick={() => setDrawerOpen(true)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-glass-border text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Logo width={120} height={38} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={signOut}
              className="flex h-10 items-center gap-2 rounded-full border border-glass-border px-3 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        <div className="px-3 pb-3 sm:px-5">
          <div className="flex items-center justify-between pb-1.5 text-xs text-muted-foreground">
            <span>Global completion</span>
            <span className="font-semibold text-teal">{globalPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-teal transition-all duration-500"
              style={{ width: `${globalPct}%` }}
            />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 gap-6 px-2 py-4 sm:px-4">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="surface-card sticky top-40 max-h-[calc(100vh-11rem)] p-4">
            {phaseList}
          </div>
        </aside>

        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              aria-label="Close phases"
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="glass-card absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col rounded-l-none p-4">
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDrawerOpen(false)}
                className="mb-3 self-end rounded-full p-1.5 text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              {phaseList}
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          {loading ? (
            <div className="surface-card grid h-64 place-items-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-teal" />
            </div>
          ) : !activePhase ? (
            <div className="surface-card p-8 text-center sm:p-12">
              <h2 className="text-2xl font-black text-foreground">
                Create Your First Execution Phase to Begin
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                Phases keep your work calm and focused. Add one, fill it with tasks, and
                attach proof as you go.
              </p>
              <button
                type="button"
                onClick={addPhase}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Add New Phase
              </button>
            </div>
          ) : (
            <div className="surface-card flex min-h-[60vh] flex-col p-4 sm:p-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-black text-foreground sm:text-2xl">
                    {activePhase.title}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {phaseTasks.filter((t) => t.is_completed).length} of{" "}
                    {phaseTasks.length} tasks complete
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    aria-label="Previous phase"
                    disabled={activeIndex <= 0}
                    onClick={() => setActiveId(phases[activeIndex - 1]!.id)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-glass-border text-foreground transition hover:bg-accent disabled:opacity-40"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next phase"
                    disabled={activeIndex >= phases.length - 1}
                    onClick={() => setActiveId(phases[activeIndex + 1]!.id)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-glass-border text-foreground transition hover:bg-accent disabled:opacity-40"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {phaseTasks.length === 0 && (
                  <li className="rounded-xl border border-dashed border-glass-border py-10 text-center text-sm text-muted-foreground">
                    No tasks yet — add your first one below.
                  </li>
                )}
                {phaseTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center gap-3 rounded-xl border border-glass-border bg-background/40 px-3 py-3"
                  >
                    <button
                      type="button"
                      aria-label={task.is_completed ? "Mark incomplete" : "Mark complete"}
                      onClick={() => toggleTask(task)}
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90 ${
                        task.is_completed
                          ? "border-teal bg-teal"
                          : "border-muted-foreground/50 bg-transparent"
                      }`}
                    >
                      {task.is_completed && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>

                    <span
                      className={`min-w-0 flex-1 break-words text-sm ${
                        task.is_completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </span>

                    {task.proof_image_url && (
                      <button
                        type="button"
                        onClick={() => openProof(task)}
                        className="shrink-0 rounded-lg bg-teal/15 px-2 py-1 text-[11px] font-semibold text-teal"
                      >
                        Proof
                      </button>
                    )}

                    <input
                      ref={(el) => {
                        fileInputs.current[task.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void uploadProof(task, file);
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Upload proof image"
                      onClick={() => fileInputs.current[task.id]?.click()}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-glass-border text-muted-foreground transition hover:text-teal"
                    >
                      {uploadingId === task.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete task"
                      onClick={() => deleteTask(task.id)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>

              <form onSubmit={addTask} className="mt-5 flex gap-2">
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Add a task…"
                  className="min-w-0 flex-1 rounded-xl border border-glass-border bg-background/60 px-4 py-3 text-base text-foreground outline-none focus:border-teal focus:ring-2 focus:ring-teal/30"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.99]"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Close image"
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setViewer(null)}
          />
          <div className="glass-card relative z-10 max-h-[90vh] w-full max-w-2xl overflow-hidden p-3">
            <div className="flex items-center justify-between gap-3 pb-2">
              <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                {viewer.title}
              </p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setViewer(null)}
                className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={viewer.url}
              alt={`Proof of work for ${viewer.title}`}
              className="max-h-[75vh] w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
