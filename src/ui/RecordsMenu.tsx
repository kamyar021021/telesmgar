import React from 'react';
import { loadGame } from '../game/save';

interface Props { onBack: () => void; }

export default function RecordsMenu({ onBack }: Props) {
  const save = loadGame();
  const hs = save.highScore;

  return (
    <div className="menu-bg">
      <div className="menu-content">
        <div className="title-block">
          <div className="title-icon">🏆</div>
          <h2 className="section-title" style={{ color: '#ffd76a' }}>تالار افتخارات</h2>
        </div>

        <div className="go-stats" style={{ gridTemplateColumns: '1fr', width: '100%', maxWidth: '400px' }}>
          <div className="go-stat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
            <div className="go-stat-label" style={{ fontSize: '16px' }}>بالاترین موج</div>
            <div className="go-stat-val" style={{ fontSize: '32px', color: '#ffd76a' }}>{hs.wave}</div>
          </div>
          
          <div className="go-stat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
            <div className="go-stat-label" style={{ fontSize: '16px' }}>بیشترین کشته</div>
            <div className="go-stat-val" style={{ fontSize: '32px', color: '#ff4a5c' }}>{hs.kills}</div>
          </div>
          
          <div className="go-stat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
            <div className="go-stat-label" style={{ fontSize: '16px' }}>بالاترین سطح</div>
            <div className="go-stat-val" style={{ fontSize: '32px', color: '#8affd0' }}>{hs.level}</div>
          </div>
        </div>

        <button className="btn-primary" style={{ width: '250px', marginTop: '30px' }} onClick={onBack}>
          ← بازگشت
        </button>
      </div>
    </div>
  );
}