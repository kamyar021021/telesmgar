// src/game/save.ts
export interface Settings {
  bgmVol: number;
  sfxVol: number;
}

export interface HighScore {
  wave: number;
  kills: number;
  level: number;
}

export interface SaveData {
  gold: number;
  upgrades: { hp: number; speed: number; damage: number };
  unlockedCharacters: string[];
  settings: Settings;
  highScore: HighScore;
  tutorialDone: boolean;
}

const MAX_UPGRADE_LEVEL = 10;

const DEFAULT_SAVE: SaveData = {
  gold: 0,
  upgrades: { hp: 0, speed: 0, damage: 0 },
  unlockedCharacters: ["pyra"],
  settings: { bgmVol: 0.3, sfxVol: 0.5 },
  highScore: { wave: 0, kills: 0, level: 1 },
  tutorialDone: false,
};

export function loadGame(): SaveData {
  try {
    const data = localStorage.getItem("telesmgar_save");
    if (data) {
      const parsed = JSON.parse(data);
      // اطمینان از وجود فیلدهای جدید در سیوهای قدیمی
      return {
        ...DEFAULT_SAVE,
        ...parsed,
        settings: { ...DEFAULT_SAVE.settings, ...(parsed.settings || {}) },
        highScore: { ...DEFAULT_SAVE.highScore, ...(parsed.highScore || {}) },
      };
    }
  } catch (e) {}
  return {
    ...DEFAULT_SAVE,
    unlockedCharacters: [...DEFAULT_SAVE.unlockedCharacters],
  };
}

export function saveGame(data: SaveData) {
  try {
    localStorage.setItem("telesmgar_save", JSON.stringify(data));
  } catch (e) {}
}

export function updateHighScore(wave: number, kills: number, level: number) {
  const data = loadGame();
  let changed = false;
  if (wave > data.highScore.wave) {
    data.highScore.wave = wave;
    changed = true;
  }
  if (kills > data.highScore.kills) {
    data.highScore.kills = kills;
    changed = true;
  }
  if (level > data.highScore.level) {
    data.highScore.level = level;
    changed = true;
  }
  if (changed) saveGame(data);
}

export function updateSettings(bgmVol: number, sfxVol: number) {
  const data = loadGame();
  data.settings.bgmVol = bgmVol;
  data.settings.sfxVol = sfxVol;
  saveGame(data);
}

export function setTutorialDone() {
  const data = loadGame();
  data.tutorialDone = true;
  saveGame(data);
}

export function resetSave() {
  localStorage.removeItem("telesmgar_save");
}

export function addGold(amount: number) {
  const data = loadGame();
  data.gold += amount;
  saveGame(data);
}

export function buyUpgrade(
  type: keyof SaveData["upgrades"],
  cost: number,
): boolean {
  const data = loadGame();
  if (data.upgrades[type] >= MAX_UPGRADE_LEVEL) return false;
  if (data.gold >= cost) {
    data.gold -= cost;
    data.upgrades[type] += 1;
    saveGame(data);
    return true;
  }
  return false;
}

export function getUpgradeCost(
  type: keyof SaveData["upgrades"],
  currentLevel: number,
): number {
  if (currentLevel >= MAX_UPGRADE_LEVEL) return -1;
  const baseCosts = { hp: 50, speed: 80, damage: 100 };
  return Math.floor(baseCosts[type] * Math.pow(1.5, currentLevel));
}

export function isMaxLevel(type: string, currentLevel: number): boolean {
  return currentLevel >= MAX_UPGRADE_LEVEL;
}

export function unlockCharacter(charId: string, cost: number): boolean {
  const data = loadGame();
  if (data.unlockedCharacters.includes(charId)) return true;
  if (data.gold >= cost) {
    data.gold -= cost;
    data.unlockedCharacters.push(charId);
    saveGame(data);
    return true;
  }
  return false;
}
