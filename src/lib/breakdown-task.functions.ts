import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BreakdownResult = { steps: string[]; error?: string };

function parseSteps(text: string): string[] {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    const parsed = JSON.parse(slice) as { steps?: unknown };
    if (!Array.isArray(parsed.steps)) return [];
    return parsed.steps
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  } catch {
    return [];
  }
}

export const breakdownTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { goal: string }) => {
    if (!data || typeof data.goal !== "string" || !data.goal.trim()) {
      throw new Error("A goal is required");
    }
    return { goal: data.goal.trim().slice(0, 300) };
  })
  .handler(async ({ data }): Promise<BreakdownResult> => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) return { steps: [], error: "AI breakdown is not configured." };

    const prompt = `Goal: "${data.goal}". Break this vague goal into 3-4 short, actionable sub-tasks that can each be visually verified with a photo or screenshot. Each sub-task must be under 70 characters. Answer strictly in JSON: { "steps": ["...", "...", "..."] }`;

    const models = ["gemini-3.7-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
    const body = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    });

    let res: Response | null = null;
    for (const model of models) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body,
        },
      );
      if (res.ok) break;
      console.error("[breakdown-task] Gemini error", {
        model,
        status: res.status,
        body: await res.text().catch(() => ""),
      });
      if (res.status !== 404 && res.status !== 400) break;
    }

    if (!res || !res.ok) return { steps: [], error: "AI breakdown failed. Try again." };

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const steps = parseSteps(text);
    if (steps.length === 0) return { steps: [], error: "The AI returned no sub-tasks." };
    return { steps };
  });
