import type { Criterion, EvaluationRow, MessageRow } from "@/lib/types";

/**
 * 평가 결과 표시. 학생 결과 화면과 교사 화면이 함께 씁니다.
 * teacher=true 이면 오개념 목록과 모델·프롬프트 버전도 보여 줍니다.
 */
export default function EvaluationView({
  rubric,
  evaluation,
  messages,
  teacher = false,
}: {
  rubric: Criterion[];
  evaluation: EvaluationRow;
  messages: MessageRow[];
  teacher?: boolean;
}) {
  const scores = evaluation.scores ?? [];
  const studentByTurn = new Map<number, string>();
  for (const m of messages) {
    if (m.role === "student") studentByTurn.set(m.turn_no, m.content);
  }
  const reference = evaluation.confidence === "low" || studentByTurn.size < 3;

  return (
    <div>
      {reference && (
        <div className="notice">
          대화가 짧거나 근거가 충분하지 않아 <b>참고용</b> 결과입니다.
        </div>
      )}

      <div className="total">
        <span className="big">{evaluation.total ?? 0}</span> / {rubric.length * 4}점
      </div>

      {rubric.map((c) => {
        const s = scores.find((x) => x.criterion === c.key);
        if (!s) return null;
        return (
          <section className="card" key={c.key}>
            <div className="row">
              <h3>{c.name}</h3>
              <span className="badge">{s.score} / 4</span>
            </div>
            <div className="bar">
              <div style={{ width: `${(s.score / 4) * 100}%` }} />
            </div>
            <p>{s.reason}</p>
            <p className="muted small">{c.levels[s.score - 1]}</p>
            {s.evidence_turns.length > 0 && (
              <ul className="quotes">
                {s.evidence_turns.map((t) => (
                  <li key={t}>
                    <span className="turn">턴 {t}</span>
                    {studentByTurn.get(t)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {evaluation.strengths && (
        <section className="card">
          <h3>잘한 점</h3>
          <p style={{ marginTop: 8 }}>{evaluation.strengths}</p>
        </section>
      )}

      {(evaluation.next_questions ?? []).length > 0 && (
        <section className="card">
          <h3>다음에 해 볼 질문</h3>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {(evaluation.next_questions ?? []).map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      {teacher && (
        <>
          <section className="card">
            <h3>오개념 의심 (교사용)</h3>
            {(evaluation.misconceptions ?? []).length === 0 ? (
              <p className="muted small" style={{ marginTop: 8 }}>
                발견된 항목이 없습니다.
              </p>
            ) : (
              <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                {(evaluation.misconceptions ?? []).map((m, i) => (
                  <li key={i}>
                    <span className="turn">턴 {m.turn}</span>
                    {m.note}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="muted small">
            모델 {evaluation.model} · 프롬프트 {evaluation.prompt_version} · 신뢰도{" "}
            {evaluation.confidence ?? "-"}
          </p>
        </>
      )}
    </div>
  );
}
