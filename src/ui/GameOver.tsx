import type { GameResult } from '../types';

interface Props {
  result: GameResult;
  onRetry: () => void;
  onMenu: () => void;
}

export default function GameOver({ result, onRetry, onMenu }: Props) {
  const mins = Math.floor(result.time / 60);
  const secs = Math.floor(result.time % 60);

  return (
    <div className="modal-overlay gameover-overlay">
      <div className="gameover-modal">
        <div className="go-title">سفر تو پایان یافت</div>
        <div className="go-sub">اما افسانه‌ات زنده است</div>

        <div className="go-stats">
          <div className="go-stat">
            <div className="go-stat-val">{result.wave}</div>
            <div className="go-stat-label">موج</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-val">{result.kills}</div>
            <div className="go-stat-label">کشته</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-val">{result.level}</div>
            <div className="go-stat-label">سطح</div>
          </div>
          <div className="go-stat">
            <div className="go-stat-val">{mins}:{secs.toString().padStart(2, '0')}</div>
            <div className="go-stat-label">زمان</div>
          </div>
        </div>

        <div className="go-actions">
          <button className="btn-primary" onClick={onRetry}>تلاش دوباره</button>
          <button className="btn-ghost" onClick={onMenu}>منوی اصلی</button>
        </div>
      </div>
    </div>
  );
}