import React, { useRef, useState } from 'react';

interface Props {
  onMove: (x: number, z: number) => void;
  onEnd: () => void;
}

export default function Joystick({ onMove, onEnd }: Props) {
  const [active, setActive] = useState(false);
  const [basePos, setBasePos] = useState({ x: 0, y: 0 });
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  const baseSize = 120;
  const knobSize = 50;
  const maxDist = (baseSize - knobSize) / 2 + 10;

  const handleTouchStart = (e: React.TouchEvent) => {
    // اگر از قبل در حال لمس است، کاری نکن
    if (touchIdRef.current !== null) return;
    
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier; // ذخیره شناسه انگشت
    
    setActive(true);
    setBasePos({ x: touch.clientX, y: touch.clientY }); // جوی استیک همانجا ساخته میشود
    setKnobPos({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    
    // پیدا کردن همان انگشتی که لمس کرده بود
    const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
    if (!touch) return;

    let dx = touch.clientX - basePos.x;
    let dy = touch.clientY - basePos.y;
    const dist = Math.hypot(dx, dy);

    // محدود کردن دکمه به داخل دایره پایه
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    setKnobPos({ x: dx, y: dy });
    // نرمال سازی مقدار بین -1 تا 1 برای ارسال به موتور بازی
    onMove(dx / maxDist, dy / maxDist);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    
    const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
    if (touch) {
      touchIdRef.current = null;
      setActive(false);
      setKnobPos({ x: 0, y: 0 });
      onEnd();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40, // زیر منوها و HUD
        touchAction: 'none', // جلوگیری از اسکرول شدن صفحه
        pointerEvents: 'auto',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {active && (
        <div
          style={{
            position: 'absolute',
            left: basePos.x - baseSize / 2,
            top: basePos.y - baseSize / 2,
            width: baseSize,
            height: baseSize,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              width: knobSize,
              height: knobSize,
              borderRadius: '50%',
              background: 'rgba(255, 215, 106, 0.8)',
              boxShadow: '0 0 10px rgba(255, 215, 106, 0.5)',
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: 'transform 0.05s ease-out',
            }}
          />
        </div>
      )}
    </div>
  );
}