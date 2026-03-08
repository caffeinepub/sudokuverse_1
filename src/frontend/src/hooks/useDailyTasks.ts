/**
 * useDailyTasks — localStorage-based daily & weekly task tracker.
 * Keys are versioned to avoid conflicts with old data.
 */
import { useCallback, useEffect, useState } from "react";

// ---- Types ----
export type FrontendTaskType =
  | "solve_two_puzzles"
  | "solve_no_hints"
  | "solve_under_time"
  | "solve_three_puzzles"
  | "solve_hard_puzzle"
  | "no_errors_puzzle"
  | "speed_solve"
  | "use_notes_mode"
  | "solve_medium_plus"
  | "chain_two";

export type WeeklyTaskIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ---- Storage keys ----
const DAILY_KEY = "sudokuverse_daily_tasks_v2";
const WEEKLY_KEY = "sudokuverse_weekly_v2";
const SOLVE_COUNT_KEY = "sudokuverse_daily_solve_count_v2";
const WEEKLY_SOLVE_COUNT_KEY = "sudokuverse_weekly_solve_count_v2";
const WEEKLY_HARD_SOLVE_COUNT_KEY = "sudokuverse_weekly_hard_solves_v2";
const WEEKLY_DIFFICULTIES_KEY = "sudokuverse_weekly_difficulties_v2";

// ---- Helpers ----
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isoWeekKey(): string {
  const d = new Date();
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const week = Math.ceil(
    ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${week.toString().padStart(2, "0")}`;
}

// ---- Daily tasks ----
interface DailyStorage {
  date: string;
  tasks: Partial<Record<FrontendTaskType, boolean>>;
}

function loadDaily(): DailyStorage {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyStorage;
      if (parsed.date === todayKey()) return parsed;
    }
  } catch (_) {
    /* ignore */
  }
  return { date: todayKey(), tasks: {} };
}

function saveDaily(data: DailyStorage): void {
  localStorage.setItem(DAILY_KEY, JSON.stringify(data));
}

// ---- Weekly challenges ----
interface WeeklyStorage {
  weekKey: string;
  completed: boolean[]; // length 7
}

function loadWeekly(): WeeklyStorage {
  try {
    const raw = localStorage.getItem(WEEKLY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WeeklyStorage;
      if (parsed.weekKey === isoWeekKey()) return parsed;
    }
  } catch (_) {
    /* ignore */
  }
  return { weekKey: isoWeekKey(), completed: Array(7).fill(false) };
}

function saveWeekly(data: WeeklyStorage): void {
  localStorage.setItem(WEEKLY_KEY, JSON.stringify(data));
}

// ---- Daily solve counter ----
function getDailySolveCount(): number {
  try {
    const raw = localStorage.getItem(SOLVE_COUNT_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { date: string; count: number };
      if (p.date === todayKey()) return p.count;
    }
  } catch (_) {
    /* ignore */
  }
  return 0;
}

function incrementDailySolveCount(): number {
  const count = getDailySolveCount() + 1;
  localStorage.setItem(
    SOLVE_COUNT_KEY,
    JSON.stringify({ date: todayKey(), count }),
  );
  return count;
}

// ---- Weekly solve counter ----
function getWeeklySolveCount(): number {
  try {
    const raw = localStorage.getItem(WEEKLY_SOLVE_COUNT_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { weekKey: string; count: number };
      if (p.weekKey === isoWeekKey()) return p.count;
    }
  } catch (_) {
    /* ignore */
  }
  return 0;
}

function incrementWeeklySolveCount(): number {
  const count = getWeeklySolveCount() + 1;
  localStorage.setItem(
    WEEKLY_SOLVE_COUNT_KEY,
    JSON.stringify({ weekKey: isoWeekKey(), count }),
  );
  return count;
}

// ---- Weekly hard solve counter ----
function getWeeklyHardSolves(): number {
  try {
    const raw = localStorage.getItem(WEEKLY_HARD_SOLVE_COUNT_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { weekKey: string; count: number };
      if (p.weekKey === isoWeekKey()) return p.count;
    }
  } catch (_) {
    /* ignore */
  }
  return 0;
}

function incrementWeeklyHardSolves(): number {
  const count = getWeeklyHardSolves() + 1;
  localStorage.setItem(
    WEEKLY_HARD_SOLVE_COUNT_KEY,
    JSON.stringify({ weekKey: isoWeekKey(), count }),
  );
  return count;
}

// ---- Weekly difficulties tracker ----
function getWeeklyDifficulties(): string[] {
  try {
    const raw = localStorage.getItem(WEEKLY_DIFFICULTIES_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { weekKey: string; diffs: string[] };
      if (p.weekKey === isoWeekKey()) return p.diffs;
    }
  } catch (_) {
    /* ignore */
  }
  return [];
}

function addWeeklyDifficulty(diff: string): string[] {
  const diffs = getWeeklyDifficulties();
  if (!diffs.includes(diff)) diffs.push(diff);
  localStorage.setItem(
    WEEKLY_DIFFICULTIES_KEY,
    JSON.stringify({ weekKey: isoWeekKey(), diffs }),
  );
  return diffs;
}

// ---- Hook ----
export function useDailyTasks() {
  const [dailyData, setDailyData] = useState<DailyStorage>(loadDaily);
  const [weeklyData, setWeeklyData] = useState<WeeklyStorage>(loadWeekly);

  // Re-check on focus (new day detection)
  useEffect(() => {
    const check = () => {
      const fresh = loadDaily();
      if (fresh.date !== dailyData.date) {
        setDailyData(fresh);
      }
      const freshW = loadWeekly();
      if (freshW.weekKey !== weeklyData.weekKey) {
        setWeeklyData(freshW);
      }
    };
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [dailyData.date, weeklyData.weekKey]);

  // Mark a specific daily task complete
  const markTaskComplete = useCallback((taskType: FrontendTaskType) => {
    setDailyData((prev) => {
      if (prev.tasks[taskType]) return prev; // already done
      const next: DailyStorage = {
        date: prev.date,
        tasks: { ...prev.tasks, [taskType]: true },
      };
      saveDaily(next);

      // Check if all 10 tasks are now done → mark weekly_task_3
      const allTaskTypes: FrontendTaskType[] = [
        "solve_two_puzzles",
        "solve_no_hints",
        "solve_under_time",
        "solve_three_puzzles",
        "solve_hard_puzzle",
        "no_errors_puzzle",
        "speed_solve",
        "use_notes_mode",
        "solve_medium_plus",
        "chain_two",
      ];
      const allDone = allTaskTypes.every((t) => next.tasks[t]);
      if (allDone) {
        setWeeklyData((prevW) => {
          if (prevW.completed[2]) return prevW;
          const newCompleted = [...prevW.completed];
          newCompleted[2] = true;
          const nextW: WeeklyStorage = {
            weekKey: prevW.weekKey,
            completed: newCompleted,
          };
          saveWeekly(nextW);
          return nextW;
        });
      }
      return next;
    });
  }, []);

  // Mark a weekly challenge done by index (0-6)
  const markWeeklyTaskComplete = useCallback((index: number) => {
    setWeeklyData((prev) => {
      if (prev.completed[index]) return prev;
      const newCompleted = [...prev.completed];
      newCompleted[index] = true;
      const next: WeeklyStorage = {
        weekKey: prev.weekKey,
        completed: newCompleted,
      };
      saveWeekly(next);
      return next;
    });
  }, []);

  // Called when a puzzle is solved; figures out which tasks to tick
  const onPuzzleSolved = useCallback(
    (params: {
      difficulty: string;
      solveTimeSeconds: number;
      hintsUsed: number;
      errors: number;
      isNotesModeUsed: boolean;
      chainCount?: number;
      gameMode: string;
    }) => {
      const {
        difficulty,
        solveTimeSeconds,
        hintsUsed,
        errors,
        isNotesModeUsed,
        chainCount = 0,
        gameMode,
      } = params;

      const isHardPlus = ["hard", "expert", "master"].includes(difficulty);
      const isMediumPlus = ["medium", "hard", "expert", "master"].includes(
        difficulty,
      );
      const isExpert = difficulty === "expert";

      // Increment counters
      const dailyCount = incrementDailySolveCount();
      const weeklyCount = incrementWeeklySolveCount();
      const weeklyDiffs = addWeeklyDifficulty(difficulty);
      if (isHardPlus) incrementWeeklyHardSolves();

      // --- Daily tasks ---
      if (dailyCount >= 2) markTaskComplete("solve_two_puzzles");
      if (dailyCount >= 3) markTaskComplete("solve_three_puzzles");
      if (hintsUsed === 0) markTaskComplete("solve_no_hints");
      if (solveTimeSeconds <= 180) markTaskComplete("solve_under_time"); // 3 min
      if (isHardPlus) markTaskComplete("solve_hard_puzzle");
      if (errors === 0) markTaskComplete("no_errors_puzzle");
      if (solveTimeSeconds <= 300) markTaskComplete("speed_solve"); // 5 min
      if (isNotesModeUsed) markTaskComplete("use_notes_mode");
      if (isMediumPlus) markTaskComplete("solve_medium_plus");
      if (gameMode === "chain" && chainCount >= 2)
        markTaskComplete("chain_two");

      // --- Weekly challenges ---
      // weekly_task_1: solved >= 7 puzzles this week
      if (weeklyCount >= 7) markWeeklyTaskComplete(0);

      // weekly_task_2: 3 hard/expert/master this week
      const weeklyHard = getWeeklyHardSolves();
      if (weeklyHard >= 3) markWeeklyTaskComplete(1);

      // weekly_task_3: all daily tasks done in one day → handled in markTaskComplete

      // weekly_task_4: speed_rush mode solve
      if (gameMode === "speed_rush") markWeeklyTaskComplete(3);

      // weekly_task_5: chain >= 5
      if (gameMode === "chain" && chainCount >= 5) markWeeklyTaskComplete(4);

      // weekly_task_6: expert with 0 errors
      if (isExpert && errors === 0) markWeeklyTaskComplete(5);

      // weekly_task_7: 3 different difficulties this week
      if (weeklyDiffs.length >= 3) markWeeklyTaskComplete(6);
    },
    [markTaskComplete, markWeeklyTaskComplete],
  );

  return {
    completedTasks: dailyData.tasks,
    weeklyChallengeCompleted: weeklyData.completed,
    markTaskComplete,
    markWeeklyTaskComplete,
    onPuzzleSolved,
  };
}
