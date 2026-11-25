import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { jsonError } from "@/lib/http";
import { isUuid } from "@/lib/util";
import { generateDetailed, type GeminiContent } from "@/lib/gemini";
import { getPersona } from "@/lib/personas";
import { MAX_CHARS, type Activity, type MessageRow, type SessionRow } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const sessionId = String(body?.sessionId ?? "");
  const text = String(body?.text ?? "").trim();

  if (!isUuid(sessionId)) return jsonError("잘못된 요청입니다.", 400);
  if (!text) return jsonError("내용을 입력해 주세요.", 400);
  if (text.length > MAX_CHARS) {
    return jsonError(`한 번에 ${MAX_CHARS}자까지 입력할 수 있습니다.`, 400);
  }

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

  if (session.status !== "active") return jsonError("이미 끝난 대화입니다.", 409);
  if (session.call_count >= activity.max_turns) {
    return jsonError("질문 횟수를 모두 사용했습니다.", 409);
  }

  const turn = session.call_count + 1;

  // 1) 학생 발화 저장 (같은 턴 번호가 이미 있으면 unique 제약으로 막힙니다)
  const saved = await supabase
    .from("messages")
    .insert({ session_id: sessionId, turn_no: turn, role: "student", content: text });
  if (saved.error) return jsonError("저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
  await supabase.from("sessions").update({ call_count: turn }).eq("id", sessionId);

  // 2) 지금까지의 대화로 페르소나 응답 생성
  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("id");

  const contents: GeminiContent[] = [{ role: "user", parts: [{ text: "(대화 시작)" }] }];
  for (const m of (msgs ?? []) as MessageRow[]) {
    contents.push({
      role: m.role === "student" ? "user" : "model",
      parts: [{ text: m.content }],
    });
  }

  const persona = getPersona(activity.persona_key);
  let reply: string;
  let usedModel: string;
  try {
    const result = await generateDetailed({
      system: persona.systemPrompt,
      contents,
      temperature: 0.7,
    });
    reply = result.text;
    usedModel = result.model;
  } catch (e) {
    console.error("chat generate failed", e);
    // 응답을 못 받았으면 학생 발화를 되돌려 같은 질문을 다시 보낼 수 있게 합니다.
    await supabase
      .from("messages")
      .delete()
      .eq("session_id", sessionId)
      .eq("role", "student")
      .eq("turn_no", turn);
    await supabase
      .from("sessions")
      .update({ call_count: session.call_count })
      .eq("id", sessionId);
    return jsonError("AI 응답을 받지 못했습니다. 다시 보내 주세요.", 502);
  }

  const personaRow = { session_id: sessionId, turn_no: turn, role: "persona", content: reply };
  let saveReply = await supabase.from("messages").insert({ ...personaRow, model: usedModel });
  if (saveReply.error) {
    // messages.model 컬럼을 아직 만들지 않았어도 대화는 저장되도록 모델 이름 없이 다시 저장합니다.
    console.error("save persona message with model failed", saveReply.error.message);
    saveReply = await supabase.from("messages").insert(personaRow);
    if (saveReply.error) console.error("save persona message failed", saveReply.error.message);
  }

  return NextResponse.json({
    reply,
    turn,
    remaining: activity.max_turns - turn,
    done: turn >= activity.max_turns,
  });
}
