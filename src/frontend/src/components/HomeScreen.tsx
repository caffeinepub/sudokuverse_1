import { AnimatePresence, motion } from "motion/react";
import React from "react";
import {
  DailyTaskType,
  type Difficulty,
  type PlayerProfile,
} from "../backend.d";
import { useSound } from "../context/SoundContext";
import { useTheme } from "../context/ThemeContext";
import { useDailyTasks } from "../hooks/useDailyTasks";
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

// Extended task types that are frontend-only (not stored in backend)
type ExtendedTaskType =
  | DailyTaskType
  | "solve_three_puzzles"
  | "solve_hard_puzzle"
  | "no_errors_puzzle"
  | "speed_solve"
  | "use_notes_mode"
  | "solve_medium_plus"
  | "chain_two";

interface ExtendedDailyTask {
  taskType: ExtendedTaskType;
  isCompleted: boolean;
  isFrontendOnly?: boolean;
}

interface HomeScreenProps {
  lang: Lang;
  playerProfile: PlayerProfile | null;
  isLoading: boolean;
  onPlay?: (difficulty: Difficulty) => void;
  onOpenModes: () => void;
  onNavigate: (screen: "stats" | "badges" | "settings") => void;
  onOpenThemePicker?: () => void;
  onOpenSettings?: () => void;
}

const TASK_EMOJIS: Record<ExtendedTaskType, string> = {
  [DailyTaskType.solve_two_puzzles]: "🎯",
  [DailyTaskType.solve_no_hints]: "🧠",
  [DailyTaskType.solve_under_time]: "⚡",
  solve_three_puzzles: "🔢",
  solve_hard_puzzle: "💪",
  no_errors_puzzle: "✨",
  speed_solve: "🏃",
  use_notes_mode: "📝",
  solve_medium_plus: "🎖️",
  chain_two: "⛓️",
};

const EXTRA_TASK_TYPES: Array<
  Exclude<
    ExtendedTaskType,
    | DailyTaskType.solve_two_puzzles
    | DailyTaskType.solve_no_hints
    | DailyTaskType.solve_under_time
  >
> = [
  "solve_three_puzzles",
  "solve_hard_puzzle",
  "no_errors_puzzle",
  "speed_solve",
  "use_notes_mode",
  "solve_medium_plus",
  "chain_two",
];

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

function getTaskLabel(
  taskType: ExtendedTaskType,
  t: ReturnType<typeof useTranslation>,
): string {
  const map: Partial<Record<ExtendedTaskType, string>> = {
    [DailyTaskType.solve_two_puzzles]: t("task_solve_two_puzzles"),
    [DailyTaskType.solve_no_hints]: t("task_solve_no_hints"),
    [DailyTaskType.solve_under_time]: t("task_solve_under_time"),
    solve_three_puzzles: t("task_solve_three_puzzles"),
    solve_hard_puzzle: t("task_solve_hard_puzzle"),
    no_errors_puzzle: t("task_no_errors_puzzle"),
    speed_solve: t("task_speed_solve"),
    use_notes_mode: t("task_use_notes_mode"),
    solve_medium_plus: t("task_solve_medium_plus"),
    chain_two: t("task_chain_two"),
  };
  return map[taskType] ?? String(taskType);
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

  const backendTasks: ExtendedDailyTask[] = (
    playerProfile?.dailyTasks ?? [
      { taskType: DailyTaskType.solve_two_puzzles, isCompleted: false },
      { taskType: DailyTaskType.solve_no_hints, isCompleted: false },
      { taskType: DailyTaskType.solve_under_time, isCompleted: false },
    ]
  ).map((task) => ({
    taskType: task.taskType as ExtendedTaskType,
    // Also check frontendCompletedTasks for backend-keyed tasks (same key names)
    isCompleted: task.isCompleted || !!frontendCompletedTasks[task.taskType],
  }));

  const extraTasks: ExtendedDailyTask[] = EXTRA_TASK_TYPES.map((taskType) => ({
    taskType,
    isCompleted: !!frontendCompletedTasks[taskType],
    isFrontendOnly: true,
  }));

  const allTasks: ExtendedDailyTask[] = [...backendTasks, ...extraTasks];
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
      <div className="flex items-center justify-between mb-3">
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
              {getTaskLabel(task.taskType, t)}
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
          return (
            <motion.div
              key={taskKey}
              data-ocid={`weekly.challenge.item.${index + 1}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 * index + 0.3 }}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2"
              style={{
                background: isDone
                  ? "oklch(var(--game-cell-hint) / 0.4)"
                  : "oklch(var(--muted))",
                border: isDone
                  ? "1px solid oklch(var(--game-cell-hint) / 0.6)"
                  : "1px solid transparent",
              }}
            >
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
      <header className="relative px-6 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-black font-display leading-tight gradient-text">
              SudokuVerse
            </h1>
            <p
              className="text-sm mt-0.5"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {t("tagline")}
            </p>
          </motion.div>

          {/* Rank badge */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-end gap-1"
          >
            <div className="rounded-full px-3 py-1 text-sm font-bold gradient-bg-purple-pink text-white">
              {isLoading ? "..." : rankName}
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
            className="mt-4"
          >
            <XPBar xp={playerProfile.xp} lang={lang} />
          </motion.div>
        )}
        {isLoading && (
          <div
            className="mt-4 h-3 rounded-full animate-pulse"
            style={{ background: "oklch(var(--secondary))" }}
          />
        )}

        {/* Theme & Language inline pills */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 mt-3"
        >
          {/* Theme pill */}
          <button
            type="button"
            data-ocid="home.theme.open_modal_button"
            onClick={onOpenThemePicker}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95"
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
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95"
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
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95"
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
            {lang === "tr" ? "8 farklı oyun modu" : "8 different game modes"}
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
