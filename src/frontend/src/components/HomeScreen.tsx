import { motion } from "motion/react";
import React from "react";
import {
  DailyTaskType,
  type Difficulty,
  type PlayerProfile,
} from "../backend.d";
import { type Lang, useTranslation } from "../i18n";
import { XPBar, getRankInfo } from "./XPBar";

interface HomeScreenProps {
  lang: Lang;
  playerProfile: PlayerProfile | null;
  isLoading: boolean;
  onPlay?: (difficulty: Difficulty) => void;
  onOpenModes: () => void;
  onNavigate: (screen: "stats" | "badges" | "settings") => void;
}

function DailyTasksPanel({
  playerProfile,
  lang,
}: {
  playerProfile: PlayerProfile | null;
  lang: Lang;
}) {
  const t = useTranslation(lang);

  const getTaskLabel = (taskType: DailyTaskType) => {
    const map: Record<DailyTaskType, string> = {
      [DailyTaskType.solve_two_puzzles]: t("task_solve_two_puzzles"),
      [DailyTaskType.solve_no_hints]: t("task_solve_no_hints"),
      [DailyTaskType.solve_under_time]: t("task_solve_under_time"),
    };
    return map[taskType];
  };

  const tasks = playerProfile?.dailyTasks ?? [
    { taskType: DailyTaskType.solve_two_puzzles, isCompleted: false },
    { taskType: DailyTaskType.solve_no_hints, isCompleted: false },
    { taskType: DailyTaskType.solve_under_time, isCompleted: false },
  ];

  const taskEmojis: Record<DailyTaskType, string> = {
    [DailyTaskType.solve_two_puzzles]: "🎯",
    [DailyTaskType.solve_no_hints]: "🧠",
    [DailyTaskType.solve_under_time]: "⚡",
  };

  const completedCount = tasks.filter((task) => task.isCompleted).length;

  return (
    <motion.div
      data-ocid="daily.tasks.panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl p-4"
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
          className="text-xs font-bold px-2 py-1 rounded-full"
          style={{
            background:
              completedCount === 3
                ? "oklch(var(--game-cell-hint))"
                : "oklch(var(--secondary))",
            color:
              completedCount === 3
                ? "oklch(var(--foreground))"
                : "oklch(var(--primary))",
          }}
        >
          {completedCount}/3
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.taskType}
            className="flex items-center gap-3 rounded-xl p-2.5"
            style={{
              background: task.isCompleted
                ? "oklch(var(--game-cell-hint))"
                : "oklch(var(--muted))",
            }}
          >
            <span className="text-lg">{taskEmojis[task.taskType]}</span>
            <span
              className="flex-1 text-sm font-medium"
              style={{
                color: "oklch(var(--card-foreground))",
                textDecoration: task.isCompleted ? "line-through" : "none",
                opacity: task.isCompleted ? 0.7 : 1,
              }}
            >
              {getTaskLabel(task.taskType)}
            </span>
            {task.isCompleted && (
              <span className="check-bounce text-lg">✅</span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function WeeklyChallengePanel({
  playerProfile,
  lang,
}: {
  playerProfile: PlayerProfile | null;
  lang: Lang;
}) {
  const t = useTranslation(lang);
  const completed = Number(
    playerProfile?.weeklyChallenge?.puzzlesCompleted ?? 0,
  );
  const goal = 7;
  const progress = Math.min(100, (completed / goal) * 100);
  const badgeAwarded = playerProfile?.weeklyChallenge?.badgeAwarded ?? false;

  return (
    <motion.div
      data-ocid="weekly.challenge.panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl p-4"
      style={{
        background: badgeAwarded
          ? "oklch(var(--secondary))"
          : "oklch(var(--card))",
        border: `1.5px solid ${badgeAwarded ? "oklch(var(--accent))" : "oklch(var(--border))"}`,
        boxShadow: "0 2px 12px oklch(var(--primary) / 0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="font-bold font-display text-base"
          style={{ color: "oklch(var(--card-foreground))" }}
        >
          🏆 {t("weeklyChallenge")}
        </h3>
        {badgeAwarded && (
          <span
            className="text-sm font-bold"
            style={{ color: "oklch(var(--primary))" }}
          >
            🏅 Champion!
          </span>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span style={{ color: "oklch(var(--muted-foreground))" }}>
            {completed}/{goal} {t("puzzlesCompleted")}
          </span>
        </div>
        <div
          className="h-3 rounded-full overflow-hidden"
          style={{ background: "oklch(var(--muted))" }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, oklch(var(--accent)), oklch(var(--primary)))",
            }}
          />
        </div>
        {badgeAwarded && (
          <p
            className="text-xs font-semibold"
            style={{ color: "oklch(var(--primary))" }}
          >
            {t("weeklyChallengeComplete")}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function HomeScreen({
  lang,
  playerProfile,
  isLoading,
  onOpenModes,
  onNavigate,
}: HomeScreenProps) {
  const t = useTranslation(lang);

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
      className="min-h-screen flex flex-col"
      style={{ background: "transparent" }}
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
      <header className="relative px-6 pt-8 pb-4">
        <div className="flex items-start justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-black font-display leading-tight gradient-text">
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
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 pb-6 space-y-5 overflow-y-auto">
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
            className="w-full text-white font-black font-display text-2xl py-5 rounded-2xl shadow-lg relative overflow-hidden"
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
        <DailyTasksPanel playerProfile={playerProfile} lang={lang} />

        {/* Weekly Challenge */}
        <WeeklyChallengePanel playerProfile={playerProfile} lang={lang} />
      </main>

      {/* Bottom nav */}
      <nav
        className="sticky bottom-0 glass-card border-t px-4 py-3"
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
