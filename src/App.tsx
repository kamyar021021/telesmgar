import { useState, useEffect } from "react";
import MainMenu from "./ui/MainMenu";
import CharacterSelect from "./ui/CharacterSelect";
import BiomeSelect from "./ui/BiomeSelect";
import UpgradeMenu from "./ui/UpgradeMenu";
import SettingsMenu from "./ui/SettingsMenu";
import RecordsMenu from "./ui/RecordsMenu";
import Game from "./ui/Game";

type Screen =
  | "menu"
  | "char"
  | "biome"
  | "game"
  | "upgrades"
  | "settings"
  | "records";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [charId, setCharId] = useState<string>("pyra");
  const [biomeId, setBiomeId] = useState<string>("grass");
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // تشخیص دقیق‌تر موبایل (حذف webkit که در لپ تاپ هم هست)
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        );

      if (isMobile && window.innerWidth > window.innerHeight) {
        setIsLandscape(true);
      } else {
        setIsLandscape(false);
      }
    };

    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    checkOrientation();

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  if (isLandscape) {
    return (
      <div className="orientation-warning">
        <div className="rotate-icon">📱</div>
        <h2>لطفاً گوشی خود را عمودی بگیرید</h2>
        <p>این بازی برای صفحه عمودی طراحی شده است.</p>
      </div>
    );
  }

  return (
    <div className="app-root">
      {screen === "menu" && (
        <MainMenu
          onStart={() => setScreen("char")}
          onUpgrades={() => setScreen("upgrades")}
          onSettings={() => setScreen("settings")}
          onRecords={() => setScreen("records")}
        />
      )}
      {screen === "upgrades" && (
        <UpgradeMenu onBack={() => setScreen("menu")} />
      )}
      {screen === "settings" && (
        <SettingsMenu onBack={() => setScreen("menu")} />
      )}
      {screen === "records" && <RecordsMenu onBack={() => setScreen("menu")} />}

      {screen === "char" && (
        <CharacterSelect
          onSelect={(id) => {
            setCharId(id);
            setScreen("biome");
          }}
          onBack={() => setScreen("menu")}
        />
      )}
      {screen === "biome" && (
        <BiomeSelect
          onSelect={(id) => {
            setBiomeId(id);
            setScreen("game");
          }}
          onBack={() => setScreen("char")}
        />
      )}
      {screen === "game" && (
        <Game
          key={`${charId}-${biomeId}`}
          characterId={charId}
          biomeId={biomeId}
          onMenu={() => setScreen("menu")}
          onRetry={() => {}}
        />
      )}
    </div>
  );
}
