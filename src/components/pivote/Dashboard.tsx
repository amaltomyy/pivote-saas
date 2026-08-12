import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Logo, Footer } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { useUsageTracking } from "./useUsageTracking";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  Flame,
  Loader2,
  Lock,
  LogOut,
  Menu,
  MonitorSmartphone,
  Plus,
  Target,
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

type UsageLog = { session_date: string; minutes_spent: number | null };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Dashboard({ user }: { user: User }) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [usage, setUsage] = useState<UsageLog[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useUsageTracking(user.id);

  const loadAll = useCallback(async () => {
    const [{ data: p, error: pe }, { data: t, error: te }, { data: u }] =
      await Promise.all([
        supabase
          .from("pivote_phases")
          .select("id, title, description, created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("pivote_tasks")
          .select("id, phase_id, title, is_completed, proof_image_url, created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("pivote_usage_logs")
          .select("session_date, minutes_spent")
          .order("session_date", { ascending: true }),
      ]);
    if (pe || te) toast.error(pe?.message ?? te?.message ?? "Failed to load data");
    setPhases(p ?? []);
    setTasks(t ?? []);
    setUsage(u ?? []);
    setActiveId((cur) => cur ?? p?.[0]?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Signed thumbnails for proof images
  useEffect(() => {
    const missing = tasks.filter((t) => t.proof_image_url && !thumbs[t.proof_image_url]);
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      const paths = [...new Set(missing.map((t) => t.proof_image_url!))];
      const { data } = await supabase.storage
        .from("task_proofs")
        .createSignedUrls(paths, 3600);
      if (cancelled || !data) return;
      setThumbs((prev) => {
        const next = { ...prev };
        for (const item of data) {
          if (item.path && item.signedUrl) next[item.path] = item.signedUrl;
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [tasks, thumbs]);

  const activeIndex = phases.findIndex((p) => p.id === activeId);
  const activePhase = activeIndex >= 0 ? phases[activeIndex] : undefined;
  const phaseTasks = useMemo(
    () => tasks.filter((t) => t.phase_id === activeId),
    [tasks, activeId],
  );
  const completedCount = tasks.filter((t) => t.is_completed).length;
  const globalPct = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  const usageByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of usage) map[u.session_date] = u.minutes_spent ?? 0;
    return map;
  }, [usage]);

  const weekData = useMemo(() => {
    const out: { day: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ day: DAY_LABELS[d.getDay()]!, minutes: usageByDate[key] ?? 0 });
    }
    return out;
  }, [usageByDate]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayMinutes = usageByDate[todayKey] ?? 0;
  const yesterdayKey = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const deltaMinutes = todayMinutes - (usageByDate[yesterdayKey] ?? 0);

  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if ((usageByDate[key] ?? 0) > 0) count++;
      else if (i > 0) break;
    }
    return count;
  }, [usageByDate]);

  const donutData = [
    { name: "Completed", value: completedCount },
    { name: "Pending", value: Math.max(tasks.length - completedCount, 0) },
  ];

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
    const cached = thumbs[task.proof_image_url];
    if (cached) {
      setViewer({ url: cached, title: task.title });
      return;
    }
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
      <button
        type="button"
        onClick={addPhase}
        className="flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-teal px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal/20 transition hover:opacity-90 active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" /> New Phase
      </button>
      <p className="px-1 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        My phases
      </p>
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {phases.map((p) => {
          const pt = tasks.filter((t) => t.phase_id === p.id);
          const active = p.id === activeId;
          return (
            <li key={p.id}>
              <div
                className={`group flex items-center gap-2 rounded-2xl px-3 py-3 transition ${
                  active
                    ? "bg-teal/10 text-teal ring-1 ring-teal/30"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(p.id);
                    setDrawerOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Target
                    className={`h-4 w-4 shrink-0 ${active ? "text-teal" : "text-muted-foreground"}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {p.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {pt.length}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${p.title}`}
                  onClick={() => deletePhase(p.id)}
                  className="shrink-0 rounded-lg p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const features = [
    {
      icon: Cloud,
      title: "Proof of Work",
      body: "Upload screenshots and images as proof of execution.",
    },
    {
      icon: Lock,
      title: "Private & Secure",
      body: "Your data is private and protected with row-level security.",
    },
    {
      icon: Clock,
      title: "Background Tracking",
      body: "Tracks your active time automatically in the background.",
    },
    {
      icon: MonitorSmartphone,
      title: "Access Anywhere",
      body: "Works seamlessly on Android, iOS, web and tablets.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(60rem 40rem at 10% -10%, rgba(0,78,100,0.12), transparent 60%), radial-gradient(50rem 35rem at 100% 110%, rgba(59,145,168,0.12), transparent 60%)",
        }}
      />

      <header className="panel-card sticky top-0 z-30 mx-2 mt-2 sm:mx-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-5 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-6">
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

          <div className="col-span-2 order-last rounded-2xl bg-muted/40 px-4 py-2.5 xl:order-none xl:col-span-1">
            <div className="flex items-center justify-between pb-1.5 text-xs text-muted-foreground">
              <span>Overall Completion</span>
              <span className="font-bold text-foreground">{globalPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal to-teal/60 transition-all duration-500"
                style={{ width: `${globalPct}%` }}
              />
            </div>
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
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] flex-1 px-2 py-4 sm:px-4">
        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_20rem]">
          {/* Left: phases */}
          <aside className="hidden lg:block">
            <div className="panel-card sticky top-32 max-h-[calc(100vh-9rem)] p-3">
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
              <div className="panel-card absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col rounded-l-none p-4">
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

          {/* Center: tasks */}
          <main className="min-w-0">
            {loading ? (
              <div className="panel-card grid h-64 place-items-center p-6">
                <Loader2 className="h-6 w-6 animate-spin text-teal" />
              </div>
            ) : !activePhase ? (
              <div className="panel-card p-8 text-center sm:p-12">
                <h1 className="text-2xl font-black text-foreground">
                  Create Your First Execution Phase to Begin
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                  Phases keep your work calm and focused. Add one, fill it with tasks,
                  and attach proof as you go.
                </p>
                <button
                  type="button"
                  onClick={addPhase}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  <Plus className="h-4 w-4" /> New Phase
                </button>
              </div>
            ) : (
              <div className="panel-card flex min-h-[60vh] flex-col p-4 sm:p-6">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal/10 text-teal sm:grid">
                      <Target className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="truncate text-xl font-black text-foreground sm:text-3xl">
                        {activePhase.title}
                      </h1>
                      <p className="truncate text-xs text-muted-foreground sm:text-sm">
                        {activePhase.description ??
                          "Execute with clarity and consistent proof."}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      aria-label="Previous phase"
                      disabled={activeIndex <= 0}
                      onClick={() => setActiveId(phases[activeIndex - 1]!.id)}
                      className="flex h-10 items-center gap-1 rounded-full border border-glass-border px-3 text-sm text-foreground transition hover:bg-accent disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Next phase"
                      disabled={activeIndex >= phases.length - 1}
                      onClick={() => setActiveId(phases[activeIndex + 1]!.id)}
                      className="flex h-10 items-center gap-1 rounded-full bg-teal px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={addTask}
                  className="mt-5 flex items-center gap-2 rounded-2xl border border-glass-border bg-background/50 px-3 py-2"
                >
                  <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <input
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Add a new task…"
                    className="min-w-0 flex-1 bg-transparent py-2 text-base text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    aria-label="Add task"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal text-white transition hover:opacity-90 active:scale-95"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </form>

                <div className="mt-5 hidden grid-cols-[minmax(0,1fr)_5rem_4.5rem_2rem] gap-3 px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
                  <span>Task</span>
                  <span className="text-center">Proof</span>
                  <span className="text-center">Added</span>
                  <span />
                </div>

                <ul className="flex-1 divide-y divide-border/70">
                  {phaseTasks.length === 0 && (
                    <li className="rounded-xl border border-dashed border-glass-border py-10 text-center text-sm text-muted-foreground">
                      No tasks yet — add your first one above.
                    </li>
                  )}
                  {phaseTasks.map((task) => (
                    <li
                      key={task.id}
                      className="soft-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 py-3 hover:bg-accent/40 sm:grid-cols-[minmax(0,1fr)_5rem_4.5rem_2rem]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <button
                          type="button"
                          aria-label={
                            task.is_completed ? "Mark incomplete" : "Mark complete"
                          }
                          onClick={() => toggleTask(task)}
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-90 ${
                            task.is_completed
                              ? "border-teal bg-teal"
                              : "border-muted-foreground/40 bg-transparent"
                          }`}
                        >
                          {task.is_completed && (
                            <Check className="h-3.5 w-3.5 text-white" />
                          )}
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
                      </div>

                      <div className="flex items-center justify-center gap-2">
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
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-glass-border text-muted-foreground transition hover:text-teal"
                        >
                          {uploadingId === task.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Camera className="h-4 w-4" />
                          )}
                        </button>
                        {task.proof_image_url && (
                          <button
                            type="button"
                            onClick={() => openProof(task)}
                            aria-label={`View proof for ${task.title}`}
                            className="h-9 w-12 shrink-0 overflow-hidden rounded-lg border border-glass-border bg-muted"
                          >
                            {thumbs[task.proof_image_url] ? (
                              <img
                                src={thumbs[task.proof_image_url]}
                                alt={`Proof of work for ${task.title}`}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">
                                …
                              </span>
                            )}
                          </button>
                        )}
                      </div>

                      <span className="hidden text-center text-xs text-muted-foreground sm:block">
                        {new Date(task.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>

                      <button
                        type="button"
                        aria-label="Delete task"
                        onClick={() => deleteTask(task.id)}
                        className="hidden shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:text-destructive sm:block"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>

                <p className="mt-4 border-t border-border/70 pt-4 text-sm text-muted-foreground">
                  {phaseTasks.filter((t) => t.is_completed).length} of{" "}
                  {phaseTasks.length} tasks completed
                </p>
              </div>
            )}
          </main>

          {/* Right: analytics */}
          <aside className="space-y-4 xl:sticky xl:top-32 xl:self-start">
            <section className="panel-card p-4">
              <h2 className="text-sm font-bold text-foreground">Time Spent Today</h2>
              <p className="mt-2 text-3xl font-black text-foreground">
                {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m
              </p>
              <p className="text-xs text-teal">
                {deltaMinutes >= 0 ? "+" : ""}
                {deltaMinutes}m{" "}
                <span className="text-muted-foreground">from yesterday</span>
              </p>
              <div className="mt-3 h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={weekData}
                    margin={{ top: 6, right: 6, left: 6, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="var(--accent-teal)"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--accent-teal)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "var(--foreground)",
                      }}
                      formatter={(v: number) => [`${v} min`, "Active"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke="var(--accent-teal)"
                      strokeWidth={2}
                      fill="url(#usageFill)"
                      dot={{ r: 3, fill: "var(--accent-teal)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel-card p-4">
              <h2 className="text-sm font-bold text-foreground">Completion Breakdown</h2>
              <div className="mt-2 flex items-center gap-3">
                <div className="relative h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        innerRadius={40}
                        outerRadius={58}
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                        paddingAngle={2}
                      >
                        <Cell fill="var(--accent-teal)" />
                        <Cell fill="var(--muted)" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <span className="pointer-events-none absolute inset-0 grid place-items-center text-xl font-black text-foreground">
                    {globalPct}%
                  </span>
                </div>
                <ul className="min-w-0 flex-1 space-y-2 text-sm">
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-teal" /> Completed
                    </span>
                    <span className="font-semibold text-foreground">
                      {completedCount}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />{" "}
                      Pending
                    </span>
                    <span className="font-semibold text-foreground">
                      {tasks.length - completedCount}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold text-foreground">{tasks.length}</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="panel-card flex items-center gap-3 p-4">
              <Flame className="h-8 w-8 shrink-0 text-teal" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-teal">Current Streak</p>
                <p className="text-2xl font-black text-foreground">
                  {streak} {streak === 1 ? "Day" : "Days"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Keep it up! You&apos;re doing great.
                </p>
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="panel-card flex items-start gap-3 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal/10 text-teal">
                <f.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Close image"
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setViewer(null)}
          />
          <div className="panel-card relative z-10 max-h-[90vh] w-full max-w-2xl overflow-hidden p-3">
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
