export const MAX_CHARS = 500;

export type Criterion = {
  key: string;
  name: string;
  /** 1점~4점 단계 서술 (인덱스 0 = 1점) */
  levels: string[];
};

export type Activity = {
  id: string;
  title: string;
  persona_key: string;
  learning_goals: string;
  rubric: Criterion[];
  max_turns: number;
  join_code: string;
  created_at: string;
};

export type SessionRow = {
  id: string;
  activity_id: string;
  student_label: string;
  status: "active" | "ended" | "evaluated";
  started_at: string;
  ended_at: string | null;
  call_count: number;
};

export type MessageRow = {
  id: number;
  session_id: string;
  turn_no: number;
  role: "student" | "persona";
  content: string;
  created_at: string;
};

export type ScoreItem = {
  criterion: string;
  score: number;
  evidence_turns: number[];
  reason: string;
};

export type Misconception = { turn: number; note: string };

export type Confidence = "high" | "medium" | "low";

export type EvaluationRow = {
  id: string;
  session_id: string;
  status: "ok" | "failed";
  scores: ScoreItem[] | null;
  total: number | null;
  strengths: string | null;
  next_questions: string[] | null;
  misconceptions: Misconception[] | null;
  confidence: Confidence | null;
  error: string | null;
  model: string;
  prompt_version: string;
  created_at: string;
};
