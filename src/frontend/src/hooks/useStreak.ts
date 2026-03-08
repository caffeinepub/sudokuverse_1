import { useCallback, useEffect, useState } from "react";

const STREAK_KEY = "sudokuverse_streak_v1";

interface StreakData {
  lastPlayDate: string; // YYYY-MM-DD
  currentStreak: number;
  longestStreak: number;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadStreakData(): StreakData {
  try {
    const stored = localStorage.getItem(STREAK_KEY);
    if (stored) {
      return JSON.parse(stored) as StreakData;
    }
  } catch (_) {
    /* ignore */
  }
  return { lastPlayDate: "", currentStreak: 0, longestStreak: 0 };
}

function saveStreakData(data: StreakData) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [isNewDay, setIsNewDay] = useState(false);
  const [bonusXP, setBonusXP] = useState(0);

  const checkAndUpdateStreak = useCallback(() => {
    const data = loadStreakData();
    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    let newStreak = data.currentStreak;
    let newIsNewDay = false;
    let newBonusXP = 0;

    if (data.lastPlayDate === today) {
      // Already counted today, no update
      newStreak = data.currentStreak;
    } else if (data.lastPlayDate === yesterday) {
      // Streak continues from yesterday
      newStreak = data.currentStreak + 1;
      newIsNewDay = true;
    } else if (data.lastPlayDate === "") {
      // First time ever
      newStreak = 1;
      newIsNewDay = true;
    } else {
      // Streak broken
      newStreak = 1;
      newIsNewDay = true;
    }

    if (newIsNewDay) {
      // Calculate bonus XP
      if (newStreak >= 7) {
        newBonusXP = 100;
      } else if (newStreak >= 3) {
        newBonusXP = 50;
      } else {
        newBonusXP = 20;
      }
    }

    const newLongest = Math.max(data.longestStreak, newStreak);
    const newData: StreakData = {
      lastPlayDate: today,
      currentStreak: newStreak,
      longestStreak: newLongest,
    };

    if (data.lastPlayDate !== today) {
      saveStreakData(newData);
    }

    setStreak(newStreak);
    setLongestStreak(newLongest);
    setIsNewDay(newIsNewDay);
    setBonusXP(newBonusXP);

    return { streak: newStreak, isNewDay: newIsNewDay, bonusXP: newBonusXP };
  }, []);

  useEffect(() => {
    checkAndUpdateStreak();
  }, [checkAndUpdateStreak]);

  return {
    streak,
    longestStreak,
    isNewDay,
    bonusXP,
    checkAndUpdateStreak,
  };
}
