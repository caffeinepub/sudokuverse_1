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
}

const MODE_STATS_KEY = "sudokuverse_mode_stats_v2";

const DEFAULT_STATS: ModeStats = {
  classic: { played: 0, won: 0 },
  speed_rush: { played: 0, won: 0, bestCombo: 0 },
  survival: { played: 0, won: 0, bestLives: 0 },
  chain: { played: 0, bestChain: 0 },
  star_collector: { played: 0, totalStars: 0 },
  boss_battle: { played: 0, won: 0 },
  daily_tournament: { played: 0 },
  blind: { played: 0, won: 0 },
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
