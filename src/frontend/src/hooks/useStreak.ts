import { useCallback, useEffect, useState } from "react";

const STREAK_KEY = "sudokuverse_streak_v1";
const STREAK_HISTORY_KEY = "sudokuverse_streak_history_v1";

interface StreakData {
  lastPlayDate: string; // YYYY-MM-DD
  currentStreak: number;
  longestStreak: number;
}

/** Returns last N days as YYYY-MM-DD strings, oldest first */
export function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return days;
}

/** Returns a Set of dates on which the player played */
export function getPlayedDates(): Set<string> {
  try {
    const raw = localStorage.getItem(STREAK_HISTORY_KEY);
    if (raw) {
      return new Set(JSON.parse(raw) as string[]);
    }
  } catch (_) {
    /* ignore */
  }
  return new Set();
}

function recordPlayedDate(dateStr: string): void {
  const set = getPlayedDates();
  set.add(dateStr);
  // Keep only last 30 days
  const last30 = getLastNDays(30);
  const pruned = last30.filter((d) => set.has(d));
  localStorage.setItem(STREAK_HISTORY_KEY, JSON.stringify(pruned));
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
      recordPlayedDate(today);
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
