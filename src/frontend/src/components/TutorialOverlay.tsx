import { AnimatePresence, motion } from "motion/react";
import React, { useState } from "react";
import { useLevelSystem } from "../hooks/useLevelSystem";
import { type Lang, useTranslation } from "../i18n";

const TUTORIAL_KEY = "sudokuverse_tutorial_done";

interface TutorialOverlayProps {
  lang: Lang;
}

const STEPS = [
  { key: "tutorialStep1" as const, emoji: "👆" },
  { key: "tutorialStep2" as const, emoji: "✏️" },
  { key: "tutorialStep3" as const, emoji: "💡" },
  { key: "tutorialStep4" as const, emoji: "⭐" },
];

export function TutorialOverlay({ lang }: TutorialOverlayProps) {
  const t = useTranslation(lang);
  const { currentLevel } = useLevelSystem();
  const hintsAvailable = 3 + Math.floor((currentLevel - 1) / 10);
  const [visible, setVisible] = useState<boolean>(() => {
    return !localStorage.getItem(TUTORIAL_KEY);
  });
  const [step, setStep] = useState(0);

  function dismiss() {
    localStorage.setItem(TUTORIAL_KEY, "1");
    setVisible(false);
  }

  function nextStep() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-ocid="tutorial.modal"
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.72)" }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 30 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative mx-5 rounded-3xl p-7 w-full max-w-sm text-center"
            style={{
              background: "oklch(var(--card))",
              border: "2px solid oklch(var(--primary) / 0.4)",
              boxShadow: "0 24px 64px oklch(0 0 0 / 0.5)",
            }}
          >
            {/* Header */}
            <div className="mb-6">
              <div className="text-4xl mb-3">🎮</div>
              <h2
                className="font-black font-display text-xl"
                style={{ color: "oklch(var(--foreground))" }}
              >
                {t("tutorialTitle")}
              </h2>
            </div>

            {/* Steps */}
            <div className="space-y-3 mb-4">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{
                    opacity: i <= step ? 1 : 0.3,
                    x: 0,
                    scale: i === step ? 1.02 : 1,
                  }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-left"
                  style={{
                    background:
                      i === step
                        ? "oklch(var(--primary) / 0.12)"
                        : "oklch(var(--muted))",
                    border: `1.5px solid ${i === step ? "oklch(var(--primary) / 0.4)" : "transparent"}`,
                  }}
                >
                  <span className="text-xl flex-shrink-0">{s.emoji}</span>
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color:
                        i === step
                          ? "oklch(var(--foreground))"
                          : "oklch(var(--muted-foreground))",
                    }}
                  >
                    {t(s.key)}
                    {/* Show hints count on hint step */}
                    {i === 2 && (
                      <span
                        className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: "oklch(0.72 0.19 52 / 0.2)",
                          color: "oklch(0.6 0.2 52)",
                        }}
                      >
                        {lang === "tr"
                          ? `${hintsAvailable} ipucu`
                          : `${hintsAvailable} hints`}
                      </span>
                    )}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Level info bar */}
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4 text-xs"
              style={{
                background: "oklch(0.57 0.22 220 / 0.1)",
                border: "1px solid oklch(0.57 0.22 220 / 0.25)",
                color: "oklch(0.52 0.22 220)",
              }}
            >
              <span className="font-black">Lv.{currentLevel}</span>
              <span style={{ color: "oklch(var(--muted-foreground))" }}>·</span>
              <span style={{ color: "oklch(var(--foreground))" }}>
                {lang === "tr"
                  ? `Şu an ${hintsAvailable} ipucu hakkın var. Her 10 seviyede +1 açılır.`
                  : `You have ${hintsAvailable} hints. +1 unlocks every 10 levels.`}
              </span>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-5">
              {STEPS.map((_, i) => (
                <div
                  key={`dot-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: static list
                    i
                  }`}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    background:
                      i <= step
                        ? "oklch(var(--primary))"
                        : "oklch(var(--border))",
                    transform: i === step ? "scale(1.3)" : "scale(1)",
                  }}
                />
              ))}
            </div>

            {/* CTA Button */}
            <motion.button
              type="button"
              data-ocid="tutorial.confirm_button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={nextStep}
              className="w-full rounded-2xl py-4 font-black font-display text-base"
              style={{
                background:
                  "linear-gradient(135deg, oklch(var(--primary)), oklch(var(--accent)))",
                color: "oklch(var(--primary-foreground))",
                boxShadow: "0 4px 16px oklch(var(--primary) / 0.35)",
              }}
            >
              {step < STEPS.length - 1 ? "→" : `🎮 ${t("tutorialPlay")}`}
            </motion.button>

            {/* Skip */}
            <button
              type="button"
              data-ocid="tutorial.close_button"
              onClick={dismiss}
              className="mt-3 text-xs underline opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {lang === "tr" ? "Atla" : lang === "ar" ? "تخطى" : "Skip"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
