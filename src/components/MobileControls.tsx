import React, { useEffect, useRef, useState } from 'react';
import { HEROES } from '../services/gameCatalog';
import { BattleInputBridge, HudSnapshot } from '../types/game';
import { SkillIcon } from './GeometricOrnament';

interface MobileControlsProps {
  hud: HudSnapshot;
  inputBridge: React.MutableRefObject<BattleInputBridge>;
  visible?: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  hud,
  inputBridge,
  visible = true,
}) => {
  const heroDef = HEROES[hud.heroId];

  // Virtual Analog Stick State (supports Mouse/Trackpad on Laptop & PC + Touch on Mobile)
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const joyPointerId = useRef<number | null>(null);
  const joyOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [joyOrigin, setJoyOrigin] = useState<{ x: number; y: number } | null>(null);
  const [joyKnob, setJoyKnob] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [keyKnob, setKeyKnob] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const pressedKeys = useRef<Set<string>>(new Set());
  const [radius, setRadius] = useState(48);
  const maxRadius = radius;
  const frame = useRef<number | null>(null);
  const attackPointer = useRef<number | null>(null);
  const attackTimer = useRef<number | null>(null);
  const [attacking, setAttacking] = useState(false);
  const stopAttack = () => {
    attackPointer.current = null;
    if (attackTimer.current !== null) window.clearInterval(attackTimer.current);
    attackTimer.current = null;
    setAttacking(false);
  };

  useEffect(() => {
    if (!visible || !zoneRef.current) return;
    const el = zoneRef.current;
    const measure = () => setRadius(Math.max(28, Math.min(54, el.clientWidth * 0.25)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  // Mirror WASD / Arrow keyboard movement onto the Virtual Stick knob for Laptop/PC visual feedback
  useEffect(() => {
    const syncKeys = () => {
      let kx = 0;
      let ky = 0;
      const keys = pressedKeys.current;
      if (keys.has('a') || keys.has('arrowleft')) kx -= 1;
      if (keys.has('d') || keys.has('arrowright')) kx += 1;
      if (keys.has('w') || keys.has('arrowup')) ky -= 1;
      if (keys.has('s') || keys.has('arrowdown')) ky += 1;
      const len = Math.hypot(kx, ky);
      if (len > 0) {
        setKeyKnob({
          dx: (kx / len) * (maxRadius * 0.85),
          dy: (ky / len) * (maxRadius * 0.85),
        });
      } else {
        setKeyKnob({ dx: 0, dy: 0 });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        pressedKeys.current.add(k);
        syncKeys();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (pressedKeys.current.delete(k)) {
        syncKeys();
      }
    };

    const onBlur = () => {
      stopAttack();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      pressedKeys.current.clear();
      setKeyKnob({ dx: 0, dy: 0 });
      joyPointerId.current = null;
      joyOriginRef.current = null;
      setJoyOrigin(null);
      setJoyKnob({ dx: 0, dy: 0 });
      inputBridge.current.moveX = 0;
      inputBridge.current.moveY = 0;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const onVisibility = () => { if (document.hidden) onBlur(); };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    if (!visible) onBlur();
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      if (attackTimer.current !== null) window.clearInterval(attackTimer.current);
      attackTimer.current = null;
      attackPointer.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      inputBridge.current.moveX = 0;
      inputBridge.current.moveY = 0;
    };
  }, [inputBridge, visible, maxRadius]);

  if (!visible) return null;

  const updateStickVector = (clientX: number, clientY: number, origin: { x: number; y: number }) => {
    const el = zoneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    let dx = cx - origin.x;
    let dy = cy - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    const magnitude = Math.min(1, dist / maxRadius);
    const strength = Math.max(0, (magnitude - 0.1) / 0.9);
    inputBridge.current.moveX = dist > 0 ? (cx - origin.x) / dist * strength : 0;
    inputBridge.current.moveY = dist > 0 ? (cy - origin.y) / dist * strength : 0;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setJoyKnob({ dx, dy });
    });
  };

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    if (joyPointerId.current !== null) return;
    joyPointerId.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture errors in headless/synthetic environments
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    // Resting stick center inside the left zone (matches base ring position)
    const restingCenterX = rect.width / 2;
    const restingCenterY = rect.height / 2;
    const distFromRest = Math.hypot(localX - restingCenterX, localY - restingCenterY);

    // If clicking within/near the resting stick ring (ideal for Laptop/PC mouse & trackpad),
    // keep origin anchored at the resting center so clicking any direction moves immediately.
    // Otherwise use floating touch origin where the finger/cursor pressed.
    const origin =
      e.pointerType === 'mouse' && distFromRest <= maxRadius * 1.3
        ? { x: restingCenterX, y: restingCenterY }
        : { x: localX, y: localY };

    joyOriginRef.current = origin;
    setJoyOrigin(origin);
    updateStickVector(e.clientX, e.clientY, origin);
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId || !joyOriginRef.current) return;
    e.preventDefault();
    updateStickVector(e.clientX, e.clientY, joyOriginRef.current);
  };

  const handleJoyEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    joyPointerId.current = null;
    joyOriginRef.current = null;
    setJoyOrigin(null);
    setJoyKnob({ dx: 0, dy: 0 });
    inputBridge.current.moveX = 0;
    inputBridge.current.moveY = 0;
  };

  const triggerAction = (
    e: React.PointerEvent<HTMLButtonElement>,
    act: 'basic' | 's1' | 's2' | 's3' | 'ult' | 'recall' | 'recovery'
  ) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    if (!inputBridge.current.triggerQueue.includes(act)) inputBridge.current.triggerQueue.push(act);
  };

  const startAttack = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (attackPointer.current !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    triggerAction(e, 'basic');
    attackPointer.current = e.pointerId;
    setAttacking(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* optional */ }
    attackTimer.current = window.setInterval(() => {
      if (!inputBridge.current.triggerQueue.includes('basic')) inputBridge.current.triggerQueue.push('basic');
    }, 100);
  };
  const endAttack = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (attackPointer.current === e.pointerId) stopAttack();
  };

  const activeKnob = joyOrigin ? joyKnob : keyKnob;
  const isStickActive =
    Boolean(joyOrigin) || Math.hypot(activeKnob.dx, activeKnob.dy) > 2;
  const skillActions: Array<'s1' | 's2' | 's3' | 'ult'> = ['s1', 's2', 's3', 'ult'];

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-between touch-none" style={{ paddingLeft: "max(12px, env(safe-area-inset-left))", paddingRight: "max(12px, env(safe-area-inset-right))", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      {/* Left Side: Virtual Stick Zone (Mouse/Trackpad on Laptop & PC + Touch on Mobile) */}
      <div
        ref={zoneRef}
        className="pointer-events-auto relative shrink-0 w-[clamp(112px,26vw,216px)] h-[clamp(112px,26vw,216px)] max-h-[48dvh] touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={handleJoyDown}
        onPointerMove={handleJoyMove}
        onPointerUp={handleJoyEnd}
        onPointerCancel={handleJoyEnd}
        onLostPointerCapture={handleJoyEnd}
        title="Stick Virtual: Klik & seret dengan mouse/trackpad, atau gunakan WASD/Panah"
        aria-label="Stick Virtual Gerak"
      >
        {/* Virtual Analog Stick Ring */}
        <div
          className={`absolute w-[clamp(88px,19vw,144px)] h-[clamp(88px,19vw,144px)] max-h-[42dvh] rounded-full border-2 flex items-center justify-center transition-colors ${
            isStickActive
              ? 'border-[#fbbf24] bg-[#0b1f33]/75 shadow-[0_0_24px_rgba(251,191,36,0.28)]'
              : 'border-[#d4af37]/50 bg-[#07111e]/55 hover:border-[#d4af37]/80'
          }`}
          style={{
            left: joyOrigin ? joyOrigin.x : '50%',
            top: joyOrigin ? joyOrigin.y : '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Inner directional guide ring */}
          <div className="w-18 h-18 rounded-full border border-[#14b8a6]/35 pointer-events-none" />

          {/* Cardinal direction markers for clear PC/Laptop & Touch affordance */}
          <span className="absolute top-1.5 text-[8px] font-bold text-[#d4af37]/75 pointer-events-none">
            ▲
          </span>
          <span className="absolute bottom-1.5 text-[8px] font-bold text-[#d4af37]/75 pointer-events-none">
            ▼
          </span>
          <span className="absolute left-1.5 text-[8px] font-bold text-[#d4af37]/75 pointer-events-none">
            ◀
          </span>
          <span className="absolute right-1.5 text-[8px] font-bold text-[#d4af37]/75 pointer-events-none">
            ▶
          </span>

          {/* Movable Stick Knob */}
          <div
            className={`absolute w-[clamp(40px,8vw,60px)] h-[clamp(40px,8vw,60px)] rounded-full bg-gradient-to-br from-[#fbbf24] to-[#b45309] border-2 border-[#fdfbf7]/90 shadow-xl flex items-center justify-center pointer-events-none ${
              isStickActive ? 'scale-105' : ''
            }`}
            style={{
              transform: `translate(${activeKnob.dx}px, ${activeKnob.dy}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-[#fef3c7]/45 border border-[#fdfbf7]/60" />
          </div>
        </div>

        {/* Desktop/Laptop clarity label under the resting stick */}
        <div className="hidden sm:flex absolute left-3 bottom-1 items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#07111e]/80 border border-[#d4af37]/30 text-[10px] font-semibold text-slate-300 pointer-events-none">
          <span className="text-[#fbbf24]">Stick Virtual</span>
          <span>·</span>
          <span>Seret / WASD</span>
        </div>
      </div>

      {/* Right Side: Recall, Recovery, 3 Skills, Ultimate, Basic Attack */}
      <div className="pointer-events-none relative flex items-end gap-1 sm:gap-2 touch-none select-none shrink-0">
        {/* Utility Buttons (Recall & Recovery) */}
        <div className="flex flex-col gap-2 mb-1">
          <button
            type="button"
            onPointerDown={(e) => triggerAction(e, 'recall')}
            className="pointer-events-auto w-[clamp(36px,6vw,48px)] h-[clamp(36px,6vw,48px)] rounded-full bg-[#0c1a2e]/90 border border-[#38bdf8]/60 text-[#93c5fd] flex flex-col items-center justify-center shadow-lg hover:brightness-115 active:scale-95 transition-transform cursor-pointer"
            title="Pulang ke Markas (B)"
          >
            <SkillIcon type="recall" className="w-5 h-5" />
            <span className="text-[9px] font-bold leading-none mt-0.5">B</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => triggerAction(e, 'recovery')}
            disabled={hud.recoveryCooldown > 0}
            className="pointer-events-auto relative w-[clamp(36px,6vw,48px)] h-[clamp(36px,6vw,48px)] rounded-full bg-[#0c1a2e]/90 border border-[#10b981]/60 text-[#6ee7b7] flex flex-col items-center justify-center shadow-lg hover:brightness-115 active:scale-95 transition-transform overflow-hidden disabled:opacity-60 cursor-pointer"
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
        <div className="relative w-[clamp(142px,32vw,260px)] h-[clamp(136px,27vw,210px)] max-h-[48dvh]">
          {/* Skill 1 (Bottom-Left of Arc) */}
          {heroDef.skills.map((sk, idx) => {
            const cd = hud.skillCooldowns[idx];
            const noMana = hud.mana < sk.manaCost;
            const isUlt = idx === 3;
            const posClass =
              idx === 0
                ? 'left-0 bottom-0'
                : idx === 1
                ? 'left-0 bottom-[48%]'
                : idx === 2
                ? 'left-[36%] top-0'
                : 'right-0 top-0';

            return (
              <button
                key={sk.id}
                type="button"
                onPointerDown={(e) => triggerAction(e, skillActions[idx])}
                disabled={cd > 0 || noMana}
                className={`pointer-events-auto absolute ${posClass} ${
                  isUlt ? 'w-[clamp(42px,9vw,68px)] h-[clamp(42px,9vw,68px)] border-[#fbbf24]' : 'w-[clamp(40px,8vw,62px)] h-[clamp(40px,8vw,62px)] border-[#14b8a6]/80'
                } rounded-full bg-[#0b192c]/95 border-2 flex flex-col items-center justify-center shadow-xl hover:brightness-115 active:scale-95 transition-transform overflow-hidden cursor-pointer ${
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
            onPointerDown={startAttack}
            onPointerUp={endAttack}
            onPointerCancel={endAttack}
            onLostPointerCapture={endAttack}
            aria-pressed={attacking}
            className="pointer-events-auto absolute right-0 bottom-0 w-[clamp(58px,12vw,96px)] h-[clamp(58px,12vw,96px)] rounded-full bg-gradient-to-br from-[#d4af37] to-[#92400e] border-3 border-[#fef3c7] text-[#07111e] flex flex-col items-center justify-center shadow-2xl hover:brightness-110 active:scale-90 transition-transform cursor-pointer"
            title="Serangan Dasar — tahan untuk menyerang berulang (Spasi)"
          >
            <SkillIcon type="sword" className="w-8 h-8" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider mt-0.5">{attacking ? "Tahan" : "Serang"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
