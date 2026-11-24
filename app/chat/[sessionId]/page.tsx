import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { isUuid } from "@/lib/util";
import { getPersona } from "@/lib/personas";
import type { Activity, MessageRow, SessionRow } from "@/lib/types";
import ChatClient from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage({
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

  if (session.status !== "active") redirect(`/result/${sessionId}`);

  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("id");
  const persona = getPersona(activity.persona_key);

  return (
    <main className="wrap">
      <ChatClient
        sessionId={sessionId}
        title={activity.title}
        personaName={persona.name}
        maxTurns={activity.max_turns}
        initialUsed={session.call_count}
        initialMessages={((msgs ?? []) as MessageRow[]).map((m) => ({
          role: m.role,
          content: m.content,
        }))}
      />
    </main>
  );
}
