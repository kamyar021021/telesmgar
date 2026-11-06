import React from 'react';
import type { HudState } from '../types';

interface Props {
  hud: HudState;
  onPause: () => void;
}

export default function HUD({ hud, onPause }: Props) {
  const hpPct = (hud.hp / hud.maxHp) * 100;

  return (
    <div className="hud">
      {/* Top-left: HP */}
      <div className="hud-top-left">
        <div className="stat-pill hp">
          <span className="pill-label">جان</span>
          <span className="pill-val">{hud.hp} / {hud.maxHp}</span>
        </div>
        <div className="stat-bar-wrap">
          <div className="stat-bar hp" style={{ width: `${hpPct}%` }} />
        </div>
      </div>

      {/* Top-center: Wave */}
      <div className="hud-top-center">
        <div className="wave-badge">
          <span className="wave-label">موج</span>
          <span className="wave-num">{hud.wave}</span>
        </div>
        <div className="level-pill">سطح {hud.level}</div>
      </div>

      {/* Top-right: Pause + Kills */}
      <div className="hud-top-right">
        <div className="stat-pill kills">
          <span>💀</span>
          <b>{hud.kills}</b>
        </div>
        <button className="pause-btn" onClick={onPause}>⏸</button>
      </div>
    </div>
  );
}