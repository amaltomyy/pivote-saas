import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type VerifyInput = {
  taskTitle: string;
  imageBase64: string;
  mimeType: string;
};

export type VerifyResult = { verified: boolean; reason: string };

function parseJsonish(text: string): VerifyResult {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    const parsed = JSON.parse(slice.replace(/'/g, '"')) as Partial<VerifyResult>;
    return {
      verified: Boolean(parsed.verified),
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? parsed.reason.trim()
          : "No explanation provided.",
    };
  } catch {
    return { verified: false, reason: "Could not read the AI verification result." };
  }
}

export const verifyTaskImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: VerifyInput) => {
    if (!data || typeof data.taskTitle !== "string" || !data.taskTitle.trim()) {
      throw new Error("taskTitle is required");
    }
    if (typeof data.imageBase64 !== "string" || data.imageBase64.length < 32) {
      throw new Error("A valid image is required");
    }
    return {
      taskTitle: data.taskTitle.slice(0, 300),
      imageBase64: data.imageBase64,
      mimeType: data.mimeType || "image/jpeg",
    };
  })
  .handler(async ({ data }): Promise<VerifyResult> => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) {
      console.error("[verify-task-image] GEMINI_API_KEY is not configured");
      return { verified: false, reason: "AI verification is not configured." };
    }

    const models = ["gemini-3.7-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
    const prompt = `Task Title: ${data.taskTitle}. Analyze this image. Does this photo show reasonable visual proof that this specific task was completed? Answer strictly in JSON format: { "verified": boolean, "reason": "short explanation" }`;

    const body = JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: data.mimeType, data: data.imageBase64 } },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    });

    let res: Response | null = null;
    for (const modelName of models) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body,
        },
      );
      if (res.ok) break;
      const detail = await res.text().catch(() => "");
      console.error(`[verify-task-image] Gemini API error [${modelName}]`, {
        status: res.status,
        statusText: res.statusText,
        body: detail,
      });
      // Only fall through to the next model when this one isn't available.
      if (res.status !== 404 && res.status !== 400) break;
    }

    if (!res || !res.ok) {
      return {
        verified: false,
        reason:
          res?.status === 429
            ? "AI verification is rate limited. Try again in a moment."
            : "AI verification failed. Please try again.",
      };
    }


    const json = (await res.json()) as {
      error?: { message?: string; code?: number };
      candidates?: {
        finishReason?: string;
        safetyRatings?: unknown[];
        content?: { parts?: { text?: string }[] };
      }[];
    };

    if (json.error) {
      console.error("[verify-task-image] Gemini response error", json.error);
      return {
        verified: false,
        reason: json.error.message || "AI verification returned an error.",
      };
    }

    const firstCandidate = json.candidates?.[0];
    if (!firstCandidate) {
      console.error("[verify-task-image] No candidates returned", json);
      return { verified: false, reason: "The AI could not analyse this image." };
    }

    if (firstCandidate.finishReason && firstCandidate.finishReason !== "STOP") {
      console.error("[verify-task-image] Gemini finish reason", {
        finishReason: firstCandidate.finishReason,
        safetyRatings: firstCandidate.safetyRatings,
      });
      return {
        verified: false,
        reason: `AI verification blocked (${firstCandidate.finishReason}). Try a clearer photo.`,
      };
    }

    const text = firstCandidate.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text.trim()) {
      console.error("[verify-task-image] Empty response text", json);
      return { verified: false, reason: "The AI could not analyse this image." };
    }

    const result = parseJsonish(text);
    console.log("[verify-task-image] Verification result", {
      verified: result.verified,
      reason: result.reason,
    });
    return result;
  });
