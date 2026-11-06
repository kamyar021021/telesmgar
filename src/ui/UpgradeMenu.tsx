import React, { useState } from "react";
import { loadGame, buyUpgrade, getUpgradeCost, isMaxLevel } from "../game/save";

interface Props {
  onBack: () => void;
}

export default function UpgradeMenu({ onBack }: Props) {
  // لود کردن سیو برای نمایش سکه‌ها و سطح ارتقاءها
  const [save, setSave] = useState(loadGame());

  const handleBuy = (type: "hp" | "speed" | "damage") => {
    const cost = getUpgradeCost(type, save.upgrades[type]);
    if (cost > 0 && buyUpgrade(type, cost)) {
      setSave(loadGame()); // آپدیت UI پس از خرید موفق
    }
  };

  const renderUpgradeCard = (
    type: "hp" | "speed" | "damage",
    title: string,
    icon: string,
    color: string,
    desc: string,
    effectStr: (lvl: number) => string,
  ) => {
    const lvl = save.upgrades[type];
    const isMax = isMaxLevel(type, lvl); // <--- اینجا اصلاح شد
    const cost = getUpgradeCost(type, lvl);

    return (
      <div className="char-card" key={type}>
        <div className="char-icon" style={{ color }}>
          {icon}
        </div>
        <div className="char-name">{title}</div>
        <div className="char-desc">{desc}</div>
        <div className="char-perk">
          سطح {lvl} {effectStr(lvl)}
        </div>

        <button
          className="btn-primary"
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            marginTop: "10px",
            opacity: isMax ? 0.5 : 1,
            cursor: isMax ? "not-allowed" : "pointer",
          }}
          disabled={isMax}
          onClick={() => handleBuy(type)}
        >
          {isMax ? "حداکثر سطح" : `خرید (${cost} سکه)`}
        </button>
      </div>
    );
  };

  return (
    <div className="menu-bg">
      <div className="menu-content wide">
        <h2 className="section-title">معبد ارتقاء</h2>

        <div
          style={{ fontSize: "24px", color: "#ffd76a", marginBottom: "20px" }}
        >
          🪙 سکه‌های شما: {save.gold}
        </div>

        <div className="char-grid">
          {renderUpgradeCard(
            "hp",
            "جان ابدی",
            "❤️",
            "#ff4a5c",
            "حداکثر جان شما را افزایش می‌دهد.",
            (lvl) => `(+${lvl * 20} HP)`,
          )}

          {renderUpgradeCard(
            "speed",
            "سبکبالی",
            "💨",
            "#6ae0ff",
            "سرعت حرکت جادوگر را افزایش می‌دهد.",
            (lvl) => `(+${(lvl * 0.5).toFixed(1)} سرعت)`,
          )}

          {renderUpgradeCard(
            "damage",
            "خشم جادویی",
            "⚔️",
            "#ff8a3c",
            "قدرت تمام مهارت‌های شما را افزایش می‌دهد.",
            (lvl) => `(+${lvl * 10}% آسیب)`,
          )}
        </div>

        <button className="btn-ghost" onClick={onBack}>
          ← بازگشت
        </button>
      </div>
    </div>
  );
}
