import { loadGame } from "./save";

let ctx: AudioContext | null = null;
let bgmInterval: number | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx)
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

export function beep(
  freq: number,
  dur = 0.08,
  vol = 0.12,
  type: OscillatorType = "sine",
) {
  const c = getCtx();
  if (!c) return;
  try {
    const settings = loadGame().settings;
    if (settings.sfxVol <= 0.01) return;

    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    // اعمال صدای کاربر
    g.gain.setValueAtTime(vol * settings.sfxVol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch {}
}

function playNote(
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  vol: number,
) {
  const c = getCtx();
  if (!c) return;
  const settings = loadGame().settings;
  if (settings.bgmVol <= 0.01) return;

  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol * settings.bgmVol, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  o.connect(g).connect(c.destination);
  o.start(startTime);
  o.stop(startTime + duration);
}

export function playBGM() {
  const c = getCtx();
  if (!c || bgmInterval !== null) return;

  const notes = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0];
  let step = 0;
  const tempo = 150;
  const beat = 60 / tempo;

  const scheduleNext = () => {
    if (!c || c.state === "suspended") return;
    const now = c.currentTime;

    const bassFreq = step % 8 < 4 ? notes[0] / 2 : notes[2] / 2;
    playNote(bassFreq, now, beat * 0.9, "triangle", 0.15);

    if (step % 2 === 0) {
      const melodyFreq = notes[(step / 2) % notes.length];
      playNote(melodyFreq, now, beat * 1.5, "sine", 0.05);
    }

    if (step % 4 === 3) {
      playNote(notes[1], now, beat * 0.5, "square", 0.03);
    }

    step++;
  };

  bgmInterval = window.setInterval(scheduleNext, beat * 1000);
}

export function stopBGM() {
  if (bgmInterval !== null) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}

export const sfx = {
  shoot: () => beep(620, 0.05, 0.05, "triangle"),
  hit: () => beep(280, 0.05, 0.06, "square"),
  kill: () => beep(180, 0.08, 0.08, "sawtooth"),
  orb: () => beep(880, 0.06, 0.05, "sine"),
  level: () => {
    beep(660, 0.12, 0.1, "sine");
    setTimeout(() => beep(990, 0.15, 0.1, "sine"), 100);
  },
  hurt: () => beep(120, 0.15, 0.12, "sawtooth"),
  wave: () => {
    beep(440, 0.1, 0.08, "sine");
    setTimeout(() => beep(660, 0.15, 0.08, "sine"), 120);
  },
  gameover: () => {
    beep(220, 0.3, 0.15, "sawtooth");
    setTimeout(() => beep(110, 0.4, 0.15, "sawtooth"), 250);
  },
};
