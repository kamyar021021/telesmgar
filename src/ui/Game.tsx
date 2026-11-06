import React, { useEffect, useRef, useState } from "react";
import { GameEngine } from "../game/GameEngine";
import type { HudState, SkillOffer, GameResult } from "../types";
import { loadGame, setTutorialDone } from "../game/save";
import HUD from "./HUD";
import SkillModal from "./SkillModal";
import PauseMenu from "./PauseMenu";
import GameOver from "./GameOver";
import Joystick from "./Joystick";
import TutorialModal from "./TutorialModal";

interface Props {
  characterId: string;
  biomeId: string;
  onMenu: () => void;
  onRetry: () => void;
}
const EMPTY_HUD: HudState = {
  hp: 100,
  maxHp: 100,
  xp: 0,
  xpNeed: 20,
  wave: 0,
  level: 1,
  kills: 0,
  skills: [],
};

export default function Game({ characterId, biomeId, onMenu }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [offer, setOffer] = useState<SkillOffer | null>(null);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // استیت آموزش
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    setIsMobile(
      /Android|webkit|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
        navigator.userAgent,
      ),
    );
    const save = loadGame();
    if (!save.tutorialDone) {
      setShowTutorial(true);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current, characterId, biomeId, {
      onHud: setHud,
      onSkillOffer: setOffer,
      onGameOver: setResult,
    });
    engine.start();
    engineRef.current = engine;
    // اگر آموزش باز است، بازی را متوقف کن
    if (showTutorial) engine.setPaused(true);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [characterId, biomeId, retryCount]);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    setTutorialDone(); // ذخیره اینکه کاربر آموزش را دیده
    engineRef.current?.setPaused(false); // ادامه بازی
  };

  const handlePickSkill = (id: string) => {
    engineRef.current?.pickSkill(id);
    setOffer(null);
  };
  const handlePause = () => {
    engineRef.current?.setPaused(true);
    setPaused(true);
  };
  const handleResume = () => {
    engineRef.current?.setPaused(false);
    setPaused(false);
  };
  const handleRestart = () => {
    setResult(null);
    setOffer(null);
    setPaused(false);
    setRetryCount((c) => c + 1);
  };

  return (
    <div className="game-root">
      <canvas ref={canvasRef} className="game-canvas" />
      <HUD hud={hud} onPause={handlePause} />

      {isMobile && !paused && !offer && !result && !showTutorial && (
        <Joystick
          onMove={(x, z) => engineRef.current?.setJoystickInput(x, z)}
          onEnd={() => engineRef.current?.setJoystickInput(0, 0)}
        />
      )}

      {showTutorial && <TutorialModal onClose={handleCloseTutorial} />}

      {offer && !result && (
        <SkillModal offer={offer} hud={hud} onPick={handlePickSkill} />
      )}
      {paused && !offer && !result && !showTutorial && (
        <PauseMenu onResume={handleResume} onQuit={onMenu} />
      )}
      {result && (
        <GameOver result={result} onRetry={handleRestart} onMenu={onMenu} />
      )}
    </div>
  );
}
