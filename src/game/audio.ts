import type { AttackId } from "./progression";

export type SoundEffect =
  | "ui"
  | "start"
  | "impact"
  | "enemyShot"
  | "bossShot"
  | "damage"
  | "death"
  | "explosion"
  | "meteor"
  | "coin"
  | "powerUp"
  | "laser"
  | "nova"
  | "boost"
  | "shield"
  | "dash"
  | "barrage"
  | "bossIntro"
  | "bossWarning"
  | "bossDefeat"
  | "levelComplete"
  | "victory"
  | "portal"
  | "teleport";

const STORAGE_KEY = "neon-strike-sound-enabled";
const SOUND_LIMITS: Partial<Record<SoundEffect, number>> = {
  impact: 55,
  enemyShot: 100,
  bossShot: 100,
  damage: 300
};

let enabled = true;
let context: AudioContext | null = null;
let masterGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let musicTimer: number | null = null;
let musicStep = 0;
const lastPlayed = new Map<SoundEffect, number>();

try {
  enabled = typeof window === "undefined" || window.localStorage.getItem(STORAGE_KEY) !== "false";
} catch (error) {
  console.warn("Could not read the sound preference.", error);
}

export function getAudioEnabled() {
  return enabled;
}

export function setAudioEnabled(value: boolean) {
  enabled = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch (error) {
    console.warn("Could not save the sound preference.", error);
  }

  if (!value) {
    stopMusic();
    masterGain?.gain.setTargetAtTime(0, context?.currentTime ?? 0, 0.02);
  } else {
    ensureAudio();
    if (masterGain && context) {
      masterGain.gain.setTargetAtTime(0.7, context.currentTime, 0.02);
    }
  }
}

function ensureAudio() {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  if (!context) {
    context = new AudioContext();
    masterGain = context.createGain();
    masterGain.gain.value = enabled ? 0.7 : 0;
    masterGain.connect(context.destination);
  }
  if (context.state === "suspended") {
    void context.resume().catch((error: unknown) => {
      console.warn("Could not start game audio.", error);
    });
  }
  return context;
}

function tone(
  frequency: number,
  endFrequency: number,
  duration: number,
  waveform: OscillatorType = "sawtooth",
  volume = 0.12,
  delay = 0
) {
  const audio = ensureAudio();
  if (!audio || !masterGain || !enabled) return;

  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.012, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.01);
}

function noise(duration: number, volume: number, cutoff = 2400) {
  const audio = ensureAudio();
  if (!audio || !masterGain || !enabled) return;

  if (!noiseBuffer) {
    const length = Math.ceil(audio.sampleRate * 0.4);
    noiseBuffer = audio.createBuffer(1, length, audio.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let index = 0; index < length; index++) {
      channel[index] = Math.random() * 2 - 1;
    }
  }

  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  source.buffer = noiseBuffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, audio.currentTime);
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start();
  source.stop(audio.currentTime + duration);
}

export function playSound(effect: SoundEffect) {
  if (!enabled) return;
  const now = performance.now();
  const limit = SOUND_LIMITS[effect] ?? 0;
  if (now - (lastPlayed.get(effect) ?? 0) < limit) return;
  lastPlayed.set(effect, now);

  switch (effect) {
    case "ui":
      tone(620, 920, 0.075, "square", 0.07);
      break;
    case "start":
      tone(260, 520, 0.22, "sawtooth", 0.1);
      tone(520, 1040, 0.24, "square", 0.06, 0.12);
      break;
    case "impact":
      tone(190, 75, 0.09, "triangle", 0.08);
      noise(0.055, 0.04, 1300);
      break;
    case "enemyShot":
      tone(300, 120, 0.17, "sawtooth", 0.065);
      break;
    case "bossShot":
      tone(180, 55, 0.3, "sawtooth", 0.12);
      noise(0.2, 0.055, 900);
      break;
    case "damage":
      tone(180, 65, 0.28, "sawtooth", 0.15);
      noise(0.18, 0.085, 1200);
      break;
    case "death":
    case "explosion":
      tone(130, 32, 0.75, "sawtooth", 0.19);
      noise(0.65, 0.18, 1100);
      break;
    case "meteor":
      tone(260, 45, 0.58, "triangle", 0.18);
      noise(0.42, 0.14, 1800);
      break;
    case "coin":
      tone(880, 1320, 0.11, "sine", 0.09);
      tone(1320, 1760, 0.13, "sine", 0.075, 0.08);
      break;
    case "powerUp":
      tone(340, 680, 0.16, "sine", 0.1);
      tone(680, 1360, 0.2, "sine", 0.08, 0.12);
      break;
    case "laser":
      tone(170, 980, 0.34, "sawtooth", 0.12);
      break;
    case "nova":
    case "barrage":
      tone(110, 620, 0.38, "sawtooth", 0.14);
      noise(0.3, 0.1, 1500);
      break;
    case "boost":
    case "dash":
      tone(180, 1100, 0.32, "sawtooth", 0.1);
      break;
    case "shield":
      tone(500, 1200, 0.24, "sine", 0.09);
      tone(1200, 700, 0.28, "sine", 0.07, 0.13);
      break;
    case "bossIntro":
      tone(95, 55, 0.8, "sawtooth", 0.16);
      tone(440, 110, 0.75, "square", 0.07, 0.15);
      break;
    case "bossWarning":
      tone(740, 330, 0.2, "square", 0.11);
      tone(740, 330, 0.2, "square", 0.11, 0.26);
      break;
    case "bossDefeat":
    case "levelComplete":
    case "victory":
      tone(392, 523, 0.24, "triangle", 0.1);
      tone(523, 659, 0.24, "triangle", 0.1, 0.17);
      tone(659, effect === "victory" ? 1047 : 784, 0.42, "triangle", 0.12, 0.34);
      if (effect === "victory") tone(1047, 1318, 0.46, "sine", 0.08, 0.65);
      break;
    case "portal":
      tone(500, 120, 0.55, "sine", 0.12);
      tone(760, 180, 0.52, "triangle", 0.07, 0.08);
      break;
    case "teleport":
      tone(150, 1000, 0.5, "sine", 0.1);
      noise(0.22, 0.065, 3200);
      break;
  }
}

export function playAttackSound(attack: AttackId) {
  if (!enabled) return;
  const attackSounds: Record<AttackId, [number, number, OscillatorType, number]> = {
    pulse: [720, 210, "square", 0.065],
    spread: [540, 160, "triangle", 0.08],
    rapid: [980, 420, "square", 0.045],
    heavy: [260, 70, "sawtooth", 0.12],
    arc: [820, 180, "sawtooth", 0.085],
    meteor: [380, 65, "triangle", 0.12],
    pierce: [1100, 520, "square", 0.075]
  };
  const [start, end, waveform, volume] = attackSounds[attack];
  tone(start, end, attack === "heavy" || attack === "meteor" ? 0.2 : 0.11, waveform, volume);
  if (attack === "heavy" || attack === "meteor") noise(0.12, 0.045, 1200);
}

export function startMusic() {
  if (!enabled || musicTimer !== null) return;
  const audio = ensureAudio();
  if (!audio) return;
  const notes = [110, 164.81, 146.83, 196, 123.47, 185, 164.81, 220];
  musicStep = 0;
  const playNote = () => {
    if (!enabled) return;
    const note = notes[musicStep % notes.length];
    tone(note, note * 1.005, 0.62, "sine", 0.018);
    tone(note * 2, note * 2.01, 0.28, "triangle", 0.012, 0.04);
    musicStep++;
  };
  playNote();
  musicTimer = window.setInterval(playNote, 720);
}

export function stopMusic() {
  if (musicTimer === null) return;
  window.clearInterval(musicTimer);
  musicTimer = null;
}
