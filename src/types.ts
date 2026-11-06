export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  icon: string;
  color: number;
  robe: number;
  glow: number;
  skin: number;
  hp: number;
  speed: number;
  power: number;
  pickup: number;
  desc: string;
  perk: string;
  cost: number;
}

export interface BiomeDef {
  id: string;
  name: string;
  icon: string;
  ground: string;
  accent: string;
  dark: string;
  sky: string;
  fog: string;
  hemiSky: number;
  hemiGround: number;
  desc: string;
}

export interface SkillDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  levels: string[];
}

export interface EnemyDef {
  name: string;
  hp: number;
  speed: number;
  dmg: number;
  radius: number;
  xp: number;
  color: number;
  wave: number;
  weight: number;
  ranged?: number;
  atkCd?: number;
  explode?: number;
  armor?: number;
  blink?: number;
  summon?: number;
  boss?: boolean;
}

export interface HudState {
  hp: number;
  maxHp: number;
  xp: number;
  xpNeed: number;
  wave: number;
  level: number;
  kills: number;
  skills: { id: string; level: number }[];
}

export interface SkillOffer {
  choices: string[];
}

export interface GameResult {
  wave: number;
  kills: number;
  level: number;
  time: number;
}