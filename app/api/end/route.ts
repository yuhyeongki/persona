import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { jsonError } from "@/lib/http";
import { isUuid } from "@/lib/util";
import { evaluate } from "@/lib/evaluate";
import { getPersona } from "@/lib/personas";
import type { Activity, MessageRow, SessionRow } from "@/lib/types";

export const maxDuration = 60;

/**
 * 대화를 종료하고 평가를 실행합니다.
 * 평가가 실패해 status가 'ended'로 남아 있으면 같은 요청으로 다시 평가할 수 있습니다.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const sessionId = String(body?.sessionId ?? "");
  if (!isUuid(sessionId)) return jsonError("잘못된 요청입니다.", 400);

  const supabase = db();
  const { data } = await supabase
    .from("sessions")
    .select("*, activities(*)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) return jsonError("대화를 찾을 수 없습니다.", 404);

  const { activities, ...rest } = data as SessionRow & { activities: Activity };
  const session = rest as SessionRow;
  const activity = activities;

  if (session.status === "evaluated") return NextResponse.json({ status: "evaluated" });

  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("id");
  const messages = (msgs ?? []) as MessageRow[];

  if (!messages.some((m) => m.role === "student")) {
    return jsonError("보낸 질문이 없어 평가할 수 없습니다.", 400);
  }

  if (session.status === "active") {
    await supabase
      .from("sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  const persona = getPersona(activity.persona_key);
  const result = await evaluate({
    goals: activity.learning_goals,
    rubric: activity.rubric,
    messages,
    personaName: persona.name,
  });

  if (!result.ok) {
    console.error("evaluation failed", result.error);
    await supabase.from("evaluations").insert({
      session_id: sessionId,
      status: "failed",
      error: result.error.slice(0, 500),
      model: result.model,
      prompt_version: result.prompt_version,
    });
    return jsonError("평가에 실패했습니다. 잠시 후 다시 시도해 주세요.", 502);
  }

  const saved = await supabase.from("evaluations").insert({
    session_id: sessionId,
    status: "ok",
    scores: result.scores,
    total: result.total,
    strengths: result.strengths,
    next_questions: result.next_questions,
    misconceptions: result.misconceptions,
    confidence: result.confidence,
    model: result.model,
    prompt_version: result.prompt_version,
  });
  if (saved.error) return jsonError("평가 결과를 저장하지 못했습니다.", 500);

  await supabase.from("sessions").update({ status: "evaluated" }).eq("id", sessionId);
  return NextResponse.json({ status: "evaluated" });
}
