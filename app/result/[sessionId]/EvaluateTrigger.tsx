"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** 평가 결과가 아직 없을 때 /api/end 를 호출해 평가를 실행하고, 끝나면 화면을 새로고침합니다. */
export default function EvaluateTrigger({
  sessionId,
  auto,
  failed,
}: {
  sessionId: string;
  auto: boolean;
  failed: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "error">(
    auto ? "running" : failed ? "error" : "idle",
  );
  const [message, setMessage] = useState(
    failed ? "평가에 실패했습니다. 다시 시도해 주세요." : "",
  );
  const started = useRef(false);

  async function run() {
    setState("running");
    setMessage("");
    try {
      const res = await fetch("/api/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "평가에 실패했습니다.");
      router.refresh();
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "평가에 실패했습니다.");
    }
  }

  useEffect(() => {
    if (auto && !started.current) {
      started.current = true;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "running") {
    return (
      <div className="card center">
        <p>대화를 평가하고 있어요. 10~20초 정도 걸릴 수 있습니다...</p>
      </div>
    );
  }

  return (
    <div className="card center">
      {message && <p className="error">{message}</p>}
      <button type="button" onClick={run}>
        평가 다시 시도
      </button>
    </div>
  );
}
