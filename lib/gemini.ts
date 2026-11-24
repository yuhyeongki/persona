export type GeminiContent = {
  role: "user" | "model";
  parts: { text: string }[];
};

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-3.8-flash";
}

/** 기본 모델이 혼잡하거나 느릴 때 대신 쓰는 모델. GEMINI_FALLBACK_MODEL 을 빈 값으로 두면 끕니다. */
export function fallbackModel(): string {
  return process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash-lite";
}

class GeminiError extends Error {
  retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

type GenerateOpts = {
  system: string;
  contents: GeminiContent[];
  temperature?: number;
  json?: boolean;
  /** 모델 한 번 호출의 제한 시간(ms). 기본 20초. */
  timeoutMs?: number;
};

async function callOnce(model: string, opts: GenerateOpts): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY 환경변수가 없습니다.", false);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20000),
    });
  } catch (e) {
    // 시간 초과나 네트워크 오류는 다른 모델로 다시 시도해 볼 만합니다.
    const reason = e instanceof Error ? e.message : String(e);
    throw new GeminiError(`Gemini 호출 실패 (${model}, 응답 없음/시간 초과): ${reason}`, true);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // 429(한도), 500번대(서버 혼잡·오류)는 일시적일 수 있어 다른 모델로 재시도합니다.
    const retryable = res.status === 429 || res.status >= 500;
    throw new GeminiError(
      `Gemini 호출 실패 (${res.status}, ${model}): ${detail.slice(0, 300)}`,
      retryable,
    );
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p: { text?: string }) => p.text ?? "").join("")
    : "";
  if (!text.trim()) {
    throw new GeminiError(
      `Gemini 응답이 비어 있습니다 (${model}). 안전 필터로 차단되었거나 생성에 실패했습니다.`,
      true,
    );
  }
  return text.trim();
}

/**
 * Gemini REST API(generateContent)를 직접 호출합니다. SDK 없이 fetch만 사용합니다.
 * 기본 모델이 일시적으로 실패(혼잡, 한도, 시간 초과)하면 대체 모델로 한 번 더 시도하고,
 * 실제로 응답한 모델 이름도 함께 돌려줍니다.
 */
export async function generateDetailed(
  opts: GenerateOpts,
): Promise<{ text: string; model: string }> {
  const primary = geminiModel();
  try {
    return { text: await callOnce(primary, opts), model: primary };
  } catch (e) {
    const fb = fallbackModel();
    if (!fb || fb === primary || !(e instanceof GeminiError) || !e.retryable) throw e;
    console.warn(`primary model failed, falling back to ${fb}:`, e.message);
    return { text: await callOnce(fb, opts), model: fb };
  }
}

export async function generate(opts: GenerateOpts): Promise<string> {
  return (await generateDetailed(opts)).text;
}
