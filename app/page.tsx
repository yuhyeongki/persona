"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "입장하지 못했습니다.");
      router.push(`/chat/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "입장하지 못했습니다.");
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <div className="center" style={{ marginTop: 40 }}>
        <h1>인물 대화 탐구</h1>
        <p className="muted">선생님이 알려 준 접속 코드로 입장하세요.</p>
      </div>
      <form className="card" onSubmit={onSubmit} style={{ marginTop: 24 }}>
        <label htmlFor="code">접속 코드</label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={10}
          autoComplete="off"
          placeholder="예: K7M2QX"
        />
        <label htmlFor="name">이름 (또는 번호)</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoComplete="off"
          placeholder="예: 10203 홍길동"
        />
        {error && <div className="error">{error}</div>}
        <div style={{ marginTop: 16 }}>
          <button type="submit" disabled={loading || !code.trim() || !name.trim()} style={{ width: "100%" }}>
            {loading ? "입장 중..." : "입장하기"}
          </button>
        </div>
      </form>
      <p className="center small muted" style={{ marginTop: 24 }}>
        <Link href="/teacher">교사 페이지</Link>
      </p>
    </main>
  );
}
