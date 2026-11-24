import React, { useRef, useState } from 'react';
import { HEROES } from '../data/heroes';
import { BattleInputBridge, HudSnapshot } from '../types/game';
import { SkillIcon } from './GeometricOrnament';

interface MobileControlsProps {
  hud: HudSnapshot;
  inputBridge: React.MutableRefObject<BattleInputBridge>;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ hud, inputBridge }) => {
  const heroDef = HEROES[hud.heroId];

  // Floating Virtual Joystick State
  const joyPointerId = useRef<number | null>(null);
  const [joyOrigin, setJoyOrigin] = useState<{ x: number; y: number } | null>(null);
  const [joyKnob, setJoyKnob] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const maxRadius = 46;

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (joyPointerId.current !== null) return;
    joyPointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    setJoyOrigin({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setJoyKnob({ dx: 0, dy: 0 });
    inputBridge.current.moveX = 0;
    inputBridge.current.moveY = 0;
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId || !joyOrigin) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    let dx = cx - joyOrigin.x;
    let dy = cy - joyOrigin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setJoyKnob({ dx, dy });
    inputBridge.current.moveX = dx / maxRadius;
    inputBridge.current.moveY = dy / maxRadius;
  };

  const handleJoyEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    joyPointerId.current = null;
    setJoyOrigin(null);
    setJoyKnob({ dx: 0, dy: 0 });
    inputBridge.current.moveX = 0;
    inputBridge.current.moveY = 0;
  };

  const triggerAction = (
    e: React.PointerEvent<HTMLButtonElement>,
    act: 'basic' | 's1' | 's2' | 's3' | 'ult' | 'recall' | 'recovery'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    inputBridge.current.triggerQueue.push(act);
  };

  const skillActions: Array<'s1' | 's2' | 's3' | 'ult'> = ['s1', 's2', 's3', 'ult'];

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-between p-3 sm:p-5 touch-none">
      {/* Left Side: Floating Virtual Joystick Zone */}
      <div
        className="pointer-events-auto relative w-44 h-44 sm:w-52 sm:h-52 touch-none select-none"
        onPointerDown={handleJoyDown}
        onPointerMove={handleJoyMove}
        onPointerUp={handleJoyEnd}
        onPointerCancel={handleJoyEnd}
        aria-label="Joystick Gerak"
      >
        {/* Static resting indicator */}
        <div
          className="absolute w-24 h-24 rounded-full border-2 border-[#d4af37]/40 bg-[#07111e]/45 flex items-center justify-center transition-opacity"
          style={{
            left: joyOrigin ? joyOrigin.x - 48 : 28,
            top: joyOrigin ? joyOrigin.y - 48 : 'calc(100% - 124px)',
          }}
        >
          <div className="w-16 h-16 rounded-full border border-[#14b8a6]/30" />
          <div
            className="absolute w-11 h-11 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#b45309] border-2 border-[#fdfbf7]/80 shadow-lg"
            style={{
              transform: `translate(${joyKnob.dx}px, ${joyKnob.dy}px)`,
            }}
          />
        </div>
      </div>

      {/* Right Side: Recall, Recovery, 3 Skills, Ultimate, Basic Attack */}
      <div className="pointer-events-auto relative flex items-end gap-2 sm:gap-3 touch-none select-none">
        {/* Utility Buttons (Recall & Recovery) */}
        <div className="flex flex-col gap-2 mb-1">
          <button
            type="button"
            onPointerDown={(e) => triggerAction(e, 'recall')}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0c1a2e]/90 border border-[#38bdf8]/60 text-[#93c5fd] flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform"
            title="Pulang ke Markas (B)"
          >
            <SkillIcon type="recall" className="w-5 h-5" />
            <span className="text-[9px] font-bold leading-none mt-0.5">B</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => triggerAction(e, 'recovery')}
            disabled={hud.recoveryCooldown > 0}
            className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0c1a2e]/90 border border-[#10b981]/60 text-[#6ee7b7] flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform overflow-hidden disabled:opacity-60"
            title="Pemulihan Darurat (G)"
          >
            <SkillIcon type="recovery" className="w-5 h-5" />
            <span className="text-[9px] font-bold leading-none mt-0.5">G</span>
            {hud.recoveryCooldown > 0 && (
              <div className="absolute inset-0 bg-black/75 flex items-center justify-center font-mono-num text-xs font-bold text-white">
                {Math.ceil(hud.recoveryCooldown)}
              </div>
            )}
          </button>
        </div>

        {/* Arc of 3 Skills + Ultimate + Basic Attack */}
        <div className="relative w-52 h-44 sm:w-60 sm:h-48">
          {/* Skill 1 (Bottom-Left of Arc) */}
          {heroDef.skills.map((sk, idx) => {
            const cd = hud.skillCooldowns[idx];
            const noMana = hud.mana < sk.manaCost;
            const isUlt = idx === 3;
            const posClass =
              idx === 0
                ? 'left-0 bottom-2'
                : idx === 1
                ? 'left-8 bottom-16 sm:left-10 sm:bottom-20'
                : idx === 2
                ? 'left-24 bottom-28 sm:left-28 sm:bottom-32'
                : 'right-2 bottom-28 sm:right-3 sm:bottom-32';

            return (
              <button
                key={sk.id}
                type="button"
                onPointerDown={(e) => triggerAction(e, skillActions[idx])}
                className={`absolute ${posClass} ${
                  isUlt ? 'w-14 h-14 sm:w-16 sm:h-16 border-[#fbbf24]' : 'w-12 h-12 sm:w-14 sm:h-14 border-[#14b8a6]/80'
                } rounded-full bg-[#0b192c]/95 border-2 flex flex-col items-center justify-center shadow-xl active:scale-95 transition-transform overflow-hidden ${
                  noMana ? 'opacity-60' : 'text-[#fdfbf7]'
                }`}
                title={`${sk.name} (${sk.keyLabel}) - ${sk.manaCost} Mana`}
              >
                <SkillIcon type={sk.iconType} className={isUlt ? 'w-6 h-6 text-[#fbbf24]' : 'w-5 h-5 text-[#5eead4]'} />
                <span className="text-[9px] font-bold text-[#d4af37] leading-none mt-0.5">{sk.keyLabel}</span>
                {cd > 0 && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center font-mono-num text-sm font-bold text-white">
                    {cd > 1 ? Math.ceil(cd) : cd.toFixed(1)}
                  </div>
                )}
              </button>
            );
          })}

          {/* Basic Attack Button (Bottom-Right Anchor) */}
          <button
            type="button"
            onPointerDown={(e) => triggerAction(e, 'basic')}
            className="absolute right-0 bottom-0 w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-br from-[#d4af37] to-[#92400e] border-3 border-[#fef3c7] text-[#07111e] flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-transform"
            title="Serangan Dasar (Spasi)"
          >
            <SkillIcon type="sword" className="w-8 h-8" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider mt-0.5">Serang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
