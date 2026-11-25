"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { MAX_CHARS } from "@/lib/types";

type Msg = { role: "student" | "persona"; content: string };

export default function ChatClient(props: {
  sessionId: string;
  title: string;
  personaName: string;
  maxTurns: number;
  initialUsed: number;
  initialMessages: Msg[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(props.initialMessages);
  const [used, setUsed] = useState(props.initialUsed);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setError("");
    setMessages((m) => [...m, { role: "student", content: t }]);
    setText("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: props.sessionId, text: t }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다. 다시 시도해 주세요.");
      setMessages((m) => [...m, { role: "persona", content: data.reply }]);
      setUsed(data.turn);
      if (data.done) router.push(`/result/${props.sessionId}`);
    } catch (e) {
      // 실패한 질문은 입력창으로 되돌려 다시 보낼 수 있게 합니다.
      setMessages((m) => m.slice(0, -1));
      setText(t);
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // 한글 입력 중(조합 중)의 Enter는 무시합니다.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  function finish() {
    router.push(`/result/${props.sessionId}`);
  }

  const remaining = props.maxTurns - used;

  return (
    <>
      <div className="chat-head">
        <div className="row">
          <div>
            <h1 style={{ fontSize: "1.15rem" }}>{props.title}</h1>
            <div className="muted small">{props.personaName}와 대화 중</div>
            <div className="muted small">
              질문을 다 쓰지 않아도 &apos;대화 마치기&apos;로 언제든 끝내고 평가받을 수 있어요.
            </div>
          </div>
          <div className="badge">남은 질문 {remaining}회</div>
        </div>
      </div>

      <div className="chat-list">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="who">{m.role === "student" ? "나" : props.personaName}</div>
            {m.content}
          </div>
        ))}
        {sending && <div className="typing">{props.personaName}가 생각하는 중...</div>}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        {confirming && (
          <div className="notice">
            <p>대화를 마치고 평가를 받을까요? 마친 뒤에는 이어서 대화할 수 없어요.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={finish}>
                마치고 평가받기
              </button>
              <button className="ghost" type="button" onClick={() => setConfirming(false)}>
                계속 대화하기
              </button>
            </div>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_CHARS}
          rows={3}
          placeholder="궁금한 것을 구체적으로 물어보세요. (Enter: 보내기, Shift+Enter: 줄바꿈)"
          disabled={sending}
        />
        {error && <div className="error">{error}</div>}
        {used < 1 && (
          <div className="muted small" style={{ marginTop: 6 }}>
            질문을 한 번 이상 하면 대화를 마칠 수 있어요.
          </div>
        )}
        <div className="actions">
          <span className="muted small">
            {text.length} / {MAX_CHARS}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="ghost"
              type="button"
              onClick={() => setConfirming(true)}
              disabled={sending || used < 1}
            >
              대화 마치기
            </button>
            <button type="button" onClick={send} disabled={sending || !text.trim()}>
              보내기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
