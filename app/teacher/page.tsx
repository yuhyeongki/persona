import Link from "next/link";
import { db } from "@/lib/supabase";
import { isTeacher } from "@/lib/teacher-auth";
import { KEPLER } from "@/lib/personas/kepler";
import { formatKst } from "@/lib/util";
import type { Activity } from "@/lib/types";
import { NewActivityForm, TeacherLogin } from "./components";

export const dynamic = "force-dynamic";

export default async function TeacherHome() {
  if (!(await isTeacher())) {
    return (
      <main className="wrap">
        <h1>교사 페이지</h1>
        <p className="muted">비밀번호를 입력해 주세요.</p>
        <TeacherLogin />
        <p className="small">
          <Link href="/">학생 입장 화면으로</Link>
        </p>
      </main>
    );
  }

  const supabase = db();
  const { data: acts } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });
  const { data: sess } = await supabase.from("sessions").select("activity_id");

  const counts = new Map<string, number>();
  for (const s of (sess ?? []) as { activity_id: string }[]) {
    counts.set(s.activity_id, (counts.get(s.activity_id) ?? 0) + 1);
  }
  const activities = (acts ?? []) as Activity[];

  return (
    <main className="wrap wide">
      <h1>교사 페이지</h1>
      <p className="muted">활동을 만들고 학생들의 대화 결과를 확인합니다.</p>

      <NewActivityForm defaultGoals={KEPLER.defaultLearningGoals} />

      <h2>내 활동</h2>
      {activities.length === 0 ? (
        <p className="muted">아직 만든 활동이 없습니다.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>활동</th>
              <th>접속 코드</th>
              <th>질문 제한</th>
              <th>참여 학생</th>
              <th>만든 때</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/teacher/activity/${a.id}`}>{a.title}</Link>
                </td>
                <td>
                  <span className="code" style={{ fontSize: "1rem" }}>
                    {a.join_code}
                  </span>
                </td>
                <td>{a.max_turns}회</td>
                <td>{counts.get(a.id) ?? 0}명</td>
                <td>{formatKst(a.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
