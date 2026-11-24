import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/supabase";
import { isUuid } from "@/lib/util";
import { getPersona } from "@/lib/personas";
import EvaluationView from "@/components/EvaluationView";
import type { Activity, EvaluationRow, MessageRow, SessionRow } from "@/lib/types";
import EvaluateTrigger from "./EvaluateTrigger";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  if (!isUuid(sessionId)) notFound();

  const supabase = db();
  const { data } = await supabase
    .from("sessions")
    .select("*, activities(*)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) notFound();

  const { activities, ...rest } = data as SessionRow & { activities: Activity };
  const session = rest as SessionRow;
  const activity = activities;
  const persona = getPersona(activity.persona_key);

  const { data: evs } = await supabase
    .from("evaluations")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1);
  const evaluation = ((evs ?? []) as EvaluationRow[])[0] ?? null;

  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("id");
  const messages = (msgs ?? []) as MessageRow[];

  return (
    <main className="wrap">
      <h1>{activity.title}</h1>
      <p className="muted">
        {persona.name}와의 대화 결과 · {session.student_label}
      </p>

      {evaluation && evaluation.status === "ok" ? (
        <EvaluationView rubric={activity.rubric} evaluation={evaluation} messages={messages} />
      ) : (
        <EvaluateTrigger sessionId={sessionId} auto={!evaluation} failed={!!evaluation} />
      )}

      <p className="center small" style={{ marginTop: 28 }}>
        <Link href="/">처음 화면으로</Link>
      </p>
    </main>
  );
}
