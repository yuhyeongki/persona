/** 케플러의 타원 궤도를 빛의 선으로 그린 배경. 초점에 태양, 궤도 위에 행성 점 몇 개만 둡니다. */
export default function Orbit({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`orbit ${className}`}
      viewBox="0 0 800 600"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#bfe9f2" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#bfe9f2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dawn" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f2b79a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f2b79a" stopOpacity="0" />
        </radialGradient>
        <filter id="blur14" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="blur5" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <ellipse cx="410" cy="430" rx="420" ry="190" fill="url(#glow)" opacity="0.4" />
      <ellipse cx="640" cy="120" rx="260" ry="150" fill="url(#dawn)" opacity="0.5" />

      {/* 흐릿한 복제 궤도 */}
      <g filter="url(#blur14)" stroke="#ededf3" fill="none" opacity="0.35">
        <ellipse cx="400" cy="320" rx="330" ry="190" transform="rotate(-14 400 320)" strokeWidth="3" />
      </g>

      {/* 가는 궤도선 */}
      <g stroke="#ededf3" fill="none" strokeWidth="1">
        <ellipse cx="400" cy="320" rx="330" ry="190" transform="rotate(-14 400 320)" opacity="0.32" />
        <ellipse cx="400" cy="320" rx="250" ry="140" transform="rotate(-14 400 320)" opacity="0.2" />
        <ellipse cx="400" cy="320" rx="170" ry="90" transform="rotate(-14 400 320)" opacity="0.15" />
        <ellipse cx="400" cy="320" rx="380" ry="250" transform="rotate(-14 400 320)" opacity="0.15" />
      </g>

      {/* 초점의 태양과 행성 */}
      <circle cx="505" cy="292" r="22" fill="#ededf3" opacity="0.5" filter="url(#blur5)" />
      <circle cx="505" cy="292" r="5" fill="#ededf3" />
      <circle cx="95" cy="395" r="4" fill="#ededf3" opacity="0.9" />
      <circle cx="245" cy="468" r="3" fill="#ededf3" opacity="0.6" />
      <circle cx="690" cy="205" r="3" fill="#ededf3" opacity="0.6" />
    </svg>
  );
}
