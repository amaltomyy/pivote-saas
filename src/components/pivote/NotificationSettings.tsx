import { useEffect, useRef, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function NotificationSettings({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState("09:00");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Load profile + auto-detect / sync the browser timezone.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const tz = detectTimezone();
      const { data } = await supabase
        .from("profiles")
        .select("reminder_time, user_timezone, reminders_enabled")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;

      if (data) {
        setEnabled(Boolean(data.reminders_enabled));
        if (data.reminder_time) setTime(String(data.reminder_time).slice(0, 5));
        setTimezone(data.user_timezone ?? tz);
        if (data.user_timezone !== tz) {
          await supabase.from("profiles").update({ user_timezone: tz }).eq("id", userId);
          if (!cancelled) setTimezone(tz);
        }
      } else {
        setTimezone(tz);
        await supabase
          .from("profiles")
          .insert({ id: userId, user_timezone: tz, reminder_time: "09:00" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function save() {
    setSaving(true);
    const tz = detectTimezone();
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      reminder_time: `${time}:00`,
      user_timezone: tz,
      reminders_enabled: enabled,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTimezone(tz);
    toast.success(
      enabled ? `Daily reminder set for ${time} (${tz})` : "Reminders turned off",
    );
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Notification settings"
        onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 place-items-center rounded-full border border-glass-border text-foreground transition hover:bg-accent"
      >
        <Bell className="h-4 w-4" />
      </button>

      {open && (
        <div className="panel-card absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] p-4">
          <p className="text-sm font-bold text-foreground">Daily reminder</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Timezone auto-detected: <span className="font-medium">{timezone}</span>
          </p>

          <label className="mt-3 flex items-center justify-between gap-3 text-sm text-foreground">
            <span>Enable reminders</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-5 w-5 accent-[var(--accent-teal)]"
            />
          </label>

          <label className="mt-3 block text-sm text-foreground">
            <span className="text-xs text-muted-foreground">Remind me at</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-glass-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none"
            />
          </label>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save settings
          </button>
        </div>
      )}
    </div>
  );
}
