import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/supabase";
import { requireTeacher } from "@/lib/teacher-auth";
import { formatKst, isUuid } from "@/lib/util";
import type { Activity, EvaluationRow, SessionRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = db();
  const { data: act } = await supabase.from("activities").select("*").eq("id", id).maybeSingle();
  if (!act) notFound();
  const activity = act as Activity;

  const { data: sess } = await supabase
    .from("sessions")
    .select("*")
    .eq("activity_id", id)
    .order("started_at", { ascending: false });
  const sessions = (sess ?? []) as SessionRow[];

  // 세션마다 가장 최근의 성공한 평가를 찾습니다.
  const latest = new Map<string, EvaluationRow>();
  if (sessions.length > 0) {
    const { data: evs } = await supabase
      .from("evaluations")
      .select("*")
      .in(
        "session_id",
        sessions.map((s) => s.id),
      )
      .eq("status", "ok")
      .order("created_at", { ascending: true });
    for (const e of (evs ?? []) as EvaluationRow[]) latest.set(e.session_id, e);
  }

  // 항목별 평균
  const averages = activity.rubric.map((c) => {
    const vals: number[] = [];
    for (const e of latest.values()) {
      const s = (e.scores ?? []).find((x) => x.criterion === c.key);
      if (s) vals.push(s.score);
    }
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { name: c.name, avg };
  });

  const statusLabel: Record<string, string> = {
    active: "대화 중",
    ended: "평가 대기",
    evaluated: "평가 완료",
  };

  return (
    <main className="wrap wide">
      <p className="small">
        <Link href="/teacher">← 활동 목록</Link>
      </p>
      <h1>{activity.title}</h1>
      <p className="muted">
        접속 코드 <span className="code" style={{ fontSize: "1rem" }}>{activity.join_code}</span> · 질문 제한{" "}
        {activity.max_turns}회 · 참여 {sessions.length}명
      </p>

      {latest.size > 0 && (
        <div className="card">
          <h3>항목별 평균 (평가 완료 {latest.size}명, 4점 만점)</h3>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {averages.map((a) => (
              <li key={a.name}>
                {a.name}: {a.avg === null ? "-" : a.avg.toFixed(1)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>학생별 결과</h2>
      {sessions.length === 0 ? (
        <p className="muted">아직 참여한 학생이 없습니다.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>상태</th>
              <th>질문 수</th>
              <th>총점</th>
              <th>시작</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const ev = latest.get(s.id);
              return (
                <tr key={s.id}>
                  <td>{s.student_label}</td>
                  <td>
                    <span className={`status ${s.status}`}>{statusLabel[s.status]}</span>
                  </td>
                  <td>{s.call_count}</td>
                  <td>{ev ? `${ev.total} / ${activity.rubric.length * 4}` : "-"}</td>
                  <td>{formatKst(s.started_at)}</td>
                  <td>
                    <Link href={`/teacher/session/${s.id}`}>대화·결과 보기</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
