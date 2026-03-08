import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ThemeId } from "../themes";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SoundEffect =
  | "number_enter"
  | "correct"
  | "error"
  | "hint_use"
  | "puzzle_complete"
  | "button_click"
  | "combo_hit"
  | "boss_hit"
  | "boss_defeated"
  | "game_over"
  | "xp_gain"
  | "badge_unlock";

interface SoundContextValue {
  sfxEnabled: boolean;
  sfxVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
  toggleSfx: () => void;
  toggleMusic: () => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  playSound: (sound: SoundEffect) => void;
  startThemeMusic: (themeId: ThemeId) => void;
  stopMusic: () => void;
}

// ── Persistence ────────────────────────────────────────────────────────────────

const AUDIO_KEY = "sudokuverse_audio";

interface AudioSettings {
  sfxEnabled: boolean;
  sfxVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
}

function loadAudioSettings(): AudioSettings {
  try {
    const stored = localStorage.getItem(AUDIO_KEY);
    if (stored) return JSON.parse(stored) as AudioSettings;
  } catch (_) {
    /* ignore */
  }
  return {
    sfxEnabled: true,
    sfxVolume: 0.8,
    musicEnabled: true,
    musicVolume: 0.3,
  };
}

function saveAudioSettings(settings: AudioSettings) {
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify(settings));
  } catch (_) {
    /* ignore */
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

const SoundContext = createContext<SoundContextValue>({
  sfxEnabled: true,
  sfxVolume: 0.8,
  musicEnabled: true,
  musicVolume: 0.3,
  toggleSfx: () => {},
  toggleMusic: () => {},
  setSfxVolume: () => {},
  setMusicVolume: () => {},
  playSound: () => {},
  startThemeMusic: () => {},
  stopMusic: () => {},
});

// ── AudioEngine class ──────────────────────────────────────────────────────────

class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicNodes: AudioNode[] = [];
  private musicGain: GainNode | null = null;
  private musicSchedulerRef: ReturnType<typeof setInterval> | null = null;
  private currentTheme: ThemeId | null = null;
  private musicEnabled = true;
  private musicVolume = 0.3;
  private sfxEnabled = true;
  private sfxVolume = 0.8;

  /** Lazily create AudioContext on first user interaction */
  getCtx(): AudioContext | null {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch (_) {
      return null;
    }
  }

  setMusicEnabled(v: boolean) {
    this.musicEnabled = v;
    if (!v) {
      this.fadeOutMusic();
    } else if (this.currentTheme) {
      this.startTheme(this.currentTheme);
    }
  }

  setMusicVolume(v: number) {
    this.musicVolume = v;
    if (this.musicGain) {
      try {
        this.musicGain.gain.setTargetAtTime(
          v * 0.15,
          this.ctx?.currentTime ?? 0,
          0.1,
        );
      } catch (_) {}
    }
  }

  setSfxEnabled(v: boolean) {
    this.sfxEnabled = v;
  }
  setSfxVolume(v: number) {
    this.sfxVolume = v;
  }

  // ── SFX ─────────────────────────────────────────────────────────────────────

  playSound(sound: SoundEffect) {
    if (!this.sfxEnabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      switch (sound) {
        case "number_enter":
          this.sfxNumberEnter(ctx);
          break;
        case "correct":
          this.sfxCorrect(ctx);
          break;
        case "error":
          this.sfxError(ctx);
          break;
        case "hint_use":
          this.sfxHintUse(ctx);
          break;
        case "puzzle_complete":
          this.sfxPuzzleComplete(ctx);
          break;
        case "button_click":
          this.sfxButtonClick(ctx);
          break;
        case "combo_hit":
          this.sfxComboHit(ctx);
          break;
        case "boss_hit":
          this.sfxBossHit(ctx);
          break;
        case "boss_defeated":
          this.sfxBossDefeated(ctx);
          break;
        case "game_over":
          this.sfxGameOver(ctx);
          break;
        case "xp_gain":
          this.sfxXpGain(ctx);
          break;
        case "badge_unlock":
          this.sfxBadgeUnlock(ctx);
          break;
      }
    } catch (_) {
      /* ignore audio errors */
    }
  }

  private makeGain(ctx: AudioContext, volume: number): GainNode {
    const g = ctx.createGain();
    g.gain.value = volume * this.sfxVolume;
    g.connect(ctx.destination);
    return g;
  }

  private sfxNumberEnter(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.18);
    osc.type = "sine";
    osc.frequency.value = 440;
    osc.connect(gain);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.18 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  private sfxCorrect(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.3);
    osc.type = "triangle";
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(523, t);
    osc.frequency.linearRampToValueAtTime(659, t + 0.2);
    osc.connect(gain);
    gain.gain.setValueAtTime(0.3 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private sfxError(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.35);
    osc.type = "sawtooth";
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);
    osc.connect(gain);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.35 * this.sfxVolume, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  private sfxHintUse(ctx: AudioContext) {
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    const t = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      const start = t + i * 0.08;
      gain.gain.setValueAtTime(0.28 * this.sfxVolume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
      osc.start(start);
      osc.stop(start + 0.1);
    });
  }

  private sfxPuzzleComplete(ctx: AudioContext) {
    // C4, E4, G4, C5 simultaneously
    const chordFreqs = [261.63, 329.63, 392, 523.25];
    const t = ctx.currentTime;
    for (const freq of chordFreqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.gain.setValueAtTime(0.22 * this.sfxVolume, t);
      gain.gain.setValueAtTime(0.22 * this.sfxVolume, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.65);
    }
  }

  private sfxButtonClick(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.1);
    osc.type = "sine";
    osc.frequency.value = 300;
    osc.connect(gain);
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.1 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  private sfxComboHit(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = this.makeGain(ctx, 0.32);
    osc.type = "square";
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.12);
    osc.connect(gain);
    gain.gain.setValueAtTime(0.32 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  private sfxBossHit(ctx: AudioContext) {
    // Noise burst
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.connect(ctx.destination);
    noiseGain.gain.value = 0.18 * this.sfxVolume;
    noise.connect(noiseGain);

    // + sine thud
    const osc = ctx.createOscillator();
    const oscGain = this.makeGain(ctx, 0.35);
    osc.type = "sine";
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    osc.connect(oscGain);
    oscGain.gain.setValueAtTime(0.35 * this.sfxVolume, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    noise.start(t);
    noise.stop(t + 0.1);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private sfxBossDefeated(ctx: AudioContext) {
    // Ascending arpeggio C4 E4 G4 B4 C5
    const notes = [261.63, 329.63, 392, 493.88, 523.25];
    const t = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.connect(gain);
      const start = t + i * 0.15;
      gain.gain.setValueAtTime(0.3 * this.sfxVolume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  }

  private sfxGameOver(ctx: AudioContext) {
    // Descending C4 A3 F3 C3
    const notes = [261.63, 220, 174.61, 130.81];
    const t = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      const start = t + i * 0.25;
      gain.gain.setValueAtTime(0.28 * this.sfxVolume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  }

  private sfxXpGain(ctx: AudioContext) {
    const notes = [659.25, 783.99]; // E5 G5
    const t = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.connect(gain);
      const start = t + i * 0.08;
      gain.gain.setValueAtTime(0.25 * this.sfxVolume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
      osc.start(start);
      osc.stop(start + 0.12);
    });
  }

  private sfxBadgeUnlock(ctx: AudioContext) {
    // C5 E5 G5 C6 fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const t = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.connect(gain);
      const start = t + i * 0.12;
      gain.gain.setValueAtTime(0.28 * this.sfxVolume, start);
      // Add a bit of "reverb" feel via slow decay
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  }

  // ── Background Music ─────────────────────────────────────────────────────────

  startTheme(themeId: ThemeId) {
    this.currentTheme = themeId;
    if (!this.musicEnabled) return;
    this.stopMusicInternal();
    const ctx = this.getCtx();
    if (!ctx) return;

    try {
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);
      this.musicGain = masterGain;

      // Fade in
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(
        this.musicVolume * 0.15,
        ctx.currentTime + 2,
      );

      this.scheduleThemeMusic(ctx, masterGain, themeId);
    } catch (_) {}
  }

  private scheduleThemeMusic(
    ctx: AudioContext,
    masterGain: GainNode,
    themeId: ThemeId,
  ) {
    switch (themeId) {
      case "classic":
        this.musicClassic(ctx, masterGain);
        break;
      case "dark":
        this.musicDark(ctx, masterGain);
        break;
      case "ocean":
        this.musicOcean(ctx, masterGain);
        break;
      case "sunset":
        this.musicSunset(ctx, masterGain);
        break;
      case "cyberpunk":
        this.musicCyberpunk(ctx, masterGain);
        break;
      case "japan":
        this.musicJapan(ctx, masterGain);
        break;
      case "retro":
        this.musicRetro(ctx, masterGain);
        break;
      case "nature":
        this.musicNature(ctx, masterGain);
        break;
    }
  }

  private stopMusicInternal() {
    if (this.musicSchedulerRef) {
      clearInterval(this.musicSchedulerRef);
      this.musicSchedulerRef = null;
    }
    for (const node of this.musicNodes) {
      try {
        (node as AudioBufferSourceNode).stop();
      } catch (_) {}
      try {
        node.disconnect();
      } catch (_) {}
    }
    this.musicNodes = [];
    if (this.musicGain) {
      try {
        this.musicGain.disconnect();
      } catch (_) {}
      this.musicGain = null;
    }
  }

  fadeOutMusic() {
    const ctx = this.ctx;
    const gain = this.musicGain;
    if (!ctx || !gain) {
      this.stopMusicInternal();
      return;
    }
    try {
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      setTimeout(() => this.stopMusicInternal(), 2000);
    } catch (_) {
      this.stopMusicInternal();
    }
  }

  stopMusic() {
    this.fadeOutMusic();
    this.currentTheme = null;
  }

  // ── Theme Music Implementations ──────────────────────────────────────────────

  /** Play a looping sequence of sine tones via interval-based scheduling */
  private createMelodyLoop(
    ctx: AudioContext,
    masterGain: GainNode,
    notes: number[],
    noteLen: number,
    waveType: OscillatorType,
    baseVol: number,
  ) {
    let noteIdx = 0;
    const playNext = () => {
      if (!this.musicGain || this.musicGain !== masterGain) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.connect(masterGain);
        osc.type = waveType;
        osc.frequency.value = notes[noteIdx % notes.length];
        osc.connect(gain);
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(baseVol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + noteLen * 0.9);
        osc.start(t);
        osc.stop(t + noteLen);
        this.musicNodes.push(osc, gain);
        noteIdx++;
      } catch (_) {}
    };
    playNext();
    const id = setInterval(playNext, noteLen * 1000);
    this.musicSchedulerRef = id;
  }

  /** Classic: C major pentatonic, gentle sine */
  private musicClassic(ctx: AudioContext, masterGain: GainNode) {
    // C4 D4 E4 G4 A4 C5 pattern
    const notes = [
      261.63, 293.66, 329.63, 392, 440, 523.25, 440, 392, 329.63, 293.66,
    ];
    this.createMelodyLoop(ctx, masterGain, notes, 0.7, "sine", 0.7);
  }

  /** Dark: Deep drone, D1+A1, slow LFO */
  private musicDark(ctx: AudioContext, masterGain: GainNode) {
    try {
      // Drone on D2
      const drone1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      g1.gain.value = 0.5;
      g1.connect(masterGain);
      drone1.type = "sine";
      drone1.frequency.value = 73.42; // D2
      drone1.connect(g1);
      drone1.start();
      this.musicNodes.push(drone1, g1);

      // Fifth A2
      const drone2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      g2.gain.value = 0.3;
      g2.connect(masterGain);
      drone2.type = "sine";
      drone2.frequency.value = 110; // A2
      drone2.connect(g2);
      drone2.start();
      this.musicNodes.push(drone2, g2);

      // LFO for tremolo
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.15;
      lfo.frequency.value = 0.3;
      lfo.type = "sine";
      lfo.connect(lfoGain);
      lfoGain.connect(g1.gain);
      lfo.start();
      this.musicNodes.push(lfo, lfoGain);
    } catch (_) {}
  }

  /** Ocean: Slow chord pads C4-G4-E4 */
  private musicOcean(ctx: AudioContext, masterGain: GainNode) {
    const chordNotes = [261.63, 329.63, 392]; // C4 E4 G4
    let phase = 0;
    const playChord = () => {
      if (!this.musicGain || this.musicGain !== masterGain) return;
      chordNotes.forEach((freq, i) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.connect(masterGain);
          osc.type = "sine";
          osc.frequency.value =
            freq * (phase % 2 === 0 ? 1 : i === 2 ? 1.5 : 1);
          osc.connect(gain);
          const t = ctx.currentTime;
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(0.4 - i * 0.05, t + 1.5);
          gain.gain.setValueAtTime(0.4 - i * 0.05, t + 5);
          gain.gain.linearRampToValueAtTime(0.001, t + 6.5);
          osc.start(t);
          osc.stop(t + 7);
          this.musicNodes.push(osc, gain);
        } catch (_) {}
      });
      phase++;
    };
    playChord();
    const id = setInterval(playChord, 6500);
    this.musicSchedulerRef = id;
  }

  /** Sunset: Warm C major progression */
  private musicSunset(ctx: AudioContext, masterGain: GainNode) {
    // C - F - G - Am arpeggio at slow tempo
    const progressions = [
      [261.63, 329.63, 392], // C major
      [349.23, 440, 523.25], // F major
      [392, 493.88, 587.33], // G major
      [220, 261.63, 329.63], // A minor
    ];
    let idx = 0;
    const playArp = () => {
      if (!this.musicGain || this.musicGain !== masterGain) return;
      const chord = progressions[idx % progressions.length];
      chord.forEach((freq, i) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.connect(masterGain);
          osc.type = "sine";
          osc.frequency.value = freq;
          osc.connect(gain);
          const t = ctx.currentTime + i * 0.3;
          gain.gain.setValueAtTime(0.35, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
          osc.start(t);
          osc.stop(t + 1.3);
          this.musicNodes.push(osc, gain);
        } catch (_) {}
      });
      idx++;
    };
    playArp();
    const id = setInterval(playArp, 2200);
    this.musicSchedulerRef = id;
  }

  /** Cyberpunk: Pulsing E2 bass + arpeggiated pattern */
  private musicCyberpunk(ctx: AudioContext, masterGain: GainNode) {
    // E2 bass pulse + high arpeggio
    const bassNotes = [82.41, 82.41, 98, 82.41]; // E2 E2 G2 E2
    const arpNotes = [659.25, 783.99, 987.77, 1318.5]; // E5 G5 B5 E6
    let bassIdx = 0;
    let arpIdx = 0;
    const playBeat = () => {
      if (!this.musicGain || this.musicGain !== masterGain) return;
      // Bass
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.connect(masterGain);
        osc.type = "square";
        osc.frequency.value = bassNotes[bassIdx % bassNotes.length];
        osc.connect(gain);
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.2);
        this.musicNodes.push(osc, gain);
        bassIdx++;
      } catch (_) {}
      // Arp on alternating beats
      if (bassIdx % 2 === 0) {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          gain2.connect(masterGain);
          osc2.type = "square";
          osc2.frequency.value = arpNotes[arpIdx % arpNotes.length];
          osc2.connect(gain2);
          const t = ctx.currentTime;
          gain2.gain.setValueAtTime(0.2, t);
          gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          osc2.start(t);
          osc2.stop(t + 0.12);
          this.musicNodes.push(osc2, gain2);
          arpIdx++;
        } catch (_) {}
      }
    };
    playBeat();
    const id = setInterval(playBeat, 250);
    this.musicSchedulerRef = id;
  }

  /** Japan: D pentatonic minor, triangle, sparse */
  private musicJapan(ctx: AudioContext, masterGain: GainNode) {
    // D F A C D (pentatonic minor)
    const notes = [293.66, 349.23, 440, 523.25, 587.33, 523.25, 440, 349.23];
    let noteIdx = 0;
    const playNote = () => {
      if (!this.musicGain || this.musicGain !== masterGain) return;
      // Skip some notes for sparseness
      if (Math.random() < 0.35) {
        noteIdx++;
        return;
      }
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.connect(masterGain);
        osc.type = "triangle";
        osc.frequency.value = notes[noteIdx % notes.length];
        osc.connect(gain);
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.start(t);
        osc.stop(t + 0.85);
        this.musicNodes.push(osc, gain);
        noteIdx++;
      } catch (_) {}
    };
    playNote();
    const id = setInterval(playNote, 600);
    this.musicSchedulerRef = id;
  }

  /** Retro: 8-bit style, square waves, C major chiptune */
  private musicRetro(ctx: AudioContext, masterGain: GainNode) {
    // Simple C major chiptune melody
    const melody = [
      523.25,
      523.25,
      659.25,
      523.25,
      783.99,
      659.25, // C5 C5 E5 C5 G5 E5
      523.25,
      0,
      440,
      440,
      523.25,
      440,
      392,
      329.63, // C5 - A4 A4 C5 A4 G4 E4
    ];
    let idx = 0;
    const playChip = () => {
      if (!this.musicGain || this.musicGain !== masterGain) return;
      const freq = melody[idx % melody.length];
      if (freq > 0) {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.connect(masterGain);
          osc.type = "square";
          osc.frequency.value = freq;
          osc.connect(gain);
          const t = ctx.currentTime;
          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
          osc.start(t);
          osc.stop(t + 0.13);
          this.musicNodes.push(osc, gain);
        } catch (_) {}
      }
      idx++;
    };
    playChip();
    const id = setInterval(playChip, 150);
    this.musicSchedulerRef = id;
  }

  /** Nature: C pentatonic arpeggios, sine+triangle mix */
  private musicNature(ctx: AudioContext, masterGain: GainNode) {
    // C D E G A (pentatonic major)
    const low = [261.63, 293.66, 329.63, 392, 440];
    const high = [523.25, 587.33, 659.25, 784, 880];
    let idx = 0;
    const playArp = () => {
      if (!this.musicGain || this.musicGain !== masterGain) return;
      // Low sine
      try {
        const osc1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        g1.connect(masterGain);
        osc1.type = "sine";
        osc1.frequency.value = low[idx % low.length];
        osc1.connect(g1);
        const t = ctx.currentTime;
        g1.gain.setValueAtTime(0.4, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc1.start(t);
        osc1.stop(t + 0.6);
        this.musicNodes.push(osc1, g1);
      } catch (_) {}

      // Occasional high triangle
      if (idx % 3 === 0) {
        try {
          const osc2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          g2.connect(masterGain);
          osc2.type = "triangle";
          osc2.frequency.value = high[idx % high.length];
          osc2.connect(g2);
          const t = ctx.currentTime;
          g2.gain.setValueAtTime(0.25, t);
          g2.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
          osc2.start(t);
          osc2.stop(t + 0.75);
          this.musicNodes.push(osc2, g2);
        } catch (_) {}
      }
      idx++;
    };
    playArp();
    const id = setInterval(playArp, 480);
    this.musicSchedulerRef = id;
  }
}

// ── Provider ───────────────────────────────────────────────────────────────────

const engineRef = { current: new AudioEngine() };

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const initialSettings = loadAudioSettings();
  const [sfxEnabled, setSfxEnabledState] = useState(initialSettings.sfxEnabled);
  const [sfxVolume, setSfxVolumeState] = useState(initialSettings.sfxVolume);
  const [musicEnabled, setMusicEnabledState] = useState(
    initialSettings.musicEnabled,
  );
  const [musicVolume, setMusicVolumeState] = useState(
    initialSettings.musicVolume,
  );

  const engine = engineRef.current;

  // Sync engine with initial state
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on mount
  useEffect(() => {
    engine.setSfxEnabled(initialSettings.sfxEnabled);
    engine.setSfxVolume(initialSettings.sfxVolume);
    engine.setMusicVolume(initialSettings.musicVolume);
    // Don't auto-start music on mount — needs user interaction
  }, []);

  // Unlock AudioContext on first user interaction
  useEffect(() => {
    const unlock = () => {
      engine.getCtx();
    };
    window.addEventListener("touchstart", unlock, {
      once: true,
      passive: true,
    });
    window.addEventListener("click", unlock, { once: true });
    return () => {
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click", unlock);
    };
  }, [engine]);

  const toggleSfx = useCallback(() => {
    setSfxEnabledState((prev) => {
      const next = !prev;
      engine.setSfxEnabled(next);
      const s = loadAudioSettings();
      saveAudioSettings({ ...s, sfxEnabled: next });
      return next;
    });
  }, [engine]);

  const toggleMusic = useCallback(() => {
    setMusicEnabledState((prev) => {
      const next = !prev;
      engine.setMusicEnabled(next);
      const s = loadAudioSettings();
      saveAudioSettings({ ...s, musicEnabled: next });
      return next;
    });
  }, [engine]);

  const setSfxVolume = useCallback(
    (v: number) => {
      setSfxVolumeState(v);
      engine.setSfxVolume(v);
      const s = loadAudioSettings();
      saveAudioSettings({ ...s, sfxVolume: v });
    },
    [engine],
  );

  const setMusicVolume = useCallback(
    (v: number) => {
      setMusicVolumeState(v);
      engine.setMusicVolume(v);
      const s = loadAudioSettings();
      saveAudioSettings({ ...s, musicVolume: v });
    },
    [engine],
  );

  const playSound = useCallback(
    (sound: SoundEffect) => {
      engine.playSound(sound);
    },
    [engine],
  );

  const startThemeMusic = useCallback(
    (themeId: ThemeId) => {
      engine.startTheme(themeId);
    },
    [engine],
  );

  const stopMusic = useCallback(() => {
    engine.stopMusic();
  }, [engine]);

  return (
    <SoundContext.Provider
      value={{
        sfxEnabled,
        sfxVolume,
        musicEnabled,
        musicVolume,
        toggleSfx,
        toggleMusic,
        setSfxVolume,
        setMusicVolume,
        playSound,
        startThemeMusic,
        stopMusic,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  return useContext(SoundContext);
}
