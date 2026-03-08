import { motion } from "motion/react";
import React, { useMemo, useState } from "react";
import type { PlayerProfile } from "../backend.d";
import { buildFilteredStats, loadModeStats } from "../hooks/useModeStats";
import { type Lang, useTranslation } from "../i18n";

// ---- Mini bar chart for mode stats ----
function MiniBarChart({
  values,
  labels,
  color,
  max,
}: {
  values: number[];
  labels: string[];
  color: string;
  max?: number;
}) {
  const effectiveMax = max ?? Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {values.map((v, i) => {
        const pct = Math.min(1, v / effectiveMax);
        return (
          <div
            key={labels[i]}
            className="flex flex-col items-center flex-1 gap-0.5"
          >
            <span
              className="text-xs font-bold"
              style={{ color, fontSize: "9px" }}
            >
              {v > 0 ? v : ""}
            </span>
            <div
              className="w-full rounded-t-sm transition-all duration-700"
              style={{
                height: `${Math.max(pct * 48, v > 0 ? 4 : 0)}px`,
                background: v > 0 ? color : "oklch(var(--border))",
                opacity: v > 0 ? 1 : 0.3,
              }}
            />
            <span
              className="text-center leading-tight"
              style={{
                color: "oklch(var(--muted-foreground))",
                fontSize: "8px",
              }}
            >
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---- Donut chart for win rate ----
function WinRateDonut({
  won,
  played,
  color,
  size = 60,
}: {
  won: number;
  played: number;
  color: string;
  size?: number;
}) {
  const pct = played > 0 ? won / played : 0;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(var(--border))"
          strokeWidth={6}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-black text-xs" style={{ color }}>
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  );
}

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

type StatsFilter = "today" | "week" | "all";

export function StatsScreen({ lang, playerProfile, onBack }: StatsScreenProps) {
  const t = useTranslation(lang);
  const [filter, setFilter] = useState<StatsFilter>("all");
  const modeStats = useMemo(() => buildFilteredStats(filter), [filter]);
  void loadModeStats; // kept for type reference

  const stats = playerProfile?.stats;

  // For "all" filter, use backend cumulative data (most accurate)
  // For "today"/"week" filters, sum up from game log via modeStats
  const totalSolved = useMemo(() => {
    if (filter === "all") return Number(playerProfile?.puzzlesSolved ?? 0);
    // Sum played across all modes from filtered log
    return (
      modeStats.classic.played +
      modeStats.speed_rush.played +
      modeStats.survival.played +
      modeStats.chain.played +
      modeStats.star_collector.played +
      modeStats.boss_battle.played +
      modeStats.daily_tournament.played +
      modeStats.blind.played +
      modeStats.foggy.played +
      modeStats.one_error.played
    );
  }, [filter, playerProfile, modeStats]);

  const totalHints = Number(
    filter === "all" ? (playerProfile?.hintsUsed ?? 0) : 0,
  );
  const totalErrors = Number(
    filter === "all" ? (playerProfile?.errorsMade ?? 0) : 0,
  );

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

  // Chart data: played count per mode
  const modePlayedData = useMemo(
    () => ({
      values: [
        modeStats.classic.played,
        modeStats.speed_rush.played,
        modeStats.survival.played,
        modeStats.chain.played,
        modeStats.star_collector.played,
        modeStats.boss_battle.played,
        modeStats.blind.played,
        modeStats.foggy.played,
        modeStats.one_error.played,
      ],
      labels: ["♟️", "⚡", "❤️", "⛓️", "⭐", "🐉", "👁️", "🌫️", "☠️"],
    }),
    [modeStats],
  );

  // Win rate data for modes that have won/played
  const winRateModes = useMemo(
    () =>
      [
        {
          name: t("mode_classic"),
          won: modeStats.classic.won,
          played: modeStats.classic.played,
          color: "oklch(0.57 0.22 220)",
        },
        {
          name: t("mode_survival"),
          won: modeStats.survival.won,
          played: modeStats.survival.played,
          color: "oklch(0.5 0.23 0)",
        },
        {
          name: "Boss",
          won: modeStats.boss_battle.won,
          played: modeStats.boss_battle.played,
          color: "oklch(0.45 0.15 20)",
        },
        {
          name: t("mode_blind"),
          won: modeStats.blind.won,
          played: modeStats.blind.played,
          color: "oklch(0.3 0.15 275)",
        },
        {
          name: t("mode_foggy"),
          won: modeStats.foggy.won,
          played: modeStats.foggy.played,
          color: "oklch(0.42 0.14 250)",
        },
        {
          name: t("mode_one_error"),
          won: modeStats.one_error.won,
          played: modeStats.one_error.played,
          color: "oklch(0.4 0.18 350)",
        },
      ].filter((m) => m.played > 0),
    [modeStats, t],
  );

  const playedLabel =
    lang === "tr"
      ? "Oynandı"
      : lang === "ar"
        ? "مُلعب"
        : lang === "hi"
          ? "खेले"
          : lang === "ja"
            ? "プレイ"
            : lang === "ko"
              ? "플레이"
              : lang === "zh"
                ? "已玩"
                : lang === "ru"
                  ? "Сыграно"
                  : lang === "de"
                    ? "Gespielt"
                    : lang === "fr"
                      ? "Joué"
                      : lang === "es"
                        ? "Jugado"
                        : lang === "it"
                          ? "Giocato"
                          : lang === "pt"
                            ? "Jogado"
                            : "Played";
  const wonLabel =
    lang === "tr"
      ? "Kazanıldı"
      : lang === "ar"
        ? "فاز"
        : lang === "hi"
          ? "जीते"
          : lang === "ja"
            ? "勝利"
            : lang === "ko"
              ? "승리"
              : lang === "zh"
                ? "获胜"
                : lang === "ru"
                  ? "Побед"
                  : lang === "de"
                    ? "Gewonnen"
                    : lang === "fr"
                      ? "Gagné"
                      : lang === "es"
                        ? "Ganado"
                        : lang === "it"
                          ? "Vinto"
                          : lang === "pt"
                            ? "Vencido"
                            : "Won";

  const modeCards = [
    {
      id: "classic",
      emoji: "♟️",
      name: t("mode_classic"),
      stats: [
        { label: playedLabel, value: modeStats.classic.played },
        { label: wonLabel, value: modeStats.classic.won },
      ],
      color: "oklch(0.57 0.22 220)",
    },
    {
      id: "speed_rush",
      emoji: "⚡",
      name: t("mode_speed_rush"),
      stats: [
        { label: playedLabel, value: modeStats.speed_rush.played },
        {
          label: lang === "tr" ? "En İyi Combo" : "Best Combo",
          value: modeStats.speed_rush.bestCombo,
        },
        { label: wonLabel, value: modeStats.speed_rush.won },
      ],
      color: "oklch(0.72 0.19 52)",
    },
    {
      id: "survival",
      emoji: "❤️",
      name: t("mode_survival"),
      stats: [
        { label: playedLabel, value: modeStats.survival.played },
        { label: wonLabel, value: modeStats.survival.won },
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
      name: t("mode_chain"),
      stats: [
        { label: playedLabel, value: modeStats.chain.played },
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
      name: t("mode_star_collector"),
      stats: [
        { label: playedLabel, value: modeStats.star_collector.played },
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
      name: t("mode_boss_battle"),
      stats: [
        { label: playedLabel, value: modeStats.boss_battle.played },
        { label: wonLabel, value: modeStats.boss_battle.won },
      ],
      color: "oklch(0.45 0.15 20)",
    },
    {
      id: "daily_tournament",
      emoji: "🏆",
      name: t("mode_daily_tournament"),
      stats: [{ label: playedLabel, value: modeStats.daily_tournament.played }],
      color: "oklch(0.6 0.18 80)",
    },
    {
      id: "blind",
      emoji: "👁️",
      name: t("mode_blind"),
      stats: [
        { label: playedLabel, value: modeStats.blind.played },
        { label: wonLabel, value: modeStats.blind.won },
      ],
      color: "oklch(0.3 0.15 275)",
    },
    {
      id: "foggy",
      emoji: "🌫️",
      name: t("mode_foggy"),
      stats: [
        { label: playedLabel, value: modeStats.foggy.played },
        { label: wonLabel, value: modeStats.foggy.won },
      ],
      color: "oklch(0.42 0.14 250)",
    },
    {
      id: "one_error",
      emoji: "☠️",
      name: t("mode_one_error"),
      stats: [
        { label: playedLabel, value: modeStats.one_error.played },
        { label: wonLabel, value: modeStats.one_error.won },
      ],
      color: "oklch(0.4 0.18 350)",
    },
  ];

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        overflowY: "auto",
        background: "transparent",
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
        {/* Time filter tabs */}
        <div className="flex gap-2">
          {(["today", "week", "all"] as StatsFilter[]).map((f) => {
            const label =
              f === "today"
                ? t("statsFilterToday")
                : f === "week"
                  ? t("statsFilterWeek")
                  : t("statsFilterAll");
            return (
              <button
                key={f}
                type="button"
                data-ocid={`stats.filter.${f}.tab`}
                onClick={() => setFilter(f)}
                className="flex-1 rounded-xl py-2 text-xs font-bold transition-all"
                style={{
                  background:
                    filter === f
                      ? "oklch(var(--primary))"
                      : "oklch(var(--card))",
                  color:
                    filter === f
                      ? "oklch(var(--primary-foreground))"
                      : "oklch(var(--muted-foreground))",
                  border: `1.5px solid ${filter === f ? "oklch(var(--primary))" : "oklch(var(--border))"}`,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {filter !== "all" && (
          <p
            className="text-xs text-center"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            {filter === "today"
              ? lang === "tr"
                ? "Bugünkü veriler gösteriliyor"
                : "Showing today's data"
              : lang === "tr"
                ? "Bu haftaki veriler gösteriliyor"
                : "Showing this week's data"}
          </p>
        )}

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

        {/* Mod Oynanma Grafiği */}
        {modePlayedData.values.some((v) => v > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
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
              📊 {lang === "tr" ? "Mod Oynanma Grafiği" : "Plays per Mode"}
            </h2>
            <MiniBarChart
              values={modePlayedData.values}
              labels={modePlayedData.labels}
              color="oklch(var(--primary))"
            />
          </motion.div>
        )}

        {/* Win Rate Donut Charts */}
        {winRateModes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
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
              🏆 {lang === "tr" ? "Kazanma Oranı" : "Win Rate"}
            </h2>
            <div className="flex flex-wrap gap-4 justify-around">
              {winRateModes.map((m) => (
                <div key={m.name} className="flex flex-col items-center gap-1">
                  <WinRateDonut
                    won={m.won}
                    played={m.played}
                    color={m.color}
                    size={56}
                  />
                  <span
                    className="text-xs font-semibold text-center"
                    style={{
                      color: "oklch(var(--muted-foreground))",
                      maxWidth: "56px",
                      lineHeight: "1.2",
                    }}
                  >
                    {m.name}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: m.color }}
                  >
                    {m.won}/{m.played}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

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
