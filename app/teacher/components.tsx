"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function TeacherLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "로그인하지 못했습니다.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인하지 못했습니다.");
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ marginTop: 24 }}>
      <label htmlFor="pw">교사 비밀번호</label>
      <input
        id="pw"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      {error && <div className="error">{error}</div>}
      <div style={{ marginTop: 16 }}>
        <button type="submit" disabled={loading || !password}>
          {loading ? "확인 중..." : "로그인"}
        </button>
      </div>
    </form>
  );
}

export function NewActivityForm({ defaultGoals }: { defaultGoals: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [goals, setGoals] = useState(defaultGoals);
  const [maxTurns, setMaxTurns] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setCreated("");
    try {
      const res = await fetch("/api/teacher/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, learningGoals: goals, maxTurns }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "활동을 만들지 못했습니다.");
      setCreated(data.join_code);
      setTitle("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "활동을 만들지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <h3>새 활동 만들기 (케플러와 행성 운동 탐구)</h3>
      <label htmlFor="title">활동 이름</label>
      <input
        id="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={60}
        placeholder="예: 2학년 3반 케플러와의 대화"
      />
      <label htmlFor="goals">학습 목표 (평가 프롬프트에 그대로 들어갑니다)</label>
      <textarea id="goals" rows={4} value={goals} onChange={(e) => setGoals(e.target.value)} />
      <label htmlFor="turns">질문 횟수 제한 (3~50)</label>
      <input
        id="turns"
        type="number"
        min={3}
        max={50}
        value={maxTurns}
        onChange={(e) => setMaxTurns(Number(e.target.value))}
        style={{ width: 120 }}
      />
      {error && <div className="error">{error}</div>}
      {created && (
        <p style={{ marginTop: 12 }}>
          만들었습니다. 접속 코드: <span className="code">{created}</span>
        </p>
      )}
      <div style={{ marginTop: 16 }}>
        <button type="submit" disabled={loading || !title.trim()}>
          {loading ? "만드는 중..." : "활동 만들기"}
        </button>
      </div>
    </form>
  );
}

/** 학생이 대화를 마치지 않고 나간 경우, 교사가 대신 대화를 끝내고 평가를 실행합니다. */
export function EvaluateNowButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "평가에 실패했습니다.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "평가에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <p>
        아직 평가 결과가 없습니다. 학생이 대화를 마치지 않고 나갔다면 여기서 대신 평가할 수 있습니다.
        실행하면 이 대화는 종료되고 학생은 더 이상 이어서 대화할 수 없습니다.
      </p>
      {error && <div className="error">{error}</div>}
      <div style={{ marginTop: 10 }}>
        <button type="button" onClick={run} disabled={loading}>
          {loading ? "평가 중... (10~20초)" : "지금 평가하기"}
        </button>
      </div>
    </div>
  );
}
