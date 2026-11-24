import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, createHmac, timingSafeEqual } from "crypto";

export const TEACHER_COOKIE = "teacher_token";

function password(): string {
  const p = process.env.TEACHER_PASSWORD;
  if (!p) throw new Error("TEACHER_PASSWORD 환경변수가 없습니다.");
  return p;
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** 쿠키에 저장되는 값. 비밀번호로 만든 HMAC이라 비밀번호를 바꾸면 기존 로그인은 모두 무효가 됩니다. */
export function expectedToken(): string {
  return createHmac("sha256", password()).update("teacher-session-v1").digest("hex");
}

export function passwordMatches(input: string): boolean {
  return safeEqual(input, password());
}

export async function isTeacher(): Promise<boolean> {
  try {
    const jar = await cookies();
    const value = jar.get(TEACHER_COOKIE)?.value;
    return !!value && safeEqual(value, expectedToken());
  } catch {
    return false;
  }
}

export async function requireTeacher(): Promise<void> {
  if (!(await isTeacher())) redirect("/teacher");
}
