/**
 * useModeStats — tracks per-mode game statistics in localStorage.
 */
import { useCallback, useState } from "react";

export interface ModeStats {
  classic: { played: number; won: number };
  speed_rush: { played: number; won: number; bestCombo: number };
  survival: { played: number; won: number; bestLives: number };
  chain: { played: number; bestChain: number };
  star_collector: { played: number; totalStars: number };
  boss_battle: { played: number; won: number };
  daily_tournament: { played: number };
  blind: { played: number; won: number };
  foggy: { played: number; won: number };
  one_error: { played: number; won: number };
}

// Game log entry for time-filtered stats
export interface GameLogEntry {
  gameMode: string;
  won: boolean;
  ts: number; // Unix timestamp ms
  combo?: number;
  chainCount?: number;
  starsEarned?: number;
  livesRemaining?: number;
}

const MODE_STATS_KEY = "sudokuverse_mode_stats_v2";
const GAME_LOG_KEY = "sudokuverse_game_log_v1";
const MAX_LOG_ENTRIES = 500;

const DEFAULT_STATS: ModeStats = {
  classic: { played: 0, won: 0 },
  speed_rush: { played: 0, won: 0, bestCombo: 0 },
  survival: { played: 0, won: 0, bestLives: 0 },
  chain: { played: 0, bestChain: 0 },
  star_collector: { played: 0, totalStars: 0 },
  boss_battle: { played: 0, won: 0 },
  daily_tournament: { played: 0 },
  blind: { played: 0, won: 0 },
  foggy: { played: 0, won: 0 },
  one_error: { played: 0, won: 0 },
};

export function loadModeStats(): ModeStats {
  try {
    const raw = localStorage.getItem(MODE_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ModeStats>;
      return {
        classic: { ...DEFAULT_STATS.classic, ...(parsed.classic ?? {}) },
        speed_rush: {
          ...DEFAULT_STATS.speed_rush,
          ...(parsed.speed_rush ?? {}),
        },
        survival: { ...DEFAULT_STATS.survival, ...(parsed.survival ?? {}) },
        chain: { ...DEFAULT_STATS.chain, ...(parsed.chain ?? {}) },
        star_collector: {
          ...DEFAULT_STATS.star_collector,
          ...(parsed.star_collector ?? {}),
        },
        boss_battle: {
          ...DEFAULT_STATS.boss_battle,
          ...(parsed.boss_battle ?? {}),
        },
        daily_tournament: {
          ...DEFAULT_STATS.daily_tournament,
          ...(parsed.daily_tournament ?? {}),
        },
        blind: { ...DEFAULT_STATS.blind, ...(parsed.blind ?? {}) },
        foggy: { ...DEFAULT_STATS.foggy, ...(parsed.foggy ?? {}) },
        one_error: { ...DEFAULT_STATS.one_error, ...(parsed.one_error ?? {}) },
      };
    }
  } catch (_) {
    /* ignore */
  }
  return { ...DEFAULT_STATS };
}

function saveModeStats(stats: ModeStats): void {
  localStorage.setItem(MODE_STATS_KEY, JSON.stringify(stats));
}

export function loadGameLog(): GameLogEntry[] {
  try {
    const raw = localStorage.getItem(GAME_LOG_KEY);
    if (raw) return JSON.parse(raw) as GameLogEntry[];
  } catch (_) {
    /* ignore */
  }
  return [];
}

function saveGameLog(log: GameLogEntry[]): void {
  // Keep only last MAX_LOG_ENTRIES
  const trimmed = log.slice(-MAX_LOG_ENTRIES);
  localStorage.setItem(GAME_LOG_KEY, JSON.stringify(trimmed));
}

/** Build filtered ModeStats from game log for a time window */
export function buildFilteredStats(
  filter: "today" | "week" | "all",
): ModeStats {
  if (filter === "all") return loadModeStats();

  const log = loadGameLog();
  const now = Date.now();
  const startOfDay = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const startOfWeek = (() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return d.getTime();
  })();

  const cutoff = filter === "today" ? startOfDay : startOfWeek;
  void now;
  const filtered = log.filter((e) => e.ts >= cutoff);

  const stats: ModeStats = JSON.parse(
    JSON.stringify(DEFAULT_STATS),
  ) as ModeStats;

  for (const e of filtered) {
    const won = e.won;
    switch (e.gameMode) {
      case "classic":
        stats.classic.played++;
        if (won) stats.classic.won++;
        break;
      case "speed_rush":
        stats.speed_rush.played++;
        if (won) stats.speed_rush.won++;
        stats.speed_rush.bestCombo = Math.max(
          stats.speed_rush.bestCombo,
          e.combo ?? 0,
        );
        break;
      case "survival":
        stats.survival.played++;
        if (won) stats.survival.won++;
        stats.survival.bestLives = Math.max(
          stats.survival.bestLives,
          e.livesRemaining ?? 0,
        );
        break;
      case "chain":
        stats.chain.played++;
        stats.chain.bestChain = Math.max(
          stats.chain.bestChain,
          e.chainCount ?? 0,
        );
        break;
      case "star_collector":
        stats.star_collector.played++;
        stats.star_collector.totalStars += e.starsEarned ?? 0;
        break;
      case "boss_battle":
        stats.boss_battle.played++;
        if (won) stats.boss_battle.won++;
        break;
      case "daily_tournament":
        stats.daily_tournament.played++;
        break;
      case "blind":
        stats.blind.played++;
        if (won) stats.blind.won++;
        break;
      case "foggy":
        stats.foggy.played++;
        if (won) stats.foggy.won++;
        break;
      case "one_error":
        stats.one_error.played++;
        if (won) stats.one_error.won++;
        break;
      default:
        break;
    }
  }
  return stats;
}

export function useModeStats() {
  const [stats, setStats] = useState<ModeStats>(loadModeStats);

  const recordModeResult = useCallback(
    (params: {
      gameMode: string;
      won: boolean;
      combo?: number;
      livesRemaining?: number;
      chainCount?: number;
      starsEarned?: number;
    }) => {
      // Append to game log for time-filtered stats
      const entry: GameLogEntry = {
        gameMode: params.gameMode,
        won: params.won,
        ts: Date.now(),
        combo: params.combo,
        chainCount: params.chainCount,
        starsEarned: params.starsEarned,
        livesRemaining: params.livesRemaining,
      };
      const log = loadGameLog();
      log.push(entry);
      saveGameLog(log);

      setStats((prev) => {
        const next = { ...prev };
        const {
          gameMode,
          won,
          combo,
          livesRemaining,
          chainCount,
          starsEarned,
        } = params;

        switch (gameMode) {
          case "classic":
            next.classic = {
              played: prev.classic.played + 1,
              won: prev.classic.won + (won ? 1 : 0),
            };
            break;
          case "speed_rush":
            next.speed_rush = {
              played: prev.speed_rush.played + 1,
              won: prev.speed_rush.won + (won ? 1 : 0),
              bestCombo: Math.max(prev.speed_rush.bestCombo, combo ?? 0),
            };
            break;
          case "survival":
            next.survival = {
              played: prev.survival.played + 1,
              won: prev.survival.won + (won ? 1 : 0),
              bestLives: Math.max(prev.survival.bestLives, livesRemaining ?? 0),
            };
            break;
          case "chain":
            next.chain = {
              played: prev.chain.played + 1,
              bestChain: Math.max(prev.chain.bestChain, chainCount ?? 0),
            };
            break;
          case "star_collector":
            next.star_collector = {
              played: prev.star_collector.played + 1,
              totalStars: prev.star_collector.totalStars + (starsEarned ?? 0),
            };
            break;
          case "boss_battle":
            next.boss_battle = {
              played: prev.boss_battle.played + 1,
              won: prev.boss_battle.won + (won ? 1 : 0),
            };
            break;
          case "daily_tournament":
            next.daily_tournament = {
              played: prev.daily_tournament.played + 1,
            };
            break;
          case "blind":
            next.blind = {
              played: prev.blind.played + 1,
              won: prev.blind.won + (won ? 1 : 0),
            };
            break;
          case "foggy":
            next.foggy = {
              played: prev.foggy.played + 1,
              won: prev.foggy.won + (won ? 1 : 0),
            };
            break;
          case "one_error":
            next.one_error = {
              played: prev.one_error.played + 1,
              won: prev.one_error.won + (won ? 1 : 0),
            };
            break;
          default:
            break;
        }

        saveModeStats(next);
        return next;
      });
    },
    [],
  );

  return { modeStats: stats, recordModeResult };
}
