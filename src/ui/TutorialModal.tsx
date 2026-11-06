import React from 'react';

interface Props { onClose: () => void; }

export default function TutorialModal({ onClose }: Props) {
  return (
    <div className="modal-overlay">
      <div className="skill-modal" style={{ maxWidth: '500px', textAlign: 'center' }}>
        <div className="modal-title-block">
          <div className="modal-icon">📜</div>
          <h2>به طلسم‌گر خوش آمدید</h2>
          <p>راهنمای بقا در برابر امواج تاریکی</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', textAlign: 'right' }}>
          <div className="ctrl-item" style={{ fontSize: '15px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '24px' }}>🕹️</span>
            <div>با کلیدهای <b>WASD</b> یا <b>جوی‌استیک</b> حرکت کنید.</div>
          </div>
          <div className="ctrl-item" style={{ fontSize: '15px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '24px' }}>✨</span>
            <div>جادوگر شما به طور خودکار به نزدیک‌ترین دشمن شلیک می‌کند.</div>
          </div>
          <div className="ctrl-item" style={{ fontSize: '15px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '24px' }}>💎</span>
            <div>دانه‌های رنگی را جمع کنید تا سطح‌تان بالا برود و مهارت جدید انتخاب کنید.</div>
          </div>
        </div>

        <button className="btn-primary" style={{ width: '100%' }} onClick={onClose}>
          فهمیدم، شروع بازی!
        </button>
      </div>
    </div>
  );
}