import { AnimatePresence, motion } from "motion/react";
import React, { useState } from "react";
import { Difficulty, type PlayerProfile } from "../backend.d";
import { getLevelTier, useLevelSystem } from "../hooks/useLevelSystem";
import { type Lang, useTranslation } from "../i18n";
import type { GameMode } from "../types/gameMode";

interface ModeHubScreenProps {
  lang: Lang;
  playerProfile: PlayerProfile | null;
  onSelectMode: (mode: GameMode, difficulty: Difficulty) => void;
  onBack: () => void;
}

const DIFFICULTY_CONFIG = [
  {
    key: Difficulty.easy,
    emoji: "🟢",
    color: "oklch(0.68 0.2 145)",
    bg: "oklch(0.93 0.06 145)",
    label: { tr: "Kolay", en: "Easy" },
  },
  {
    key: Difficulty.medium,
    emoji: "🔵",
    color: "oklch(0.57 0.22 220)",
    bg: "oklch(0.93 0.06 220)",
    label: { tr: "Orta", en: "Medium" },
  },
  {
    key: Difficulty.hard,
    emoji: "🟠",
    color: "oklch(0.72 0.19 52)",
    bg: "oklch(0.95 0.07 52)",
    label: { tr: "Zor", en: "Hard" },
  },
  {
    key: Difficulty.expert,
    emoji: "🔴",
    color: "oklch(0.62 0.23 340)",
    bg: "oklch(0.95 0.06 340)",
    label: { tr: "Uzman", en: "Expert" },
  },
  {
    key: Difficulty.master,
    emoji: "🟣",
    color: "oklch(0.52 0.24 292)",
    bg: "oklch(0.93 0.06 292)",
    label: { tr: "Usta", en: "Master" },
  },
];

interface ModeConfig {
  id: GameMode;
  emoji: string;
  gradient: string;
  shadowColor: string;
  locked: boolean;
  tag?: { tr: string; en: string };
}

const MODE_CONFIGS: ModeConfig[] = [
  {
    id: "classic",
    emoji: "♟️",
    gradient:
      "linear-gradient(135deg, oklch(0.42 0.22 292), oklch(0.55 0.24 280))",
    shadowColor: "oklch(0.52 0.24 292 / 0.4)",
    locked: false,
  },
  {
    id: "speed_rush",
    emoji: "⚡",
    gradient:
      "linear-gradient(135deg, oklch(0.65 0.2 52), oklch(0.55 0.22 30))",
    shadowColor: "oklch(0.72 0.19 52 / 0.4)",
    locked: false,
    tag: { tr: "HOT", en: "HOT" },
  },
  {
    id: "survival",
    emoji: "❤️",
    gradient:
      "linear-gradient(135deg, oklch(0.5 0.23 0), oklch(0.58 0.22 340))",
    shadowColor: "oklch(0.62 0.23 340 / 0.4)",
    locked: false,
  },
  {
    id: "daily_tournament",
    emoji: "🏆",
    gradient: "linear-gradient(135deg, oklch(0.6 0.18 80), oklch(0.7 0.16 60))",
    shadowColor: "oklch(0.7 0.18 80 / 0.4)",
    locked: false,
    tag: { tr: "GÜNLÜK", en: "DAILY" },
  },
  {
    id: "chain",
    emoji: "⛓️",
    gradient:
      "linear-gradient(135deg, oklch(0.42 0.2 160), oklch(0.52 0.2 175))",
    shadowColor: "oklch(0.52 0.2 160 / 0.4)",
    locked: false,
  },
  {
    id: "blind",
    emoji: "👁️",
    gradient:
      "linear-gradient(135deg, oklch(0.2 0.12 270), oklch(0.32 0.18 285))",
    shadowColor: "oklch(0.3 0.15 275 / 0.5)",
    locked: false,
    tag: { tr: "ZOR", en: "HARD" },
  },
  {
    id: "star_collector",
    emoji: "⭐",
    gradient:
      "linear-gradient(135deg, oklch(0.45 0.2 300), oklch(0.6 0.22 340))",
    shadowColor: "oklch(0.52 0.22 320 / 0.4)",
    locked: false,
  },
  {
    id: "boss_battle",
    emoji: "🐉",
    gradient: "linear-gradient(135deg, oklch(0.12 0.06 20), oklch(0.3 0.2 20))",
    shadowColor: "oklch(0.4 0.2 20 / 0.6)",
    locked: false,
    tag: { tr: "EFSANE", en: "EPIC" },
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 22 },
  },
};

export function ModeHubScreen({
  lang,
  playerProfile: _playerProfile,
  onSelectMode,
  onBack,
}: ModeHubScreenProps) {
  const t = useTranslation(lang);
  const { currentLevel } = useLevelSystem();
  const recommendedDifficulty = getLevelTier(currentLevel);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(
    recommendedDifficulty,
  );
  const [hoveredMode, setHoveredMode] = useState<GameMode | null>(null);

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      {/* Background orbs */}
      <div
        className="fixed top-0 right-0 w-72 h-72 rounded-full opacity-15 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(var(--primary)), transparent 70%)",
          transform: "translate(30%, -30%)",
        }}
      />
      <div
        className="fixed bottom-0 left-0 w-64 h-64 rounded-full opacity-12 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(var(--accent)), transparent 70%)",
          transform: "translate(-30%, 30%)",
        }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-20 px-5 pt-3 pb-2"
        style={{
          background: "oklch(var(--background) / 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid oklch(var(--border))",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <motion.button
            type="button"
            data-ocid="modehub.back.button"
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-xl px-3 py-2 font-semibold text-sm transition-all"
            style={{
              background: "oklch(var(--secondary))",
              color: "oklch(var(--primary))",
            }}
          >
            ← {t("back")}
          </motion.button>
          <h1
            className="text-2xl font-black font-display"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.52 0.24 292), oklch(0.62 0.23 340), oklch(0.72 0.19 52))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            🎮 {t("modesTitle")}
          </h1>
        </div>

        {/* Level guidance banner */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{
            background: "oklch(0.57 0.22 220 / 0.12)",
            border: "1.5px solid oklch(0.57 0.22 220 / 0.3)",
            color: "oklch(0.52 0.22 220)",
          }}
        >
          <span className="font-black">Lv.{currentLevel}</span>
          <span style={{ color: "oklch(var(--muted-foreground))" }}>·</span>
          <span style={{ color: "oklch(var(--foreground))" }}>
            {lang === "tr"
              ? `Önerilen seviye: ${DIFFICULTY_CONFIG.find((d) => d.key === recommendedDifficulty)?.label.tr ?? ""}`
              : `Recommended: ${DIFFICULTY_CONFIG.find((d) => d.key === recommendedDifficulty)?.label.en ?? ""}`}
          </span>
        </motion.div>

        {/* Difficulty selector */}
        <div className="grid grid-cols-5 gap-1.5">
          {DIFFICULTY_CONFIG.map(({ key, emoji, color, bg, label }) => {
            const isSelected = selectedDifficulty === key;
            const isRecommended = key === recommendedDifficulty;
            return (
              <motion.button
                type="button"
                key={key}
                data-ocid={`modehub.difficulty.${key}.toggle`}
                onClick={() => setSelectedDifficulty(key)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                className="relative flex flex-col items-center gap-0.5 rounded-xl p-2 transition-all"
                style={{
                  background: isSelected ? color : bg,
                  color: isSelected ? "oklch(0.98 0.005 0)" : color,
                  border: `2px solid ${isSelected ? color : isRecommended ? color : "transparent"}`,
                  boxShadow: isSelected ? `0 4px 12px ${color}44` : "none",
                }}
              >
                {isRecommended && !isSelected && (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                    style={{
                      background: color,
                      border: "1.5px solid oklch(var(--background))",
                    }}
                  />
                )}
                <span className="text-base">{emoji}</span>
                <span className="text-xs font-bold leading-none">
                  {label[lang]}
                </span>
              </motion.button>
            );
          })}
        </div>
      </header>

      {/* Mode Grid */}
      <main
        className="flex-1 px-4 py-3 overflow-y-auto pb-6"
        style={{ minHeight: 0 }}
      >
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {MODE_CONFIGS.map((mode) => {
            const nameKey = `mode_${mode.id}` as Parameters<typeof t>[0];
            const descKey = `mode_${mode.id}_desc` as Parameters<typeof t>[0];
            const isHovered = hoveredMode === mode.id;

            return (
              <motion.button
                type="button"
                key={mode.id}
                data-ocid={`modehub.${mode.id}.button`}
                variants={cardVariants}
                onClick={() => onSelectMode(mode.id, selectedDifficulty)}
                onHoverStart={() => setHoveredMode(mode.id)}
                onHoverEnd={() => setHoveredMode(null)}
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.96 }}
                className="relative flex flex-col items-start text-left rounded-2xl p-3 overflow-hidden"
                style={{
                  background: mode.gradient,
                  boxShadow: isHovered
                    ? `0 12px 28px ${mode.shadowColor}, 0 4px 8px oklch(0 0 0 / 0.15)`
                    : `0 4px 16px ${mode.shadowColor}`,
                  minHeight: "110px",
                  transition: "box-shadow 0.2s ease",
                }}
              >
                {/* Shine overlay */}
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(1 0 0 / 0.1) 0%, transparent 60%)",
                  }}
                />

                {/* Tag */}
                <AnimatePresence>
                  {mode.tag && (
                    <div
                      className="absolute top-2.5 right-2.5 text-xs font-black px-2 py-0.5 rounded-full"
                      style={{
                        background: "oklch(1 0 0 / 0.2)",
                        color: "oklch(1 0 0 / 0.95)",
                        letterSpacing: "0.06em",
                        fontSize: "0.6rem",
                      }}
                    >
                      {mode.tag[lang]}
                    </div>
                  )}
                </AnimatePresence>

                {/* Emoji */}
                <motion.div
                  className="text-3xl mb-1.5 leading-none"
                  animate={{ scale: isHovered ? 1.15 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {mode.emoji}
                </motion.div>

                {/* Name */}
                <div
                  className="font-black font-display text-base leading-tight mb-1"
                  style={{ color: "oklch(0.98 0.005 240)" }}
                >
                  {t(nameKey)}
                </div>

                {/* Description */}
                <div
                  className="text-xs leading-snug"
                  style={{ color: "oklch(0.9 0.02 240 / 0.8)" }}
                >
                  {t(descKey)}
                </div>

                {/* Bottom arrow indicator */}
                <motion.div
                  className="absolute bottom-3 right-3"
                  animate={{
                    x: isHovered ? 3 : 0,
                    opacity: isHovered ? 1 : 0.5,
                  }}
                  style={{ color: "oklch(1 0 0 / 0.7)", fontSize: "1rem" }}
                >
                  →
                </motion.div>
              </motion.button>
            );
          })}
        </motion.div>
      </main>
    </div>
  );
}
