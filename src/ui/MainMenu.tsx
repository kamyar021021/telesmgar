import React from "react";
import { loadGame } from "../game/save";

interface Props {
  onStart: () => void;
  onUpgrades: () => void;
  onSettings: () => void;
  onRecords: () => void;
}

export default function MainMenu({
  onStart,
  onUpgrades,
  onSettings,
  onRecords,
}: Props) {
  const save = loadGame();

  return (
    <div className="menu-bg">
      <div className="menu-stars" />
      <div className="menu-content">
        <div className="title-block">
          <div className="title-icon">✦</div>
          <h1 className="game-title">طلسم‌گر</h1>
          <div className="game-subtitle">TELESMGAR</div>
          <div className="game-tag">جادوگر تنها در برابر امواج تاریکی</div>
        </div>

        <div
          style={{ fontSize: "20px", color: "#ffd76a", marginBottom: "10px" }}
        >
          🪙 {save.gold} سکه
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexDirection: "column",
            width: "100%",
            alignItems: "center",
          }}
        >
          <button
            className="btn-primary"
            onClick={onStart}
            style={{ width: "250px", marginBottom: "10px" }}
          >
            <span>شروع سفر</span>
          </button>

          <div style={{ display: "flex", gap: "10px", width: "250px" }}>
            <button
              className="btn-ghost"
              onClick={onUpgrades}
              style={{ flex: 1, padding: "12px 0" }}
            >
              معبد ارتقاء
            </button>
            <button
              className="btn-ghost"
              onClick={onRecords}
              style={{ flex: 1, padding: "12px 0" }}
            >
              رکوردها
            </button>
          </div>

          <button
            className="btn-ghost"
            onClick={onSettings}
            style={{ width: "250px" }}
          >
            تنظیمات
          </button>
        </div>
      </div>
    </div>
  );
}
