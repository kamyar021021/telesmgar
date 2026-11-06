import React, { useState } from 'react';
import { loadGame, updateSettings, resetSave } from '../game/save';

interface Props { onBack: () => void; }

export default function SettingsMenu({ onBack }: Props) {
  const [save, setSave] = useState(loadGame());
  const [bgm, setBgm] = useState(save.settings.bgmVol);
  const [sfx, setSfx] = useState(save.settings.sfxVol);

  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setBgm(val);
    updateSettings(val, sfx);
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSfx(val);
    updateSettings(bgm, val);
  };

  const handleReset = () => {
    if (window.confirm('آیا مطمئن هستید؟ تمام پیشرفت (سکه‌ها، کاراکترها، ارتقاءها) پاک خواهد شد!')) {
      resetSave();
      window.location.reload();
    }
  };

  return (
    <div className="menu-bg">
      <div className="menu-content">
        <h2 className="section-title">تنظیمات</h2>
        
        <div className="settings-box">
          <div className="setting-row">
            <label>صدای موسیقی (BGM)</label>
            <input type="range" min="0" max="1" step="0.1" value={bgm} onChange={handleBgmChange} className="slider" />
            <span>{Math.round(bgm * 100)}%</span>
          </div>
          
          <div className="setting-row">
            <label>صدای افکت‌ها (SFX)</label>
            <input type="range" min="0" max="1" step="0.1" value={sfx} onChange={handleSfxChange} className="slider" />
            <span>{Math.round(sfx * 100)}%</span>
          </div>

          <div className="setting-divider" />

          <button className="btn-ghost" style={{ color: '#ff4a5c', borderColor: '#ff4a5c', width: '100%', marginTop: '10px' }} onClick={handleReset}>
            🗑️ ریست کردن سیو بازی
          </button>
        </div>

        <button className="btn-primary" style={{ width: '250px', marginTop: '20px' }} onClick={onBack}>
          ← بازگشت
        </button>
      </div>
    </div>
  );
}