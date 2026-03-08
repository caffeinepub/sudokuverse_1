import { motion } from "motion/react";
import React, { useState } from "react";
import type { PlayerProfile } from "../backend.d";
import { type Lang, useTranslation } from "../i18n";

const BADGE_DATES_KEY = "sudokuverse_badge_dates_v1";

/** Check if a badge has been unlocked locally */
export function isBadgeLocallyUnlocked(badgeId: string): boolean {
  try {
    const stored = localStorage.getItem(BADGE_DATES_KEY);
    if (stored) {
      const dates = JSON.parse(stored) as Record<string, string>;
      return !!dates[badgeId];
    }
  } catch (_) {
    /* ignore */
  }
  return false;
}

/** Record the date a badge was unlocked */
export function recordBadgeUnlockDate(badgeId: string): void {
  try {
    const stored = localStorage.getItem(BADGE_DATES_KEY);
    const dates: Record<string, string> = stored
      ? (JSON.parse(stored) as Record<string, string>)
      : {};
    if (!dates[badgeId]) {
      dates[badgeId] = new Date().toISOString().split("T")[0];
      localStorage.setItem(BADGE_DATES_KEY, JSON.stringify(dates));
    }
  } catch (_) {
    /* ignore */
  }
}

function getBadgeDates(): Record<string, string> {
  try {
    const stored = localStorage.getItem(BADGE_DATES_KEY);
    return stored ? (JSON.parse(stored) as Record<string, string>) : {};
  } catch (_) {
    return {};
  }
}

interface BadgesScreenProps {
  lang: Lang;
  playerProfile: PlayerProfile | null;
  onBack: () => void;
}

const ALL_BADGES = [
  {
    id: "first_solve",
    emoji: "🌟",
    color: "oklch(0.72 0.19 52)",
    bg: "oklch(0.95 0.07 52)",
  },
  {
    id: "hint_free_10",
    emoji: "🧠",
    color: "oklch(0.57 0.22 220)",
    bg: "oklch(0.93 0.06 220)",
  },
  {
    id: "rank_5",
    emoji: "🎖",
    color: "oklch(0.52 0.24 292)",
    bg: "oklch(0.93 0.06 292)",
  },
  {
    id: "perfect_solve",
    emoji: "💎",
    color: "oklch(0.62 0.23 340)",
    bg: "oklch(0.95 0.06 340)",
  },
  {
    id: "speed_demon",
    emoji: "⚡",
    color: "oklch(0.72 0.19 52)",
    bg: "oklch(0.95 0.07 52)",
  },
  {
    id: "weekly_champion",
    emoji: "🏆",
    color: "oklch(0.68 0.2 145)",
    bg: "oklch(0.93 0.06 145)",
  },
  {
    id: "century",
    emoji: "💯",
    color: "oklch(0.62 0.23 340)",
    bg: "oklch(0.95 0.06 340)",
  },
  {
    id: "master_difficulty",
    emoji: "🧩",
    color: "oklch(0.52 0.24 292)",
    bg: "oklch(0.93 0.06 292)",
  },
  {
    id: "daily_streak",
    emoji: "🔥",
    color: "oklch(0.72 0.19 52)",
    bg: "oklch(0.95 0.07 52)",
  },
  {
    id: "error_free_hard",
    emoji: "🎯",
    color: "oklch(0.57 0.22 220)",
    bg: "oklch(0.93 0.06 220)",
  },
  {
    id: "speed_rush_champion",
    emoji: "⚡",
    color: "oklch(0.65 0.2 52)",
    bg: "oklch(0.95 0.07 52)",
  },
  {
    id: "survival_master",
    emoji: "❤️",
    color: "oklch(0.5 0.23 0)",
    bg: "oklch(0.95 0.06 0)",
  },
  {
    id: "chain_5",
    emoji: "⛓️",
    color: "oklch(0.42 0.2 160)",
    bg: "oklch(0.93 0.06 160)",
  },
  {
    id: "boss_slayer",
    emoji: "🐉",
    color: "oklch(0.45 0.15 20)",
    bg: "oklch(0.92 0.04 20)",
  },
  {
    id: "star_perfect",
    emoji: "⭐",
    color: "oklch(0.52 0.22 300)",
    bg: "oklch(0.93 0.06 300)",
  },
];

type BadgeFilter = "all" | "unlocked" | "locked";

export function BadgesScreen({
  lang,
  playerProfile,
  onBack,
}: BadgesScreenProps) {
  const t = useTranslation(lang);
  const unlockedBadges = new Set(playerProfile?.badges ?? []);
  const unlockedCount = unlockedBadges.size;
  const badgeDates = getBadgeDates();
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>("all");

  const filterLabels: Record<BadgeFilter, string> = {
    all: lang === "tr" ? "Tümü" : "All",
    unlocked: lang === "tr" ? "Açık" : "Unlocked",
    locked: lang === "tr" ? "Kilitli" : "Locked",
  };

  const filteredBadges = ALL_BADGES.filter(({ id }) => {
    const isUnlocked = unlockedBadges.has(id);
    if (badgeFilter === "unlocked") return isUnlocked;
    if (badgeFilter === "locked") return !isUnlocked;
    return true;
  });

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
          data-ocid="badges.back.button"
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
          🏅 {t("badges")}
        </h1>
      </header>

      {/* Progress bar */}
      <div className="px-6 mb-3">
        <div className="flex justify-between text-sm mb-1.5">
          <span style={{ color: "oklch(var(--muted-foreground))" }}>
            {unlockedCount}/{ALL_BADGES.length} {t("unlocked")}
          </span>
          <span
            className="font-bold"
            style={{ color: "oklch(var(--primary))" }}
          >
            {Math.round((unlockedCount / ALL_BADGES.length) * 100)}%
          </span>
        </div>
        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ background: "oklch(var(--muted))" }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${(unlockedCount / ALL_BADGES.length) * 100}%`,
              background:
                "linear-gradient(90deg, oklch(var(--primary)), oklch(var(--accent)))",
            }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-6 mb-3">
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: "oklch(var(--muted))" }}
        >
          {(["all", "unlocked", "locked"] as BadgeFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              data-ocid="badges.filter.tab"
              onClick={() => setBadgeFilter(filter)}
              className="flex-1 rounded-xl py-1.5 text-xs font-bold transition-all"
              style={{
                background:
                  badgeFilter === filter
                    ? "oklch(var(--primary))"
                    : "transparent",
                color:
                  badgeFilter === filter
                    ? "oklch(var(--primary-foreground))"
                    : "oklch(var(--muted-foreground))",
              }}
            >
              {filterLabels[filter]}
              {filter === "unlocked" && (
                <span className="ml-1 opacity-70">({unlockedCount})</span>
              )}
              {filter === "locked" && (
                <span className="ml-1 opacity-70">
                  ({ALL_BADGES.length - unlockedCount})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main
        data-ocid="badges.panel"
        className="flex-1 px-6 pb-8 overflow-y-auto"
      >
        <div className="grid grid-cols-2 gap-3">
          {filteredBadges.map(({ id, emoji, color }, i) => {
            const isUnlocked = unlockedBadges.has(id);
            const nameKey = `badge_${id}` as Parameters<typeof t>[0];
            const descKey = `badge_${id}_desc` as Parameters<typeof t>[0];

            return (
              <motion.div
                key={id}
                data-ocid={`badges.item.${i + 1}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl p-4 transition-all ${isUnlocked ? "badge-unlocked" : ""}`}
                style={{
                  background: isUnlocked
                    ? "oklch(var(--card))"
                    : "oklch(var(--muted))",
                  border: `1.5px solid ${isUnlocked ? `${color}55` : "oklch(var(--border))"}`,
                  opacity: isUnlocked ? 1 : 0.55,
                  filter: isUnlocked ? "none" : "grayscale(0.8)",
                }}
              >
                <div className="text-4xl mb-2">{emoji}</div>
                <div
                  className="font-bold text-sm font-display leading-tight"
                  style={{
                    color: isUnlocked
                      ? color
                      : "oklch(var(--muted-foreground))",
                  }}
                >
                  {t(nameKey)}
                </div>
                <div
                  className="text-xs mt-1 leading-tight"
                  style={{ color: "oklch(var(--muted-foreground))" }}
                >
                  {t(descKey)}
                </div>
                {isUnlocked && (
                  <div className="mt-2">
                    <div
                      className="text-xs font-bold flex items-center gap-1"
                      style={{ color }}
                    >
                      ✅ {t("unlocked")}
                    </div>
                    {badgeDates[id] && (
                      <div
                        className="text-xs mt-0.5 opacity-70"
                        style={{ color: "oklch(var(--muted-foreground))" }}
                      >
                        📅{" "}
                        {new Date(badgeDates[id]).toLocaleDateString(
                          lang === "tr"
                            ? "tr-TR"
                            : lang === "de"
                              ? "de-DE"
                              : lang === "fr"
                                ? "fr-FR"
                                : lang === "es"
                                  ? "es-ES"
                                  : lang === "it"
                                    ? "it-IT"
                                    : lang === "pt"
                                      ? "pt-BR"
                                      : lang === "ru"
                                        ? "ru-RU"
                                        : lang === "ja"
                                          ? "ja-JP"
                                          : lang === "ko"
                                            ? "ko-KR"
                                            : lang === "zh"
                                              ? "zh-CN"
                                              : lang === "ar"
                                                ? "ar-SA"
                                                : lang === "hi"
                                                  ? "hi-IN"
                                                  : "en-US",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!isUnlocked && (
                  <div
                    className="mt-2 rounded-lg px-2 py-1.5"
                    style={{
                      background: "oklch(var(--secondary))",
                      border: "1px dashed oklch(var(--border))",
                    }}
                  >
                    <div
                      className="text-xs font-bold mb-0.5 flex items-center gap-1"
                      style={{ color: "oklch(var(--muted-foreground))" }}
                    >
                      🔒 {t("locked")}
                    </div>
                    <div
                      className="text-xs leading-tight"
                      style={{
                        color: "oklch(var(--muted-foreground))",
                        opacity: 0.8,
                      }}
                    >
                      {lang === "tr" ? "Nasıl açılır: " : "How to unlock: "}
                      {t(descKey)}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
