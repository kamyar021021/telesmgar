interface Props {
  onResume: () => void;
  onQuit: () => void;
}

export default function PauseMenu({ onResume, onQuit }: Props) {
  return (
    <div className="modal-overlay">
      <div className="pause-modal">
        <h2>توقف</h2>
        <p>بازی در همان نقطه ادامه خواهد یافت</p>
        <button className="btn-primary" onClick={onResume}>ادامه بازی</button>
        <button className="btn-ghost" onClick={onQuit}>خروج به منو</button>
      </div>
    </div>
  );
}