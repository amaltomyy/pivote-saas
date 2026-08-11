import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Increments minutes_spent by 1 for every 60s of active window time. */
export function useUsageTracking(userId: string | undefined) {
  const activeRef = useRef(true);

  useEffect(() => {
    if (!userId) return;

    const onVisibility = () => {
      activeRef.current = document.visibilityState === "visible";
    };
    const onFocus = () => (activeRef.current = true);
    const onBlur = () => (activeRef.current = false);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    const tick = async () => {
      if (!activeRef.current) return;
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("pivote_usage_logs")
        .select("id, minutes_spent")
        .eq("user_id", userId)
        .eq("session_date", today)
        .maybeSingle();

      if (data) {
        await supabase
          .from("pivote_usage_logs")
          .update({
            minutes_spent: (data.minutes_spent ?? 0) + 1,
            last_active: new Date().toISOString(),
          })
          .eq("id", data.id);
      } else {
        await supabase.from("pivote_usage_logs").insert({
          user_id: userId,
          session_date: today,
          minutes_spent: 1,
          last_active: new Date().toISOString(),
        });
      }
    };

    const interval = window.setInterval(tick, 60_000);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, [userId]);
}
