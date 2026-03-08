import { useCallback, useState } from "react";
import { Difficulty } from "../backend.d";

const LEVEL_KEY = "sudokuverse_level_v1";

export function getLevelTier(level: number): Difficulty {
  if (level <= 10) return Difficulty.easy;
  if (level <= 25) return Difficulty.medium;
  if (level <= 40) return Difficulty.hard;
  if (level <= 60) return Difficulty.expert;
  return Difficulty.master;
}

interface LevelData {
  currentLevel: number;
  completedLevels: number[];
}

function loadLevelData(): LevelData {
  try {
    const stored = localStorage.getItem(LEVEL_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as LevelData;
      return {
        currentLevel: Math.max(1, Math.min(100, parsed.currentLevel ?? 1)),
        completedLevels: Array.isArray(parsed.completedLevels)
          ? parsed.completedLevels
          : [],
      };
    }
  } catch (_) {
    /* ignore */
  }
  return { currentLevel: 1, completedLevels: [] };
}

function saveLevelData(data: LevelData) {
  localStorage.setItem(LEVEL_KEY, JSON.stringify(data));
}

const DIFFICULTY_ORDER: Difficulty[] = [
  Difficulty.easy,
  Difficulty.medium,
  Difficulty.hard,
  Difficulty.expert,
  Difficulty.master,
];

function difficultyIndex(d: Difficulty): number {
  return DIFFICULTY_ORDER.indexOf(d);
}

export function useLevelSystem() {
  const [levelData, setLevelData] = useState<LevelData>(loadLevelData);

  const advanceLevel = useCallback((solvedDifficulty: Difficulty): boolean => {
    const data = loadLevelData();
    const required = getLevelTier(data.currentLevel);
    const solvedIdx = difficultyIndex(solvedDifficulty);
    const requiredIdx = difficultyIndex(required);

    // Only advance if solved difficulty >= required difficulty for current level
    if (solvedIdx >= requiredIdx && data.currentLevel < 100) {
      const newLevel = data.currentLevel + 1;
      const newCompletedLevels = [...data.completedLevels, data.currentLevel];
      const newData: LevelData = {
        currentLevel: newLevel,
        completedLevels: newCompletedLevels,
      };
      saveLevelData(newData);
      setLevelData(newData);
      return true;
    }
    return false;
  }, []);

  const levelProgress =
    levelData.currentLevel >= 100
      ? 100
      : Math.floor(((levelData.currentLevel - 1) / 99) * 100);

  return {
    currentLevel: levelData.currentLevel,
    completedLevels: levelData.completedLevels,
    advanceLevel,
    levelProgress,
  };
}
