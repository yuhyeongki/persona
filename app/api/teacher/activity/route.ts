import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { db } from "@/lib/supabase";
import { jsonError } from "@/lib/http";
import { isTeacher } from "@/lib/teacher-auth";
import { DEFAULT_RUBRIC } from "@/lib/rubric";
import { KEPLER } from "@/lib/personas/kepler";

// 헷갈리는 글자(0/O, 1/I)를 뺀 접속 코드용 문자
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export async function POST(req: Request) {
  if (!(await isTeacher())) return jsonError("권한이 없습니다.", 401);

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim().slice(0, 60);
  const goals = String(body?.learningGoals ?? "").trim() || KEPLER.defaultLearningGoals;
  const maxTurns = Math.min(50, Math.max(3, Math.floor(Number(body?.maxTurns) || 20)));
  if (!title) return jsonError("활동 이름을 입력해 주세요.", 400);

  const supabase = db();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("activities")
      .insert({
        title,
        persona_key: KEPLER.key,
        learning_goals: goals.slice(0, 2000),
        rubric: DEFAULT_RUBRIC,
        max_turns: maxTurns,
        join_code: randomCode(),
      })
      .select("id, join_code")
      .single();

    if (!error && data) return NextResponse.json(data);
    // 23505 = 접속 코드가 겹친 경우, 새 코드로 다시 시도
    if (error && error.code !== "23505") {
      console.error("create activity failed", error);
      return jsonError("활동을 만들지 못했습니다.", 500);
    }
  }
  return jsonError("접속 코드를 만들지 못했습니다. 다시 시도해 주세요.", 500);
}
