import type { Criterion } from "./types";

/** 설계서의 기본 루브릭 4항목 (각 4단계, 합계 16점). */
export const DEFAULT_RUBRIC: Criterion[] = [
  {
    key: "question_specificity",
    name: "질문의 구체성",
    levels: [
      "범위가 너무 넓거나 단답형 질문뿐",
      "주제는 맞지만 막연한 질문이 섞임",
      "대부분 구체적인 대상·조건을 담은 질문",
      "변수나 조건을 짚어 가설을 검증하는 질문",
    ],
  },
  {
    key: "evidence_reasoning",
    name: "근거 활용과 추론",
    levels: [
      "페르소나의 단서를 그냥 지나침",
      "단서를 되풀이할 뿐 연결하지 못함",
      "단서를 근거로 한 단계 추론함",
      "여러 단서를 연결해 자기 설명을 만들고 점검함",
    ],
  },
  {
    key: "concept_accuracy",
    name: "개념 정확성",
    levels: [
      "핵심 개념을 틀리게 말하고 수정하지 않음",
      "일부 개념이 부정확함",
      "핵심 개념을 대체로 정확히 사용",
      "정확히 설명하고 오개념을 스스로 바로잡음",
    ],
  },
  {
    key: "conversation_flow",
    name: "대화 이어가기",
    levels: [
      "답을 받고 곧바로 화제를 바꿈",
      "후속 질문이 가끔 있음",
      "이전 답을 받아 후속 질문을 이어 감",
      "앞선 대화를 종합해 질문의 방향을 조정함",
    ],
  },
];
