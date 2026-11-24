import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { jsonError } from "@/lib/http";
import { getPersona } from "@/lib/personas";
import type { Activity } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const code = String(body?.code ?? "").trim().toUpperCase();
  const name = String(body?.name ?? "").trim().slice(0, 20);
  if (!code || !name) return jsonError("접속 코드와 이름을 입력해 주세요.", 400);

  const supabase = db();
  const { data: act } = await supabase
    .from("activities")
    .select("*")
    .eq("join_code", code)
    .maybeSingle();
  if (!act) return jsonError("접속 코드를 찾을 수 없습니다.", 404);
  const activity = act as Activity;

  const { data: sess, error } = await supabase
    .from("sessions")
    .insert({ activity_id: activity.id, student_label: name })
    .select("id")
    .single();
  if (error || !sess) return jsonError("입장 중 오류가 발생했습니다. 다시 시도해 주세요.", 500);

  const persona = getPersona(activity.persona_key);
  await supabase.from("messages").insert({
    session_id: sess.id,
    turn_no: 0,
    role: "persona",
    content: persona.opening,
  });

  return NextResponse.json({ sessionId: sess.id });
}
