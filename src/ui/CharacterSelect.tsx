import React, { useState } from 'react';
import { CHARACTERS } from '../game/data';
import { loadGame, unlockCharacter } from '../game/save';

interface Props {
  onSelect: (id: string) => void;
  onBack: () => void;
}

export default function CharacterSelect({ onSelect, onBack }: Props) {
  const [save, setSave] = useState(loadGame());

  const handleCharClick = (id: string, cost: number) => {
    if (save.unlockedCharacters.includes(id)) {
      onSelect(id);
    } else {
      if (unlockCharacter(id, cost)) {
        setSave(loadGame()); // آپدیت UI پس از خرید
      } else {
        alert('سکه کافی نیست!');
      }
    }
  };

  return (
    <div className="menu-bg">
      <div className="menu-content wide">
        <h2 className="section-title">انتخاب جادوگر</h2>
        <div style={{ fontSize: '20px', color: '#ffd76a', marginBottom: '20px' }}>
          🪙 {save.gold} سکه
        </div>

        <div className="char-grid">
          {CHARACTERS.map((c) => {
            const isUnlocked = save.unlockedCharacters.includes(c.id);
            
            return (
              <button
                key={c.id}
                className="char-card"
                onClick={() => handleCharClick(c.id, c.cost)}
                type="button"
                style={{ opacity: isUnlocked ? 1 : 0.7, borderColor: isUnlocked ? 'var(--border)' : '#444' }}
              >
                <div className="char-icon" style={{ color: `#${c.color.toString(16).padStart(6, '0')}`, filter: isUnlocked ? 'none' : 'grayscale(100%)' }}>
                  {isUnlocked ? c.icon : '🔒'}
                </div>
                <div className="char-name">{c.name}</div>
                <div className="char-title">{c.title}</div>
                <div className="char-desc">{c.desc}</div>
                <div className="char-perk">✦ {c.perk}</div>
                
                {isUnlocked ? (
                  <div style={{ color: '#8affd0', fontWeight: 'bold', marginTop: '10px', fontSize: '14px' }}>آزاد شده</div>
                ) : (
                  <div style={{ color: '#ffd76a', fontWeight: 'bold', marginTop: '10px', fontSize: '14px' }}>خرید ({c.cost} سکه)</div>
                )}
              </button>
            );
          })}
        </div>

        <button className="btn-ghost" onClick={onBack} type="button">← بازگشت</button>
      </div>
    </div>
  );
}