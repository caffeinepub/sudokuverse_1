import { motion } from "motion/react";
import React from "react";
import type { PlayerProfile } from "../backend.d";
import { loadModeStats } from "../hooks/useModeStats";
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
  const modeStats = loadModeStats();

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
      bg: "oklch(var(--secondary))",
    },
    {
      label: t("medium"),
      time: Number(stats?.avgMediumTime ?? 0),
      emoji: "🔵",
      color: "oklch(0.57 0.22 220)",
      bg: "oklch(var(--secondary))",
    },
    {
      label: t("hard"),
      time: Number(stats?.avgHardTime ?? 0),
      emoji: "🟠",
      color: "oklch(0.72 0.19 52)",
      bg: "oklch(var(--secondary))",
    },
    {
      label: t("expert"),
      time: Number(stats?.avgExpertTime ?? 0),
      emoji: "🔴",
      color: "oklch(0.62 0.23 340)",
      bg: "oklch(var(--secondary))",
    },
    {
      label: t("master"),
      time: Number(stats?.avgMasterTime ?? 0),
      emoji: "🟣",
      color: "oklch(0.52 0.24 292)",
      bg: "oklch(var(--secondary))",
    },
  ];

  const modeCards = [
    {
      id: "classic",
      emoji: "♟️",
      name: lang === "tr" ? "Klasik" : "Classic",
      stats: [
        {
          label: lang === "tr" ? "Oynandı" : "Played",
          value: modeStats.classic.played,
        },
        {
          label: lang === "tr" ? "Kazanıldı" : "Won",
          value: modeStats.classic.won,
        },
      ],
      color: "oklch(0.57 0.22 220)",
    },
    {
      id: "speed_rush",
      emoji: "⚡",
      name: lang === "tr" ? "Hız Modu" : "Speed Rush",
      stats: [
        {
          label: lang === "tr" ? "Oynandı" : "Played",
          value: modeStats.speed_rush.played,
        },
        {
          label: lang === "tr" ? "En İyi Combo" : "Best Combo",
          value: modeStats.speed_rush.bestCombo,
        },
        {
          label: lang === "tr" ? "Kazanıldı" : "Won",
          value: modeStats.speed_rush.won,
        },
      ],
      color: "oklch(0.72 0.19 52)",
    },
    {
      id: "survival",
      emoji: "❤️",
      name: lang === "tr" ? "Hayatta Kalma" : "Survival",
      stats: [
        {
          label: lang === "tr" ? "Oynandı" : "Played",
          value: modeStats.survival.played,
        },
        {
          label: lang === "tr" ? "Kazanıldı" : "Won",
          value: modeStats.survival.won,
        },
        {
          label: lang === "tr" ? "En İyi Can" : "Best Lives",
          value: modeStats.survival.bestLives,
        },
      ],
      color: "oklch(0.5 0.23 0)",
    },
    {
      id: "chain",
      emoji: "⛓️",
      name: lang === "tr" ? "Zincirleme" : "Chain Mode",
      stats: [
        {
          label: lang === "tr" ? "Oynandı" : "Played",
          value: modeStats.chain.played,
        },
        {
          label: lang === "tr" ? "En İyi Zincir" : "Best Chain",
          value: modeStats.chain.bestChain,
        },
      ],
      color: "oklch(0.42 0.2 160)",
    },
    {
      id: "star_collector",
      emoji: "⭐",
      name: lang === "tr" ? "Yıldız Avcısı" : "Star Collector",
      stats: [
        {
          label: lang === "tr" ? "Oynandı" : "Played",
          value: modeStats.star_collector.played,
        },
        {
          label: lang === "tr" ? "Toplam Yıldız" : "Total Stars",
          value: modeStats.star_collector.totalStars,
        },
      ],
      color: "oklch(0.52 0.22 300)",
    },
    {
      id: "boss_battle",
      emoji: "🐉",
      name: lang === "tr" ? "Boss Savaşı" : "Boss Battle",
      stats: [
        {
          label: lang === "tr" ? "Oynandı" : "Played",
          value: modeStats.boss_battle.played,
        },
        {
          label: lang === "tr" ? "Kazanıldı" : "Won",
          value: modeStats.boss_battle.won,
        },
      ],
      color: "oklch(0.45 0.15 20)",
    },
    {
      id: "daily_tournament",
      emoji: "🏆",
      name: lang === "tr" ? "Günlük Turnuva" : "Daily Tournament",
      stats: [
        {
          label: lang === "tr" ? "Oynandı" : "Played",
          value: modeStats.daily_tournament.played,
        },
      ],
      color: "oklch(0.6 0.18 80)",
    },
    {
      id: "blind",
      emoji: "👁️",
      name: lang === "tr" ? "Kör Mod" : "Blind Mode",
      stats: [
        {
          label: lang === "tr" ? "Oynandı" : "Played",
          value: modeStats.blind.played,
        },
        {
          label: lang === "tr" ? "Kazanıldı" : "Won",
          value: modeStats.blind.won,
        },
      ],
      color: "oklch(0.3 0.15 275)",
    },
  ];

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        overflowY: "auto",
        background: "oklch(var(--background))",
      }}
    >
      {/* Header */}
      <header className="flex items-center gap-4 px-6 pt-4 pb-3">
        <button
          type="button"
          data-ocid="stats.back.button"
          onClick={onBack}
          className="rounded-xl px-3 py-2 font-semibold text-sm transition-all hover:scale-105"
          style={{
            background: "oklch(var(--secondary))",
            color: "oklch(var(--primary))",
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
            },
            {
              label: t("totalHints"),
              value: totalHints,
              emoji: "💡",
              color: "oklch(0.72 0.19 52)",
            },
            {
              label: t("totalErrors"),
              value: totalErrors,
              emoji: "❌",
              color: "oklch(0.62 0.23 340)",
            },
          ].map(({ label, value, emoji, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-4 text-center"
              style={{
                background: "oklch(var(--card))",
                border: `1.5px solid ${color}33`,
              }}
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
                style={{ color: "oklch(var(--muted-foreground))" }}
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
            background: "oklch(var(--card))",
            border: "1.5px solid oklch(var(--border))",
            boxShadow: "0 2px 12px oklch(var(--primary) / 0.06)",
          }}
        >
          <h2
            className="font-bold font-display text-base mb-4"
            style={{ color: "oklch(var(--card-foreground))" }}
          >
            ⏱ {t("avgTime")}
          </h2>
          <div className="space-y-3">
            {difficultyStats.map(({ label, time, emoji, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className="rounded-lg px-2.5 py-1 text-xs font-bold flex items-center gap-1.5"
                  style={{
                    background: "oklch(var(--secondary))",
                    color,
                    minWidth: "80px",
                  }}
                >
                  {emoji} {label}
                </div>
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ background: "oklch(var(--muted))" }}
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

        {/* Mode Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2
            className="font-bold font-display text-base mb-3"
            style={{ color: "oklch(var(--foreground))" }}
          >
            🎮 {lang === "tr" ? "Mod İstatistikleri" : "Mode Statistics"}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {modeCards.map((card, i) => (
              <motion.div
                key={card.id}
                data-ocid={`stats.mode.item.${i + 1}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.03 * i + 0.25 }}
                className="rounded-2xl p-3"
                style={{
                  background: "oklch(var(--card))",
                  border: `1.5px solid ${card.color}33`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{card.emoji}</span>
                  <span
                    className="text-xs font-bold font-display leading-tight"
                    style={{ color: card.color }}
                  >
                    {card.name}
                  </span>
                </div>
                <div className="space-y-1">
                  {card.stats.map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                    >
                      <span
                        className="text-xs"
                        style={{ color: "oklch(var(--muted-foreground))" }}
                      >
                        {label}
                      </span>
                      <span
                        className="text-sm font-bold font-display"
                        style={{ color: card.color }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {totalSolved === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-ocid="stats.empty_state"
            className="text-center py-12"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            <div className="text-5xl mb-4">🎯</div>
            <p className="font-semibold">{t("noStats")}</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
