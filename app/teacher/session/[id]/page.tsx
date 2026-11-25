import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/supabase";
import { requireTeacher } from "@/lib/teacher-auth";
import { formatKst, isUuid } from "@/lib/util";
import { getPersona } from "@/lib/personas";
import EvaluationView from "@/components/EvaluationView";
import type { Activity, EvaluationRow, MessageRow, SessionRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeacherSessionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = db();
  const { data } = await supabase
    .from("sessions")
    .select("*, activities(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const { activities, ...rest } = data as SessionRow & { activities: Activity };
  const session = rest as SessionRow;
  const activity = activities;
  const persona = getPersona(activity.persona_key);

  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", id)
    .order("id");
  const messages = (msgs ?? []) as MessageRow[];

  const { data: evs } = await supabase
    .from("evaluations")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: false });
  const all = (evs ?? []) as EvaluationRow[];
  const evaluation = all.find((e) => e.status === "ok") ?? null;
  const failures = all.filter((e) => e.status === "failed");

  // 평가의 근거로 인용된 학생 발화를 대화 전문에서 강조합니다.
  const cited = new Set<number>();
  for (const s of evaluation?.scores ?? []) for (const t of s.evidence_turns) cited.add(t);

  return (
    <main className="wrap">
      <p className="small">
        <Link href={`/teacher/activity/${activity.id}`}>← {activity.title}</Link>
      </p>
      <h1>{session.student_label}</h1>
      <p className="muted">
        {persona.name}와의 대화 · 질문 {session.call_count}회 · {formatKst(session.started_at)} 시작
      </p>

      <h2>평가 결과</h2>
      {evaluation ? (
        <EvaluationView
          rubric={activity.rubric}
          evaluation={evaluation}
          messages={messages}
          teacher
        />
      ) : (
        <p className="muted">아직 평가 결과가 없습니다.</p>
      )}
      {failures.length > 0 && (
        <p className="small error">
          평가 실패 기록 {failures.length}건 (최근 오류: {failures[0].error ?? "알 수 없음"})
        </p>
      )}

      <h2>대화 전문 (노란 테두리 = 평가 근거로 인용된 발화)</h2>
      <div className="chat-list" style={{ minHeight: 0 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`msg ${m.role}${m.role === "student" && cited.has(m.turn_no) ? " hl" : ""}`}
          >
            <div className="who">
              {m.role === "student"
                ? `${session.student_label} · 턴 ${m.turn_no}`
                : `${persona.name}${m.model ? ` · ${m.model}` : ""}`}
            </div>
            {m.content}
          </div>
        ))}
      </div>
    </main>
  );
}
