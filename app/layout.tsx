import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "인물 대화 탐구",
  description: "AI 인물과 대화하며 탐구하고, 대화의 질을 평가받는 수업 도구",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
