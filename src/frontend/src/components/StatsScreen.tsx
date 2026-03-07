import { motion } from "motion/react";
import React from "react";
import type { PlayerProfile } from "../backend.d";
import { type Lang, useTranslation } from "../i18n";

interface StatsScreenProps {
  lang: Lang;
  playerProfile: PlayerProfile | null;
  onBack: () => void;
}

function formatTime(seconds: number): string {
  if (seconds === 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function StatsScreen({ lang, playerProfile, onBack }: StatsScreenProps) {
  const t = useTranslation(lang);

  const stats = playerProfile?.stats;
  const totalSolved = Number(playerProfile?.puzzlesSolved ?? 0);
  const totalHints = Number(playerProfile?.hintsUsed ?? 0);
  const totalErrors = Number(playerProfile?.errorsMade ?? 0);

  const difficultyStats = [
    {
      label: t("easy"),
      time: Number(stats?.avgEasyTime ?? 0),
      emoji: "🟢",
      color: "oklch(0.68 0.2 145)",
      bg: "oklch(0.93 0.06 145)",
    },
    {
      label: t("medium"),
      time: Number(stats?.avgMediumTime ?? 0),
      emoji: "🔵",
      color: "oklch(0.57 0.22 220)",
      bg: "oklch(0.93 0.06 220)",
    },
    {
      label: t("hard"),
      time: Number(stats?.avgHardTime ?? 0),
      emoji: "🟠",
      color: "oklch(0.72 0.19 52)",
      bg: "oklch(0.95 0.07 52)",
    },
    {
      label: t("expert"),
      time: Number(stats?.avgExpertTime ?? 0),
      emoji: "🔴",
      color: "oklch(0.62 0.23 340)",
      bg: "oklch(0.95 0.06 340)",
    },
    {
      label: t("master"),
      time: Number(stats?.avgMasterTime ?? 0),
      emoji: "🟣",
      color: "oklch(0.52 0.24 292)",
      bg: "oklch(0.93 0.06 292)",
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.98 0.005 240)" }}
    >
      {/* Header */}
      <header className="flex items-center gap-4 px-6 pt-8 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl px-3 py-2 font-semibold text-sm transition-all hover:scale-105"
          style={{
            background: "oklch(0.93 0.04 280)",
            color: "oklch(0.52 0.24 292)",
          }}
        >
          ← {lang === "tr" ? "Geri" : "Back"}
        </button>
        <h1 className="text-2xl font-black font-display gradient-text">
          📊 {t("stats")}
        </h1>
      </header>

      <main
        data-ocid="stats.panel"
        className="flex-1 px-6 pb-8 space-y-4 overflow-y-auto"
      >
        {/* Overview cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            {
              label: t("totalSolved"),
              value: totalSolved,
              emoji: "✅",
              color: "oklch(0.68 0.2 145)",
              bg: "oklch(0.93 0.06 145)",
            },
            {
              label: t("totalHints"),
              value: totalHints,
              emoji: "💡",
              color: "oklch(0.72 0.19 52)",
              bg: "oklch(0.95 0.07 52)",
            },
            {
              label: t("totalErrors"),
              value: totalErrors,
              emoji: "❌",
              color: "oklch(0.62 0.23 340)",
              bg: "oklch(0.95 0.06 340)",
            },
          ].map(({ label, value, emoji, color, bg }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-4 text-center"
              style={{ background: bg, border: `1.5px solid ${color}33` }}
            >
              <div className="text-2xl mb-1">{emoji}</div>
              <div
                className="text-2xl font-black font-display"
                style={{ color }}
              >
                {value}
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "oklch(0.45 0.04 264)" }}
              >
                {label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Avg time per difficulty */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-5"
          style={{
            background: "white",
            border: "1.5px solid oklch(0.88 0.02 260)",
            boxShadow: "0 2px 12px oklch(0.52 0.24 292 / 0.06)",
          }}
        >
          <h2
            className="font-bold font-display text-base mb-4"
            style={{ color: "oklch(0.18 0.04 264)" }}
          >
            ⏱ {t("avgTime")}
          </h2>
          <div className="space-y-3">
            {difficultyStats.map(({ label, time, emoji, color, bg }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className="rounded-lg px-2.5 py-1 text-xs font-bold flex items-center gap-1.5"
                  style={{
                    background: bg,
                    color,
                    minWidth: "80px",
                  }}
                >
                  {emoji} {label}
                </div>
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ background: "oklch(0.93 0.04 280)" }}
                >
                  {time > 0 && (
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, (time / 1800) * 100)}%`,
                        background: color,
                      }}
                    />
                  )}
                </div>
                <div
                  className="text-sm font-bold font-display"
                  style={{ color, minWidth: "50px", textAlign: "right" }}
                >
                  {formatTime(time)}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {totalSolved === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
            style={{ color: "oklch(0.52 0.04 250)" }}
          >
            <div className="text-5xl mb-4">🎯</div>
            <p className="font-semibold">{t("noStats")}</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
