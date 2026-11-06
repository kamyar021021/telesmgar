import React, { useRef, useState } from "react";

interface Props {
  onMove: (x: number, z: number) => void;
  onEnd: () => void;
}

export default function Joystick({ onMove, onEnd }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const baseSize = 120;
  const knobSize = 50;
  const maxDist = (baseSize - knobSize) / 2 + 10;

  const handleTouch = (e: React.TouchEvent) => {
    if (!baseRef.current) return;
    const touch = e.touches[0];
    const rect = baseRef.current.getBoundingClientRect();
    let dx = touch.clientX - (rect.left + rect.width / 2);
    let dy = touch.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    setKnobPos({ x: dx, y: dy });
    onMove(dx / maxDist, dy / maxDist);
  };

  return (
    <div
      ref={baseRef}
      className="joystick-base"
      onTouchStart={(e) => {
        setActive(true);
        handleTouch(e);
      }}
      onTouchMove={handleTouch}
      onTouchEnd={() => {
        setActive(false);
        setKnobPos({ x: 0, y: 0 });
        onEnd();
      }}
      onTouchCancel={() => {
        setActive(false);
        setKnobPos({ x: 0, y: 0 });
        onEnd();
      }}
      style={{
        position: "fixed",
        bottom: "30px",
        left: "30px",
        width: baseSize,
        height: baseSize,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.1)",
        border: "2px solid rgba(255,255,255,0.2)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "none",
      }}
    >
      <div
        style={{
          width: knobSize,
          height: knobSize,
          borderRadius: "50%",
          background: "rgba(255, 215, 106, 0.8)",
          boxShadow: "0 0 10px rgba(255, 215, 106, 0.5)",
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          transition: active ? "none" : "transform 0.1s ease-out",
        }}
      />
    </div>
  );
}
