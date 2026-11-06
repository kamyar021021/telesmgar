import React from 'react';
import { BIOMES } from '../game/data';

interface Props {
  onSelect: (id: string) => void;
  onBack: () => void;
}

export default function BiomeSelect({ onSelect, onBack }: Props) {
  return (
    <div className="menu-bg">
      <div className="menu-content wide">
        <h2 className="section-title">انتخاب سرزمین</h2>
        <p className="section-sub">زمین بازی بی‌پایان است — به هر سو که بخواهی</p>

        <div className="biome-grid">
          {Object.values(BIOMES).map(b => (
            <button
              key={b.id}
              className="biome-card"
              onClick={() => onSelect(b.id)}
              style={{ '--biome-color': b.ground } as React.CSSProperties}
            >
              <div className="biome-icon">{b.icon}</div>
              <div className="biome-name">{b.name}</div>
              <div className="biome-desc">{b.desc}</div>
            </button>
          ))}
        </div>

        <button className="btn-ghost" onClick={onBack}>← بازگشت</button>
      </div>
    </div>
  );
}