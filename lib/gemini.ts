export type GeminiContent = {
  role: "user" | "model";
  parts: { text: string }[];
};

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-3.8-flash";
}

/**
 * Gemini REST API(generateContent)를 직접 호출합니다. SDK 없이 fetch만 사용합니다.
 * API 키는 서버 환경변수에만 있고 브라우저로 나가지 않습니다.
 */
export async function generate(opts: {
  system: string;
  contents: GeminiContent[];
  temperature?: number;
  json?: boolean;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY 환경변수가 없습니다.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini 호출 실패 (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p: { text?: string }) => p.text ?? "").join("")
    : "";
  if (!text.trim()) {
    throw new Error("Gemini 응답이 비어 있습니다. (안전 필터로 차단되었거나 생성에 실패했습니다.)");
  }
  return text.trim();
}
