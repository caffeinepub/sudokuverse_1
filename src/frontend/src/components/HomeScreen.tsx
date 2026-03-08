import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { DailyTaskType, Difficulty, PlayerProfile } from "../backend.d";
import { useSound } from "../context/SoundContext";
import { useTheme } from "../context/ThemeContext";
import {
  type FrontendTaskType,
  getDailyTasksForToday,
  getWeeklyExpertErrorlessCount,
  useDailyTasks,
} from "../hooks/useDailyTasks";
import { useLevelSystem } from "../hooks/useLevelSystem";
import { useNickname } from "../hooks/useNickname";
import { useAddStreakBonus } from "../hooks/usePlayerData";
import { useStreak } from "../hooks/useStreak";
import { LANGUAGES, type Lang, useTranslation } from "../i18n";
import { THEMES } from "../themes";
import { XPBar, getRankInfo } from "./XPBar";

const FLAG_MAP: Record<Lang, string> = {
  tr: "🇹🇷",
  en: "🇬🇧",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
  it: "🇮🇹",
  pt: "🇧🇷",
  ru: "🇷🇺",
  ja: "🇯🇵",
  ko: "🇰🇷",
  zh: "🇨🇳",
  ar: "🇸🇦",
  hi: "🇮🇳",
};

interface ExtendedDailyTask {
  taskType: FrontendTaskType;
  isCompleted: boolean;
  isFrontendOnly?: boolean;
}

interface HomeScreenProps {
  lang: Lang;
  playerProfile: PlayerProfile | null;
  isLoading: boolean;
  onPlay?: (difficulty: Difficulty) => void;
  onOpenModes: () => void;
  onNavigate: (screen: "stats" | "badges" | "settings" | "profile") => void;
  onOpenThemePicker?: () => void;
  onOpenSettings?: () => void;
}

const TASK_EMOJIS: Record<FrontendTaskType, string> = {
  solve_two_puzzles: "🎯",
  solve_no_hints: "🧠",
  solve_under_time: "⚡",
  solve_three_puzzles: "🔢",
  solve_hard_puzzle: "💪",
  no_errors_puzzle: "✨",
  speed_solve: "🏃",
  use_notes_mode: "📝",
  solve_medium_plus: "🎖️",
  chain_two: "⛓️",
  play_boss_battle: "🐉",
  play_survival: "❤️",
  play_blind_mode: "👁️",
  play_star_collector: "⭐",
  solve_five_puzzles: "5️⃣",
  solve_expert_puzzle: "🏆",
};

const WEEKLY_CHALLENGES = [
  "weekly_task_1",
  "weekly_task_2",
  "weekly_task_3",
  "weekly_task_4",
  "weekly_task_5",
  "weekly_task_6",
  "weekly_task_7",
] as const;

const WEEKLY_CHALLENGE_EMOJIS = ["🧩", "💪", "🔥", "⚡", "⛓️", "🎯", "🌈"];

// Weekly challenge progress targets (must match useDailyTasks thresholds)
const WEEKLY_CHALLENGE_PROGRESS: { current: () => number; target: number }[] = [
  {
    // weekly_task_1: solve >= 7 puzzles this week
    current: () => {
      try {
        const raw = localStorage.getItem("sudokuverse_weekly_solve_count_v2");
        if (raw) {
          const p = JSON.parse(raw) as { weekKey: string; count: number };
          const d = new Date();
          const jan4 = new Date(d.getFullYear(), 0, 4);
          const week = Math.ceil(
            ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7,
          );
          const wk = `${d.getFullYear()}-W${week.toString().padStart(2, "0")}`;
          if (p.weekKey === wk) return p.count;
        }
      } catch (_) {}
      return 0;
    },
    target: 7,
  },
  {
    // weekly_task_2: 3 hard+ puzzles
    current: () => {
      try {
        const raw = localStorage.getItem("sudokuverse_weekly_hard_solves_v2");
        if (raw) {
          const p = JSON.parse(raw) as { weekKey: string; count: number };
          const d = new Date();
          const jan4 = new Date(d.getFullYear(), 0, 4);
          const week = Math.ceil(
            ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7,
          );
          const wk = `${d.getFullYear()}-W${week.toString().padStart(2, "0")}`;
          if (p.weekKey === wk) return p.count;
        }
      } catch (_) {}
      return 0;
    },
    target: 3,
  },
  {
    // weekly_task_3: all daily tasks done in one day — show how many daily tasks completed today
    current: () => {
      try {
        const raw = localStorage.getItem("sudokuverse_daily_tasks_v2");
        if (raw) {
          const p = JSON.parse(raw) as {
            date: string;
            tasks: Record<string, boolean>;
          };
          const d = new Date();
          const todayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
          if (p.date === todayKey) {
            return Object.values(p.tasks).filter(Boolean).length;
          }
        }
      } catch (_) {}
      return 0;
    },
    target: 10,
  },
  {
    // weekly_task_4: speed_rush mode solve — show count of speed_rush sessions played
    current: () => {
      try {
        const raw = localStorage.getItem("sudokuverse_mode_stats_v2");
        if (raw) {
          const p = JSON.parse(raw) as Record<
            string,
            { played: number; won: number }
          >;
          return p.speed_rush?.played ?? 0;
        }
      } catch (_) {}
      return 0;
    },
    target: 1,
  },
  {
    // weekly_task_5: chain >= 5 — show chain record
    current: () => {
      const record = Number.parseInt(
        localStorage.getItem("sudokuverse_chain_record") ?? "0",
        10,
      );
      return Math.min(record, 5);
    },
    target: 5,
  },
  {
    // weekly_task_6: expert with 0 errors — use dedicated expert errorless counter
    current: () => Math.min(getWeeklyExpertErrorlessCount(), 1),
    target: 1,
  },
  {
    // weekly_task_7: 3 different difficulties
    current: () => {
      try {
        const raw = localStorage.getItem("sudokuverse_weekly_difficulties_v2");
        if (raw) {
          const p = JSON.parse(raw) as { weekKey: string; diffs: string[] };
          const d = new Date();
          const jan4 = new Date(d.getFullYear(), 0, 4);
          const week = Math.ceil(
            ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7,
          );
          const wk = `${d.getFullYear()}-W${week.toString().padStart(2, "0")}`;
          if (p.weekKey === wk) return p.diffs.length;
        }
      } catch (_) {}
      return 0;
    },
    target: 3,
  },
];

const TASK_XP: Partial<Record<FrontendTaskType, number>> = {
  solve_two_puzzles: 20,
  solve_no_hints: 40,
  solve_under_time: 30,
  solve_three_puzzles: 30,
  solve_hard_puzzle: 50,
  no_errors_puzzle: 45,
  speed_solve: 35,
  use_notes_mode: 15,
  solve_medium_plus: 35,
  chain_two: 50,
  play_boss_battle: 60,
  play_survival: 40,
  play_blind_mode: 50,
  play_star_collector: 30,
  solve_five_puzzles: 50,
  solve_expert_puzzle: 70,
};

function getTaskLabel(
  taskType: FrontendTaskType,
  lang: string,
  t: ReturnType<typeof useTranslation>,
): string {
  const isTr = lang === "tr";
  const map: Partial<Record<FrontendTaskType, string>> = {
    solve_two_puzzles: t("task_solve_two_puzzles"),
    solve_no_hints: t("task_solve_no_hints"),
    solve_under_time: t("task_solve_under_time"),
    solve_three_puzzles: t("task_solve_three_puzzles"),
    solve_hard_puzzle: t("task_solve_hard_puzzle"),
    no_errors_puzzle: t("task_no_errors_puzzle"),
    speed_solve: t("task_speed_solve"),
    use_notes_mode: t("task_use_notes_mode"),
    solve_medium_plus: t("task_solve_medium_plus"),
    chain_two: t("task_chain_two"),
    play_boss_battle: isTr
      ? "Boss Battle modunu oyna"
      : "Play Boss Battle mode",
    play_survival: isTr ? "Hayatta Kalma modunu oyna" : "Play Survival mode",
    play_blind_mode: isTr ? "Kör Mod oyna" : "Play Blind Mode",
    play_star_collector: isTr ? "Yıldız Toplayıcı oyna" : "Play Star Collector",
    solve_five_puzzles: isTr ? "5 bulmaca çöz" : "Solve 5 puzzles",
    solve_expert_puzzle: isTr
      ? "Uzman seviyesinde bulmaca çöz"
      : "Solve an Expert puzzle",
  };
  return map[taskType] ?? String(taskType);
}

function getSecsToMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

/** Returns seconds until next midnight */
function useTimeUntilMidnight(): number {
  const [secs, setSecs] = useState(getSecsToMidnight);
  useEffect(() => {
    const id = setInterval(() => setSecs(getSecsToMidnight()), 1000);
    return () => clearInterval(id);
  }, []);
  return secs;
}

function formatCountdown(secs: number, lang: string): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (lang === "tr") {
    return `${h}s ${m.toString().padStart(2, "0")}d ${s.toString().padStart(2, "0")}sn`;
  }
  return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

function DailyTasksPanel({
  playerProfile,
  lang,
  frontendCompletedTasks,
}: {
  playerProfile: PlayerProfile | null;
  lang: Lang;
  frontendCompletedTasks: Partial<Record<string, boolean>>;
}) {
  const t = useTranslation(lang);
  const secsLeft = useTimeUntilMidnight();

  // Get today's rotated task list
  const todayTaskTypes = getDailyTasksForToday();

  const allTasks: ExtendedDailyTask[] = todayTaskTypes.map((taskType) => ({
    taskType,
    isCompleted:
      !!frontendCompletedTasks[taskType] ||
      !!(playerProfile?.dailyTasks ?? []).find(
        (t) => t.taskType === taskType && t.isCompleted,
      ),
    isFrontendOnly: true,
  }));
  const completedCount = allTasks.filter((task) => task.isCompleted).length;
  const totalCount = allTasks.length;
  const allDone = completedCount === totalCount;

  return (
    <motion.div
      data-ocid="daily.tasks.panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl p-3"
      style={{
        background: "oklch(var(--card))",
        border: "1.5px solid oklch(var(--border))",
        boxShadow: "0 2px 12px oklch(var(--primary) / 0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3
          className="font-bold font-display text-base"
          style={{ color: "oklch(var(--card-foreground))" }}
        >
          📅 {t("dailyTasks")}
        </h3>
        <span
          className="text-xs font-bold px-2 py-1 rounded-full transition-all duration-500"
          style={{
            background: allDone
              ? "oklch(var(--game-cell-hint))"
              : "oklch(var(--secondary))",
            color: allDone
              ? "oklch(var(--foreground))"
              : "oklch(var(--primary))",
          }}
        >
          {completedCount}/{totalCount}
        </span>
      </div>
      {/* Countdown to daily reset */}
      <div
        className="flex items-center gap-1.5 mb-2 text-xs"
        style={{ color: "oklch(var(--muted-foreground))" }}
      >
        <span>🔄</span>
        <span>
          {lang === "tr" ? "Yenileme: " : "Resets in: "}
          <span
            className="font-bold font-display"
            style={{
              color:
                secsLeft < 3600
                  ? "oklch(0.62 0.23 340)"
                  : "oklch(var(--muted-foreground))",
            }}
          >
            {formatCountdown(secsLeft, lang)}
          </span>
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 rounded-full overflow-hidden mb-3"
        style={{ background: "oklch(var(--muted))" }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / totalCount) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            background: allDone
              ? "linear-gradient(90deg, oklch(0.72 0.19 142), oklch(0.62 0.2 162))"
              : "linear-gradient(90deg, oklch(var(--accent)), oklch(var(--primary)))",
          }}
        />
      </div>

      <div
        className="space-y-1.5 overflow-y-auto pr-0.5"
        style={{ maxHeight: "260px" }}
      >
        {allTasks.map((task, index) => (
          <motion.div
            key={task.taskType}
            data-ocid={`daily.task.item.${index + 1}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index }}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2"
            style={{
              background: task.isCompleted
                ? "oklch(var(--game-cell-hint) / 0.5)"
                : "oklch(var(--muted))",
              border: task.isCompleted
                ? "1px solid oklch(var(--game-cell-hint))"
                : "1px solid transparent",
            }}
          >
            <span className="text-base leading-none flex-shrink-0">
              {TASK_EMOJIS[task.taskType]}
            </span>
            <span
              className="flex-1 text-xs font-medium leading-tight"
              style={{
                color: "oklch(var(--card-foreground))",
                textDecoration: task.isCompleted ? "line-through" : "none",
                opacity: task.isCompleted ? 0.6 : 1,
              }}
            >
              {getTaskLabel(task.taskType, lang, t)}
            </span>
            <AnimatePresence>
              {task.isCompleted && (
                <motion.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  className="text-sm flex-shrink-0"
                >
                  ✅
                </motion.span>
              )}
            </AnimatePresence>
            {!task.isCompleted && TASK_XP[task.taskType] !== undefined && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: "oklch(0.57 0.22 52 / 0.15)",
                  color: "oklch(0.55 0.22 52)",
                  border: "1px solid oklch(0.57 0.22 52 / 0.3)",
                  fontSize: "9px",
                }}
              >
                +{TASK_XP[task.taskType]} XP
              </span>
            )}
            {task.isFrontendOnly && !task.isCompleted && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: "oklch(var(--secondary))",
                  color: "oklch(var(--muted-foreground))",
                  fontSize: "9px",
                }}
              >
                {t("pending")}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function WeeklyChallengePanel({
  playerProfile,
  lang,
  weeklyCompleted,
}: {
  playerProfile: PlayerProfile | null;
  lang: Lang;
  weeklyCompleted: boolean[];
}) {
  const t = useTranslation(lang);
  const badgeAwarded = playerProfile?.weeklyChallenge?.badgeAwarded ?? false;

  const completedChallenges = badgeAwarded
    ? 7
    : weeklyCompleted.filter(Boolean).length;
  const totalChallenges = 7;
  const allDone = completedChallenges === totalChallenges || badgeAwarded;

  return (
    <motion.div
      data-ocid="weekly.challenge.panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl p-3"
      style={{
        background: allDone ? "oklch(var(--secondary))" : "oklch(var(--card))",
        border: `1.5px solid ${allDone ? "oklch(var(--accent))" : "oklch(var(--border))"}`,
        boxShadow: "0 2px 12px oklch(var(--primary) / 0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3
          className="font-bold font-display text-base"
          style={{ color: "oklch(var(--card-foreground))" }}
        >
          🏆 {t("weeklyChallenge")}
        </h3>
        <span
          className="text-xs font-bold px-2 py-1 rounded-full"
          style={{
            background: allDone
              ? "oklch(var(--game-cell-hint))"
              : "oklch(var(--secondary))",
            color: allDone
              ? "oklch(var(--foreground))"
              : "oklch(var(--primary))",
          }}
        >
          {allDone ? completedChallenges : completedChallenges}/
          {totalChallenges}
        </span>
      </div>

      {/* Overall progress bar */}
      <div
        className="h-1.5 rounded-full overflow-hidden mb-3"
        style={{ background: "oklch(var(--muted))" }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${(completedChallenges / totalChallenges) * 100}%`,
          }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
          style={{
            background: allDone
              ? "linear-gradient(90deg, oklch(0.72 0.19 52), oklch(0.62 0.23 45))"
              : "linear-gradient(90deg, oklch(var(--accent)), oklch(var(--primary)))",
          }}
        />
      </div>

      {/* Weekly challenge checklist */}
      <div
        className="space-y-1.5 overflow-y-auto pr-0.5"
        style={{ maxHeight: "220px" }}
      >
        {WEEKLY_CHALLENGES.map((taskKey, index) => {
          const isDone = (weeklyCompleted[index] ?? false) || badgeAwarded;
          const prog = WEEKLY_CHALLENGE_PROGRESS[index];
          const currentVal = isDone ? prog.target : prog.current();
          const showProgress = !isDone && (prog.target > 1 || currentVal > 0);
          const progressPct = Math.min(1, currentVal / prog.target);
          return (
            <motion.div
              key={taskKey}
              data-ocid={`weekly.challenge.item.${index + 1}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 * index + 0.3 }}
              className="flex flex-col gap-1 rounded-xl px-2.5 py-2"
              style={{
                background: isDone
                  ? "oklch(var(--game-cell-hint) / 0.4)"
                  : "oklch(var(--muted))",
                border: isDone
                  ? "1px solid oklch(var(--game-cell-hint) / 0.6)"
                  : "1px solid transparent",
              }}
            >
              <div className="flex items-center gap-2.5">
                {/* Checkbox indicator */}
                <motion.div
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isDone
                      ? "oklch(var(--game-cell-hint))"
                      : "oklch(var(--border))",
                    border: isDone
                      ? "none"
                      : "1.5px solid oklch(var(--muted-foreground) / 0.4)",
                  }}
                  animate={isDone ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {isDone && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs leading-none"
                    >
                      ✓
                    </motion.span>
                  )}
                </motion.div>

                <span className="text-base leading-none flex-shrink-0">
                  {WEEKLY_CHALLENGE_EMOJIS[index]}
                </span>

                <span
                  className="flex-1 text-xs font-medium leading-tight"
                  style={{
                    color: "oklch(var(--card-foreground))",
                    textDecoration: isDone ? "line-through" : "none",
                    opacity: isDone ? 0.65 : 1,
                  }}
                >
                  {t(taskKey)}
                </span>

                {/* Numeric progress badge for countable tasks */}
                {showProgress && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background:
                        currentVal > 0
                          ? "oklch(var(--accent) / 0.2)"
                          : "oklch(var(--secondary))",
                      color:
                        currentVal > 0
                          ? "oklch(var(--primary))"
                          : "oklch(var(--muted-foreground))",
                    }}
                  >
                    {currentVal}/{prog.target}
                  </span>
                )}
              </div>

              {/* Mini progress bar for countable tasks */}
              {showProgress && currentVal > 0 && (
                <div
                  className="h-1 rounded-full overflow-hidden ml-7"
                  style={{ background: "oklch(var(--border))" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct * 100}%` }}
                    transition={{
                      duration: 0.6,
                      ease: "easeOut",
                      delay: 0.1 * index + 0.5,
                    }}
                    style={{
                      background:
                        "linear-gradient(90deg, oklch(var(--accent)), oklch(var(--primary)))",
                    }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {allDone && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-semibold mt-2 text-center"
          style={{ color: "oklch(var(--primary))" }}
        >
          {t("weeklyChallengeComplete")}
        </motion.p>
      )}
    </motion.div>
  );
}

export function HomeScreen({
  lang,
  playerProfile,
  isLoading,
  onOpenModes,
  onNavigate,
  onOpenThemePicker,
  onOpenSettings,
}: HomeScreenProps) {
  const { completedTasks, weeklyChallengeCompleted } = useDailyTasks();
  const t = useTranslation(lang);
  const { theme: activeTheme } = useTheme();
  const currentTheme = THEMES.find((th) => th.id === activeTheme);
  const currentLang = LANGUAGES.find((l) => l.code === lang);
  const { musicEnabled, toggleMusic } = useSound();
  const { streak, isNewDay, bonusXP } = useStreak();
  const { currentLevel } = useLevelSystem();
  const { nickname } = useNickname();
  const addStreakBonus = useAddStreakBonus();
  const addStreakBonusRef = useRef(addStreakBonus.mutate);
  useEffect(() => {
    addStreakBonusRef.current = addStreakBonus.mutate;
  });

  // Show daily streak toast on new day and award bonus XP to backend
  useEffect(() => {
    if (isNewDay && streak > 0 && bonusXP > 0) {
      // Award streak bonus XP via dedicated backend function
      addStreakBonusRef.current(bonusXP);
      setTimeout(() => {
        toast.success(
          lang === "tr"
            ? `🔥 ${streak} günlük seri! +${bonusXP} bonus XP`
            : `🔥 ${streak}-day streak! +${bonusXP} bonus XP`,
          { duration: 4000 },
        );
      }, 800);
    }
  }, [isNewDay, streak, bonusXP, lang]);

  const xp = Number(playerProfile?.xp ?? 0);
  const { rankName } = getRankInfo(xp, lang);

  const navItems = [
    {
      id: "stats" as const,
      emoji: "📊",
      label: t("stats"),
      ocid: "home.stats.link",
    },
    {
      id: "badges" as const,
      emoji: "🏅",
      label: t("badges"),
      ocid: "home.badges.link",
    },
    {
      id: "profile" as const,
      emoji: "👤",
      label: lang === "tr" ? "Profil" : "Profile",
      ocid: "home.profile.link",
    },
    {
      id: "settings" as const,
      emoji: "⚙️",
      label: t("settings"),
      ocid: "home.settings.toggle",
    },
  ];

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      {/* Decorative gradient orbs */}
      <div
        className="fixed top-0 right-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(var(--primary)), transparent 70%)",
          transform: "translate(40%, -40%)",
        }}
      />
      <div
        className="fixed bottom-0 left-0 w-80 h-80 rounded-full opacity-15 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(var(--accent)), transparent 70%)",
          transform: "translate(-40%, 40%)",
        }}
      />

      {/* Header */}
      <header className="relative px-6 pt-4 pb-3 overflow-hidden">
        <div className="flex items-start justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-black font-display leading-tight gradient-text">
              SudokuVerse
            </h1>
            {nickname ? (
              <p
                className="text-sm mt-0.5 font-semibold"
                style={{ color: "oklch(var(--primary))" }}
              >
                👋 {t("nicknameHello")}, {nickname}
              </p>
            ) : (
              <p
                className="text-sm mt-0.5"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                {t("tagline")}
              </p>
            )}
          </motion.div>

          {/* Rank badge + Level + Streak */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-end gap-1"
          >
            <div className="flex items-center gap-1.5">
              {/* Streak pill - always show */}
              <div
                className="rounded-full px-2 py-0.5 text-xs font-bold"
                style={{
                  background:
                    streak >= 3
                      ? "oklch(0.72 0.19 52 / 0.18)"
                      : "oklch(var(--secondary))",
                  color:
                    streak >= 3
                      ? "oklch(0.6 0.2 52)"
                      : "oklch(var(--muted-foreground))",
                  border:
                    streak >= 3
                      ? "1.5px solid oklch(0.72 0.19 52 / 0.4)"
                      : "1.5px solid oklch(var(--border))",
                }}
              >
                {streak >= 3 ? "🔥" : "📅"} {streak}
                {lang === "tr" ? " gün" : "d"}
              </div>
              {/* Level badge */}
              <div
                className="rounded-full px-2 py-0.5 text-xs font-bold"
                style={{
                  background: "oklch(0.57 0.22 220 / 0.15)",
                  color: "oklch(0.52 0.22 220)",
                  border: "1.5px solid oklch(0.57 0.22 220 / 0.4)",
                }}
              >
                Lv.{currentLevel}
              </div>
              {/* Rank badge */}
              <div className="rounded-full px-3 py-1 text-sm font-bold gradient-bg-purple-pink text-white">
                {isLoading ? "..." : rankName}
              </div>
            </div>
            {playerProfile && (
              <div
                className="text-xs"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                {Number(playerProfile.puzzlesSolved)}{" "}
                {lang === "tr" ? "çözüm" : "solved"}
              </div>
            )}
          </motion.div>
        </div>

        {/* XP Bar */}
        {!isLoading && playerProfile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-2"
          >
            <XPBar xp={playerProfile.xp} lang={lang} />
          </motion.div>
        )}
        {isLoading && (
          <div
            className="mt-2 h-3 rounded-full animate-pulse"
            style={{ background: "oklch(var(--secondary))" }}
          />
        )}

        {/* Theme & Language inline pills */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-1.5 mt-2 flex-wrap"
        >
          {/* Theme pill */}
          <button
            type="button"
            data-ocid="home.theme.open_modal_button"
            onClick={onOpenThemePicker}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: "oklch(var(--card) / 0.85)",
              border: "1.5px solid oklch(var(--border))",
              color: "oklch(var(--primary))",
              boxShadow: "0 1px 6px oklch(0 0 0 / 0.1)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <span className="text-sm leading-none">
              {currentTheme?.emoji ?? "🎨"}
            </span>
            <span className="text-xs leading-none">🎨</span>
          </button>

          {/* Language pill */}
          <button
            type="button"
            data-ocid="home.lang.open_modal_button"
            onClick={onOpenSettings}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: "oklch(var(--card) / 0.85)",
              border: "1.5px solid oklch(var(--border))",
              color: "oklch(var(--primary))",
              boxShadow: "0 1px 6px oklch(0 0 0 / 0.1)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <span className="text-sm leading-none">{FLAG_MAP[lang]}</span>
            <span className="text-xs font-bold leading-none tracking-wide">
              {currentLang?.code.toUpperCase() ?? "EN"}
            </span>
          </button>

          {/* Music toggle pill */}
          <button
            type="button"
            data-ocid="home.music_toggle"
            onClick={toggleMusic}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              background: musicEnabled
                ? "oklch(var(--primary) / 0.15)"
                : "oklch(var(--card) / 0.85)",
              border: `1.5px solid ${musicEnabled ? "oklch(var(--primary))" : "oklch(var(--border))"}`,
              color: musicEnabled
                ? "oklch(var(--primary))"
                : "oklch(var(--muted-foreground))",
              boxShadow: "0 1px 6px oklch(0 0 0 / 0.1)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <span className="text-sm leading-none">
              {musicEnabled ? "🎵" : "🔇"}
            </span>
          </button>
        </motion.div>
      </header>

      {/* Main content */}
      <main
        className="flex-1 px-6 pb-4 space-y-3 overflow-y-auto"
        style={{ minHeight: 0 }}
      >
        {/* Choose Mode CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-2"
        >
          <motion.button
            type="button"
            data-ocid="home.play_button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenModes}
            className="w-full text-white font-black font-display text-2xl py-4 rounded-2xl shadow-lg relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.52 0.24 292), oklch(0.62 0.23 340), oklch(0.72 0.19 52))",
              boxShadow:
                "0 8px 24px oklch(0.52 0.24 292 / 0.35), 0 2px 6px oklch(0 0 0 / 0.1)",
              letterSpacing: "0.02em",
            }}
          >
            {/* Shine */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, oklch(1 0 0 / 0.1) 0%, transparent 60%)",
              }}
            />
            🎮 {t("chooseMode")}
          </motion.button>
          <p
            className="text-center text-xs"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            {lang === "tr" ? "10 farklı oyun modu" : "10 different game modes"}
          </p>
        </motion.div>

        {/* Daily Tasks */}
        <DailyTasksPanel
          playerProfile={playerProfile}
          lang={lang}
          frontendCompletedTasks={completedTasks}
        />

        {/* Weekly Challenge */}
        <WeeklyChallengePanel
          playerProfile={playerProfile}
          lang={lang}
          weeklyCompleted={weeklyChallengeCompleted}
        />
      </main>

      {/* Bottom nav */}
      <nav
        className="sticky bottom-0 glass-card border-t px-4 py-2"
        style={{ borderColor: "oklch(var(--border))" }}
      >
        <div className="flex items-center justify-around max-w-sm mx-auto">
          {navItems.map(({ id, emoji, label, ocid }) => (
            <button
              type="button"
              key={id}
              data-ocid={ocid}
              onClick={() => onNavigate(id)}
              className="flex flex-col items-center gap-1 rounded-xl px-5 py-2 transition-all hover:scale-105"
              style={{
                background: "transparent",
                color: "oklch(var(--muted-foreground))",
              }}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
