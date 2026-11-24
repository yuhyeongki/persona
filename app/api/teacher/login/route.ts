import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { TEACHER_COOKIE, expectedToken, passwordMatches } from "@/lib/teacher-auth";

export async function POST(req: Request) {
  if (!process.env.TEACHER_PASSWORD) {
    return jsonError("서버에 TEACHER_PASSWORD 환경변수가 설정되어 있지 않습니다.", 500);
  }
  const body = await req.json().catch(() => null);
  const input = String(body?.password ?? "");
  if (!passwordMatches(input)) return jsonError("비밀번호가 맞지 않습니다.", 401);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(TEACHER_COOKIE, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
