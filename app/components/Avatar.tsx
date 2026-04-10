'use client';

import { AvatarLevel, AVATAR_LEVELS } from '../lib/types';

interface AvatarProps {
  level: AvatarLevel;
  totalCalories: number;
  animate?: boolean;
}

export default function Avatar({ level, totalCalories, animate = true }: AvatarProps) {
  const levelInfo = AVATAR_LEVELS[level - 1];
  const nextLevel = level < 5 ? AVATAR_LEVELS[level as 1 | 2 | 3 | 4] : null;
  const progress = nextLevel
    ? ((totalCalories - levelInfo.minCalories) / (nextLevel.minCalories - levelInfo.minCalories)) * 100
    : 100;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative ${animate ? 'animate-float' : ''}`}>
        <svg
          width="200"
          height="280"
          viewBox="0 0 200 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-xl"
        >
          {/* Glow effect */}
          <defs>
            <radialGradient id={`glow-${level}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={levelInfo.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={levelInfo.color} stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`skin-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd5b0" />
              <stop offset="100%" stopColor="#e8b88a" />
            </linearGradient>
            <linearGradient id={`shirt-${level}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={levelInfo.color} />
              <stop offset="100%" stopColor={adjustColor(levelInfo.color, -30)} />
            </linearGradient>
          </defs>

          {/* Background glow for higher levels */}
          {level >= 3 && (
            <circle cx="100" cy="130" r="90" fill={`url(#glow-${level})`}>
              {animate && (
                <animate attributeName="r" values="85;95;85" dur="2s" repeatCount="indefinite" />
              )}
            </circle>
          )}

          {/* Level 4+ power aura */}
          {level >= 4 && (
            <>
              <circle cx="100" cy="130" r="70" stroke={levelInfo.color} strokeWidth="1" fill="none" opacity="0.4">
                <animate attributeName="r" values="70;80;70" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </>
          )}

          {/* Level 5 lightning effects */}
          {level === 5 && (
            <>
              <path d="M55 60 L60 80 L50 80 L58 100" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.8">
                <animate attributeName="opacity" values="0.8;0;0.8" dur="0.5s" repeatCount="indefinite" />
              </path>
              <path d="M145 55 L140 75 L150 75 L142 95" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.6">
                <animate attributeName="opacity" values="0;0.8;0" dur="0.7s" repeatCount="indefinite" />
              </path>
            </>
          )}

          {renderBody(level, levelInfo.color)}
        </svg>
      </div>

      {/* Level info */}
      <div className="text-center">
        <div className="flex items-center gap-2 justify-center">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: levelInfo.color }}
          />
          <span className="text-lg font-bold" style={{ color: levelInfo.color }}>
            Lv.{level} {levelInfo.name}
          </span>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          총 {totalCalories.toLocaleString()} kcal 소모
        </p>
      </div>

      {/* Progress to next level */}
      {nextLevel && (
        <div className="w-full max-w-[200px]">
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>Lv.{level}</span>
            <span>Lv.{level + 1}</span>
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: levelInfo.color,
              }}
            />
          </div>
          <p className="text-xs text-zinc-400 text-center mt-1">
            다음 레벨까지 {(nextLevel.minCalories - totalCalories).toLocaleString()} kcal
          </p>
        </div>
      )}
    </div>
  );
}

function renderBody(level: AvatarLevel, color: string) {
  // Muscle scale factors per level
  const s = {
    1: { shoulder: 28, arm: 8, chest: 32, waist: 26, leg: 12, neck: 10 },
    2: { shoulder: 32, arm: 10, chest: 36, waist: 28, leg: 14, neck: 11 },
    3: { shoulder: 38, arm: 14, chest: 42, waist: 30, leg: 17, neck: 12 },
    4: { shoulder: 44, arm: 18, chest: 48, waist: 32, leg: 20, neck: 14 },
    5: { shoulder: 50, arm: 22, chest: 54, waist: 34, leg: 23, neck: 15 },
  }[level];

  return (
    <g>
      {/* Head */}
      <ellipse cx="100" cy="55" rx="28" ry="32" fill={`url(#skin-${level})`} />

      {/* Hair */}
      <path
        d={`M72 48 Q72 25 100 22 Q128 25 128 48`}
        fill="#3d2b1f"
      />

      {/* Eyes */}
      <ellipse cx="88" cy="52" rx="4" ry="4.5" fill="white" />
      <ellipse cx="112" cy="52" rx="4" ry="4.5" fill="white" />
      <ellipse cx="89" cy="52" rx="2.5" ry="2.8" fill="#2d1b00" />
      <ellipse cx="113" cy="52" rx="2.5" ry="2.8" fill="#2d1b00" />

      {/* Eyebrows - get more intense at higher levels */}
      <path
        d={level >= 4 ? "M80 43 Q88 38 96 42" : "M80 44 Q88 41 96 44"}
        stroke="#3d2b1f"
        strokeWidth={level >= 3 ? "2.5" : "2"}
        fill="none"
      />
      <path
        d={level >= 4 ? "M104 42 Q112 38 120 43" : "M104 44 Q112 41 120 44"}
        stroke="#3d2b1f"
        strokeWidth={level >= 3 ? "2.5" : "2"}
        fill="none"
      />

      {/* Mouth - gets more confident at higher levels */}
      {level <= 2 ? (
        <path d="M92 68 Q100 73 108 68" stroke="#c97a5a" strokeWidth="2" fill="none" />
      ) : (
        <path d="M89 67 Q100 76 111 67" stroke="#c97a5a" strokeWidth="2.5" fill="none" />
      )}

      {/* Neck */}
      <rect x={100 - s.neck / 2} y="82" width={s.neck} height="12" rx="3" fill={`url(#skin-${level})`} />

      {/* Shoulders & Torso (Tank top / shirt) */}
      <path
        d={`
          M${100 - s.shoulder} 98
          Q${100 - s.shoulder} 92 ${100 - s.chest / 2} 94
          L${100 - s.waist / 2} 170
          Q100 175 ${100 + s.waist / 2} 170
          L${100 + s.chest / 2} 94
          Q${100 + s.shoulder} 92 ${100 + s.shoulder} 98
          L${100 + s.shoulder} 130
          Q${100 + s.shoulder + 2} 138 ${100 + s.chest / 2 + 2} 140
          L${100 + s.waist / 2} 170
          Q100 175 ${100 - s.waist / 2} 170
          L${100 - s.chest / 2 - 2} 140
          Q${100 - s.shoulder - 2} 138 ${100 - s.shoulder} 130
          Z
        `}
        fill={`url(#shirt-${level})`}
      />

      {/* Chest muscle lines for level 3+ */}
      {level >= 3 && (
        <g opacity="0.2">
          <line x1="100" y1="98" x2="100" y2="140" stroke="black" strokeWidth="1" />
          <path d={`M${100 - s.chest / 3} 105 Q100 115 ${100 + s.chest / 3} 105`} stroke="black" strokeWidth="1" fill="none" />
        </g>
      )}

      {/* Abs lines for level 4+ */}
      {level >= 4 && (
        <g opacity="0.15">
          <line x1="100" y1="140" x2="100" y2="168" stroke="black" strokeWidth="1" />
          <line x1={100 - s.waist / 3} y1="148" x2={100 + s.waist / 3} y2="148" stroke="black" strokeWidth="0.8" />
          <line x1={100 - s.waist / 3.5} y1="158" x2={100 + s.waist / 3.5} y2="158" stroke="black" strokeWidth="0.8" />
        </g>
      )}

      {/* Left Arm */}
      <path
        d={`
          M${100 - s.shoulder} 98
          L${100 - s.shoulder - s.arm} 140
          Q${100 - s.shoulder - s.arm - 2} 145 ${100 - s.shoulder - s.arm + 2} 148
          L${100 - s.shoulder + 4} 130
        `}
        fill={`url(#skin-${level})`}
      />
      {/* Left bicep highlight for level 3+ */}
      {level >= 3 && (
        <ellipse
          cx={100 - s.shoulder - s.arm / 2 + 2}
          cy={115}
          rx={s.arm / 2.5}
          ry={8}
          fill={`url(#skin-${level})`}
          stroke="#d4a574"
          strokeWidth="0.5"
          opacity="0.6"
        />
      )}

      {/* Right Arm */}
      <path
        d={`
          M${100 + s.shoulder} 98
          L${100 + s.shoulder + s.arm} 140
          Q${100 + s.shoulder + s.arm + 2} 145 ${100 + s.shoulder + s.arm - 2} 148
          L${100 + s.shoulder - 4} 130
        `}
        fill={`url(#skin-${level})`}
      />
      {/* Right bicep highlight for level 3+ */}
      {level >= 3 && (
        <ellipse
          cx={100 + s.shoulder + s.arm / 2 - 2}
          cy={115}
          rx={s.arm / 2.5}
          ry={8}
          fill={`url(#skin-${level})`}
          stroke="#d4a574"
          strokeWidth="0.5"
          opacity="0.6"
        />
      )}

      {/* Hands */}
      <circle cx={100 - s.shoulder - s.arm} cy={148} r="5" fill={`url(#skin-${level})`} />
      <circle cx={100 + s.shoulder + s.arm} cy={148} r="5" fill={`url(#skin-${level})`} />

      {/* Shorts */}
      <path
        d={`
          M${100 - s.waist / 2} 168
          L${100 - s.leg - 4} 210
          Q${100 - s.leg / 2} 212 ${100 - 2} 172
          Q${100 + s.leg / 2 - 2} 212 ${100 + s.leg + 4} 210
          L${100 + s.waist / 2} 168
          Z
        `}
        fill="#1e293b"
      />

      {/* Left Leg */}
      <path
        d={`
          M${100 - s.leg - 2} 208
          L${100 - s.leg} 255
          Q${100 - s.leg} 260 ${100 - s.leg + 3} 260
          L${100 - 3} 260
          Q${100} 260 ${100 - 2} 255
          L${100 - 2} 210
        `}
        fill={`url(#skin-${level})`}
      />

      {/* Right Leg */}
      <path
        d={`
          M${100 + s.leg + 2} 208
          L${100 + s.leg} 255
          Q${100 + s.leg} 260 ${100 + s.leg - 3} 260
          L${100 + 3} 260
          Q${100} 260 ${100 + 2} 255
          L${100 + 2} 210
        `}
        fill={`url(#skin-${level})`}
      />

      {/* Shoes */}
      <ellipse cx={100 - s.leg / 2 - 1} cy="262" rx={s.leg / 2 + 4} ry="5" fill={color} />
      <ellipse cx={100 + s.leg / 2 + 1} cy="262" rx={s.leg / 2 + 4} ry="5" fill={color} />

      {/* Level 5 headband */}
      {level === 5 && (
        <>
          <rect x="70" y="38" width="60" height="5" rx="2" fill="#ef4444" />
          <path d="M130 38 L140 30 L135 42" fill="#ef4444" />
        </>
      )}

      {/* Level 4+ wristbands */}
      {level >= 4 && (
        <>
          <rect x={100 - s.shoulder - s.arm - 4} y="138" width="8" height="5" rx="2" fill={color} />
          <rect x={100 + s.shoulder + s.arm - 4} y="138" width="8" height="5" rx="2" fill={color} />
        </>
      )}
    </g>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

export function getAvatarLevel(totalCalories: number): AvatarLevel {
  for (let i = AVATAR_LEVELS.length - 1; i >= 0; i--) {
    if (totalCalories >= AVATAR_LEVELS[i].minCalories) {
      return AVATAR_LEVELS[i].level as AvatarLevel;
    }
  }
  return 1;
}
