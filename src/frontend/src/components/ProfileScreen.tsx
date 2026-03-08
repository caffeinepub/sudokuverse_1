import { motion } from "motion/react";
import React, { useState } from "react";
import type { PlayerProfile } from "../backend.d";
import { useLevelSystem } from "../hooks/useLevelSystem";
import { loadModeStats } from "../hooks/useModeStats";
import { useNickname } from "../hooks/useNickname";
import { getLastNDays, getPlayedDates, useStreak } from "../hooks/useStreak";
import type { Lang } from "../i18n";
import { XPBar, getRankInfo } from "./XPBar";

const STAR_TOTAL_KEY = "sudokuverse_star_total";
function getStarTotal(): number {
  return Number.parseInt(localStorage.getItem(STAR_TOTAL_KEY) ?? "0", 10);
}

interface ProfileScreenProps {
  lang: Lang;
  playerProfile: PlayerProfile | null;
  onBack: () => void;
  onNavigate: (screen: "badges" | "stats") => void;
}

const ALL_BADGES = [
  { id: "first_solve", emoji: "🌟" },
  { id: "hint_free_10", emoji: "🧠" },
  { id: "rank_5", emoji: "🎖" },
  { id: "perfect_solve", emoji: "💎" },
  { id: "speed_demon", emoji: "⚡" },
  { id: "weekly_champion", emoji: "🏆" },
  { id: "century", emoji: "💯" },
  { id: "master_difficulty", emoji: "🧩" },
  { id: "daily_streak", emoji: "🔥" },
  { id: "error_free_hard", emoji: "🎯" },
  { id: "speed_rush_champion", emoji: "⚡" },
  { id: "survival_master", emoji: "❤️" },
  { id: "chain_5", emoji: "⛓️" },
  { id: "boss_slayer", emoji: "🐉" },
  { id: "star_perfect", emoji: "⭐" },
];

export function ProfileScreen({
  lang,
  playerProfile,
  onBack,
  onNavigate,
}: ProfileScreenProps) {
  const { nickname, setNickname } = useNickname();
  const { currentLevel, levelProgress } = useLevelSystem();
  const { streak, longestStreak } = useStreak();
  const modeStats = loadModeStats();

  // Last 7 days streak history
  const last7Days = getLastNDays(7);
  const playedDates = getPlayedDates();

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(nickname);

  const xp = Number(playerProfile?.xp ?? 0);
  const totalSolved = Number(playerProfile?.puzzlesSolved ?? 0);
  const totalHints = Number(playerProfile?.hintsUsed ?? 0);
  const totalErrors = Number(playerProfile?.errorsMade ?? 0);
  const { rankName, nextRankName, xpToNext, isMax } = getRankInfo(xp, lang);

  const unlockedBadges = new Set(playerProfile?.badges ?? []);
  const unlockedBadgesList = ALL_BADGES.filter((b) => unlockedBadges.has(b.id));

  const totalModesPlayed = Object.values(modeStats).reduce(
    (sum, m) => sum + (m as { played: number }).played,
    0,
  );

  const totalStars = getStarTotal();

  const favoriteMode = (() => {
    // Start at -1 so only modes with played > 0 can win
    let best = { mode: "classic", count: -1 };
    for (const [mode, data] of Object.entries(modeStats)) {
      if ((data as { played: number }).played > best.count) {
        best = { mode, count: (data as { played: number }).played };
      }
    }
    return best;
  })();

  const MODE_LABELS: Record<string, string> = {
    classic: lang === "tr" ? "Klasik" : "Classic",
    speed_rush: lang === "tr" ? "Hız Modu" : "Speed Rush",
    survival: lang === "tr" ? "Hayatta Kalma" : "Survival",
    chain: lang === "tr" ? "Zincirleme" : "Chain",
    star_collector: lang === "tr" ? "Yıldız Avcısı" : "Star Collector",
    boss_battle: lang === "tr" ? "Boss Savaşı" : "Boss Battle",
    daily_tournament: lang === "tr" ? "Günlük Turnuva" : "Daily Tournament",
    blind: lang === "tr" ? "Kör Mod" : "Blind Mode",
    foggy: lang === "tr" ? "Sisli Mod" : "Foggy Mode",
    one_error: lang === "tr" ? "Sıfır Tolerans" : "Zero Tolerance",
  };
  const MODE_EMOJIS: Record<string, string> = {
    classic: "♟️",
    speed_rush: "⚡",
    survival: "❤️",
    chain: "⛓️",
    star_collector: "⭐",
    boss_battle: "🐉",
    daily_tournament: "🏆",
    blind: "👁️",
    foggy: "🌫️",
    one_error: "☠️",
  };

  function handleSaveNickname() {
    setNickname(nicknameInput);
    setEditingNickname(false);
  }

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      {/* Header */}
      <header
        className="flex items-center gap-4 px-5 pt-4 pb-3 sticky top-0 z-10"
        style={{
          background: "oklch(var(--background) / 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid oklch(var(--border))",
        }}
      >
        <button
          type="button"
          data-ocid="profile.back.button"
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
          👤 {lang === "tr" ? "Profil" : "Profile"}
        </h1>
      </header>

      <main
        className="flex-1 px-5 pb-8 space-y-4 overflow-y-auto"
        style={{ minHeight: 0 }}
      >
        {/* Avatar & Nickname */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            background: "oklch(var(--card))",
            border: "1.5px solid oklch(var(--border))",
            boxShadow: "0 4px 20px oklch(var(--primary) / 0.08)",
          }}
        >
          {/* Avatar circle */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-3xl font-black font-display"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.52 0.24 292), oklch(0.62 0.23 340), oklch(0.72 0.19 52))",
              color: "white",
            }}
          >
            {nickname ? nickname[0].toUpperCase() : "?"}
          </div>

          <div className="flex-1 min-w-0">
            {editingNickname ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  data-ocid="profile.nickname.input"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  maxLength={20}
                  className="flex-1 rounded-xl px-3 py-2 text-sm font-bold min-w-0"
                  style={{
                    background: "oklch(var(--muted))",
                    color: "oklch(var(--foreground))",
                    border: "1.5px solid oklch(var(--primary))",
                    outline: "none",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveNickname();
                    if (e.key === "Escape") setEditingNickname(false);
                  }}
                  ref={(el) => {
                    if (el) setTimeout(() => el.focus(), 50);
                  }}
                />
                <button
                  type="button"
                  data-ocid="profile.nickname.save_button"
                  onClick={handleSaveNickname}
                  className="rounded-xl px-3 py-2 text-xs font-bold text-white"
                  style={{ background: "oklch(0.52 0.24 292)" }}
                >
                  ✓
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className="font-black font-display text-lg truncate"
                  style={{ color: "oklch(var(--foreground))" }}
                >
                  {nickname || (lang === "tr" ? "İsimsiz Oyuncu" : "Anonymous")}
                </span>
                <button
                  type="button"
                  data-ocid="profile.nickname.edit_button"
                  onClick={() => {
                    setNicknameInput(nickname);
                    setEditingNickname(true);
                  }}
                  className="text-xs px-2 py-1 rounded-lg transition-all hover:scale-105"
                  style={{
                    background: "oklch(var(--secondary))",
                    color: "oklch(var(--primary))",
                  }}
                >
                  ✏️
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.57 0.22 220 / 0.15)",
                  color: "oklch(0.52 0.22 220)",
                }}
              >
                Lv.{currentLevel}
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.52 0.24 292), oklch(0.62 0.23 340))",
                }}
              >
                {rankName}
              </span>
            </div>
          </div>
        </motion.div>

        {/* XP Bar */}
        {playerProfile && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl p-4"
            style={{
              background: "oklch(var(--card))",
              border: "1.5px solid oklch(var(--border))",
            }}
          >
            <h3
              className="font-bold font-display text-sm mb-3"
              style={{ color: "oklch(var(--card-foreground))" }}
            >
              ⭐ XP & {lang === "tr" ? "Rütbe" : "Rank"}
            </h3>
            <XPBar xp={playerProfile.xp} lang={lang} />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span style={{ color: "oklch(var(--muted-foreground))" }}>
                {lang === "tr" ? "Toplam XP" : "Total XP"}:{" "}
                {xp.toLocaleString()}
              </span>
              {!isMax && (
                <span style={{ color: "oklch(var(--primary))" }}>
                  {lang === "tr" ? "Sonraki" : "Next"}: {nextRankName} (
                  {xpToNext.toLocaleString()} XP)
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Level & Streak progress */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          {/* Level progress */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: "oklch(var(--card))",
              border: "1.5px solid oklch(0.57 0.22 220 / 0.3)",
            }}
          >
            <div className="text-2xl mb-1">🎯</div>
            <div
              className="font-black font-display text-2xl"
              style={{ color: "oklch(0.52 0.22 220)" }}
            >
              {currentLevel}
            </div>
            <div
              className="text-xs mb-2"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {lang === "tr" ? "Seviye" : "Level"}
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "oklch(var(--muted))" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${levelProgress}%`,
                  background: "oklch(0.57 0.22 220)",
                }}
              />
            </div>
          </div>

          {/* Current Streak */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: "oklch(var(--card))",
              border: "1.5px solid oklch(0.72 0.19 52 / 0.3)",
            }}
          >
            <div className="text-2xl mb-1">🔥</div>
            <div
              className="font-black font-display text-2xl"
              style={{ color: "oklch(0.6 0.2 52)" }}
            >
              {streak}
            </div>
            <div
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {lang === "tr" ? "Günlük Seri" : "Day Streak"}
            </div>
          </div>

          {/* Longest Streak */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: "oklch(var(--card))",
              border: "1.5px solid oklch(0.72 0.19 52 / 0.2)",
            }}
          >
            <div className="text-2xl mb-1">🏅</div>
            <div
              className="font-black font-display text-2xl"
              style={{ color: "oklch(0.55 0.18 52)" }}
            >
              {longestStreak}
            </div>
            <div
              className="text-xs"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {lang === "tr" ? "En Uzun Seri" : "Best Streak"}
            </div>
          </div>
        </motion.div>

        {/* 7-Day Streak History */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl p-4"
          style={{
            background: "oklch(var(--card))",
            border: "1.5px solid oklch(0.72 0.19 52 / 0.25)",
          }}
        >
          <h3
            className="font-bold font-display text-sm mb-3"
            style={{ color: "oklch(var(--card-foreground))" }}
          >
            📆 {lang === "tr" ? "Son 7 Gün" : "Last 7 Days"}
          </h3>
          <div className="flex items-center justify-between gap-1">
            {last7Days.map((dateStr) => {
              const played = playedDates.has(dateStr);
              const dayD = new Date(`${dateStr}T00:00:00`);
              const dayLabel = dayD.toLocaleDateString(
                lang === "tr"
                  ? "tr-TR"
                  : lang === "ja"
                    ? "ja-JP"
                    : lang === "ko"
                      ? "ko-KR"
                      : lang === "zh"
                        ? "zh-CN"
                        : lang === "ar"
                          ? "ar-SA"
                          : "en-US",
                { weekday: "short" },
              );
              const isToday = dateStr === last7Days[6];
              return (
                <div
                  key={dateStr}
                  className="flex flex-col items-center gap-1 flex-1"
                >
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: played
                        ? "linear-gradient(135deg, oklch(0.72 0.19 52), oklch(0.62 0.19 42))"
                        : "oklch(var(--muted))",
                      border: isToday
                        ? "2px solid oklch(0.62 0.23 340)"
                        : "2px solid transparent",
                      color: played
                        ? "white"
                        : "oklch(var(--muted-foreground))",
                      boxShadow: played
                        ? "0 2px 8px oklch(0.72 0.19 52 / 0.4)"
                        : "none",
                    }}
                  >
                    {played ? "🔥" : "·"}
                  </motion.div>
                  <span
                    className="text-center font-semibold"
                    style={{
                      color: isToday
                        ? "oklch(0.62 0.23 340)"
                        : "oklch(var(--muted-foreground))",
                      fontSize: "9px",
                    }}
                  >
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            className="mt-3 text-center text-xs"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            {streak > 0
              ? lang === "tr"
                ? `${streak} günlük seri 🔥`
                : `${streak} day streak 🔥`
              : lang === "tr"
                ? "Bugün oyna ve seriyi başlat!"
                : "Play today to start a streak!"}
          </div>
        </motion.div>

        {/* Global stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-4"
          style={{
            background: "oklch(var(--card))",
            border: "1.5px solid oklch(var(--border))",
          }}
        >
          <h3
            className="font-bold font-display text-sm mb-3"
            style={{ color: "oklch(var(--card-foreground))" }}
          >
            📊 {lang === "tr" ? "Genel İstatistikler" : "Overall Stats"}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: lang === "tr" ? "Çözülen" : "Solved",
                value: totalSolved,
                emoji: "✅",
                color: "oklch(0.68 0.2 145)",
              },
              {
                label: lang === "tr" ? "İpucu" : "Hints",
                value: totalHints,
                emoji: "💡",
                color: "oklch(0.72 0.19 52)",
              },
              {
                label: lang === "tr" ? "Hata" : "Errors",
                value: totalErrors,
                emoji: "❌",
                color: "oklch(0.62 0.23 340)",
              },
              {
                label: lang === "tr" ? "Toplam Oyun" : "Total Plays",
                value: totalModesPlayed,
                emoji: "🎮",
                color: "oklch(0.57 0.22 220)",
              },
              {
                label: lang === "tr" ? "Rozet" : "Badges",
                value: unlockedBadgesList.length,
                emoji: "🏅",
                color: "oklch(0.52 0.24 292)",
              },
              {
                label: lang === "tr" ? "Mod" : "Modes",
                value: Object.values(modeStats).filter(
                  (m) => (m as { played: number }).played > 0,
                ).length,
                emoji: "🕹️",
                color: "oklch(0.42 0.2 160)",
              },
              {
                label: lang === "tr" ? "Yıldız" : "Stars",
                value: totalStars,
                emoji: "⭐",
                color: "oklch(0.65 0.2 70)",
              },
            ].map(({ label, value, emoji, color }) => (
              <div
                key={label}
                className="rounded-xl p-3 text-center"
                style={{ background: "oklch(var(--secondary))" }}
              >
                <div className="text-xl mb-0.5">{emoji}</div>
                <div
                  className="font-black font-display text-lg"
                  style={{ color }}
                >
                  {value}
                </div>
                <div
                  className="text-xs leading-tight"
                  style={{ color: "oklch(var(--muted-foreground))" }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Favorite mode */}
        {favoriteMode.count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.22 292 / 0.15), oklch(0.62 0.23 340 / 0.1))",
              border: "1.5px solid oklch(0.52 0.24 292 / 0.3)",
            }}
          >
            <div className="text-3xl">
              {MODE_EMOJIS[favoriteMode.mode] ?? "🎮"}
            </div>
            <div>
              <div
                className="text-xs font-semibold"
                style={{ color: "oklch(var(--muted-foreground))" }}
              >
                {lang === "tr" ? "Favori Mod" : "Favorite Mode"}
              </div>
              <div
                className="font-black font-display text-base"
                style={{ color: "oklch(var(--foreground))" }}
              >
                {MODE_LABELS[favoriteMode.mode] ?? favoriteMode.mode}
              </div>
              <div
                className="text-xs"
                style={{ color: "oklch(var(--primary))" }}
              >
                {favoriteMode.count} {lang === "tr" ? "oyun" : "plays"}
              </div>
            </div>
          </motion.div>
        )}

        {/* Unlocked badges preview */}
        {unlockedBadgesList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl p-4"
            style={{
              background: "oklch(var(--card))",
              border: "1.5px solid oklch(var(--border))",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className="font-bold font-display text-sm"
                style={{ color: "oklch(var(--card-foreground))" }}
              >
                🏅 {lang === "tr" ? "Kazanılan Rozetler" : "Earned Badges"}
              </h3>
              <button
                type="button"
                data-ocid="profile.badges.link"
                onClick={() => onNavigate("badges")}
                className="text-xs font-bold px-2 py-1 rounded-lg transition-all hover:scale-105"
                style={{
                  background: "oklch(var(--secondary))",
                  color: "oklch(var(--primary))",
                }}
              >
                {lang === "tr" ? "Tümü →" : "All →"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {unlockedBadgesList.map((b) => (
                <div
                  key={b.id}
                  className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl"
                  style={{ background: "oklch(var(--secondary))" }}
                  title={b.id}
                >
                  {b.emoji}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            type="button"
            data-ocid="profile.stats.link"
            onClick={() => onNavigate("stats")}
            className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-105"
            style={{
              background: "oklch(var(--card))",
              border: "1.5px solid oklch(var(--border))",
            }}
          >
            <span className="text-2xl">📊</span>
            <span
              className="font-bold text-sm"
              style={{ color: "oklch(var(--foreground))" }}
            >
              {lang === "tr" ? "İstatistikler" : "Statistics"}
            </span>
          </button>
          <button
            type="button"
            data-ocid="profile.badges_nav.link"
            onClick={() => onNavigate("badges")}
            className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:scale-105"
            style={{
              background: "oklch(var(--card))",
              border: "1.5px solid oklch(var(--border))",
            }}
          >
            <span className="text-2xl">🏅</span>
            <span
              className="font-bold text-sm"
              style={{ color: "oklch(var(--foreground))" }}
            >
              {lang === "tr" ? "Rozetler" : "Badges"}
            </span>
          </button>
        </motion.div>
      </main>
    </div>
  );
}
