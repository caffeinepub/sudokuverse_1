import { Toaster } from "@/components/ui/sonner";
import { AnimatePresence, motion } from "motion/react";
import React, { useState, useEffect } from "react";
import { Difficulty } from "./backend.d";
import { BadgesScreen } from "./components/BadgesScreen";
import { GameScreen } from "./components/GameScreen";
import { HomeScreen } from "./components/HomeScreen";
import { ModeHubScreen } from "./components/ModeHubScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { StatsScreen } from "./components/StatsScreen";
import { ThemePicker } from "./components/ThemePicker";
import { SoundProvider, useSound } from "./context/SoundContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { usePlayerData } from "./hooks/usePlayerData";
import type { Lang } from "./i18n";
import type { GameMode } from "./types/gameMode";

const LANG_KEY = "sudokuverse_lang";

type Screen = "home" | "modeHub" | "game" | "stats" | "badges" | "settings";

/** Full-screen atmospheric background layer */
function AtmosphericBackground() {
  const { backgroundImage, backgroundOverlay, atmosphericClass } = useTheme();

  return (
    <>
      {/* Fixed background behind everything - covers the full viewport */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: -2 }}
        aria-hidden="true"
      >
        {backgroundImage ? (
          <motion.div
            key={backgroundImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0"
            style={{
              backgroundImage: `url("${backgroundImage}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "oklch(var(--background))" }}
          />
        )}
        {/* Color overlay for readability */}
        {backgroundImage && (
          <div
            className="absolute inset-0"
            style={{ background: backgroundOverlay }}
          />
        )}
      </div>
      {/* Atmospheric effects layer */}
      {atmosphericClass && (
        <div
          className={`${atmosphericClass} fixed inset-0 pointer-events-none`}
          style={{ zIndex: -1 }}
          aria-hidden="true"
        />
      )}
    </>
  );
}

function AppInner() {
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(
    Difficulty.easy,
  );
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem(LANG_KEY);
    return (stored as Lang) || "tr";
  });
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  const { data: playerProfile, isLoading } = usePlayerData();
  const { startThemeMusic, musicEnabled } = useSound();
  const { theme } = useTheme();

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  // Start theme music when theme changes (and music is enabled)
  useEffect(() => {
    if (musicEnabled) {
      startThemeMusic(theme);
    }
  }, [theme, musicEnabled, startThemeMusic]);

  const handleOpenModes = () => setScreen("modeHub");

  const handleSelectMode = (mode: GameMode, difficulty: Difficulty) => {
    setGameMode(mode);
    setSelectedDifficulty(difficulty);
    setScreen("game");
  };

  const handleNavigate = (target: "stats" | "badges" | "settings") => {
    setScreen(target);
  };

  const handleBack = () => setScreen("home");
  const handleModeHubBack = () => setScreen("home");

  const handleOpenSettings = () => setScreen("settings");

  const pageVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <div
      className="relative font-body"
      style={{
        height: "100dvh",
        maxWidth: "480px",
        margin: "0 auto",
        overflow: "hidden",
        touchAction: "pan-y",
      }}
    >
      {/* Atmospheric background (fixed, full-viewport) */}
      <AtmosphericBackground />

      {/* Theme Picker Modal */}
      <ThemePicker
        lang={lang}
        open={themePickerOpen}
        onOpenChange={setThemePickerOpen}
      />

      <AnimatePresence mode="wait">
        {screen === "home" && (
          <motion.div
            key="home"
            {...pageVariants}
            transition={{ duration: 0.2 }}
          >
            <HomeScreen
              lang={lang}
              playerProfile={playerProfile ?? null}
              isLoading={isLoading}
              onOpenModes={handleOpenModes}
              onNavigate={handleNavigate}
              onOpenThemePicker={() => setThemePickerOpen(true)}
              onOpenSettings={handleOpenSettings}
            />
          </motion.div>
        )}

        {screen === "modeHub" && (
          <motion.div
            key="modeHub"
            {...pageVariants}
            transition={{ duration: 0.2 }}
          >
            <ModeHubScreen
              lang={lang}
              playerProfile={playerProfile ?? null}
              onSelectMode={handleSelectMode}
              onBack={handleModeHubBack}
            />
          </motion.div>
        )}

        {screen === "game" && (
          <motion.div
            key="game"
            {...pageVariants}
            transition={{ duration: 0.2 }}
          >
            <GameScreen
              difficulty={selectedDifficulty}
              gameMode={gameMode}
              lang={lang}
              onBack={handleBack}
              onPlayAgain={() => setScreen("modeHub")}
            />
          </motion.div>
        )}

        {screen === "stats" && (
          <motion.div
            key="stats"
            {...pageVariants}
            transition={{ duration: 0.2 }}
          >
            <StatsScreen
              lang={lang}
              playerProfile={playerProfile ?? null}
              onBack={handleBack}
            />
          </motion.div>
        )}

        {screen === "badges" && (
          <motion.div
            key="badges"
            {...pageVariants}
            transition={{ duration: 0.2 }}
          >
            <BadgesScreen
              lang={lang}
              playerProfile={playerProfile ?? null}
              onBack={handleBack}
            />
          </motion.div>
        )}

        {screen === "settings" && (
          <motion.div
            key="settings"
            {...pageVariants}
            transition={{ duration: 0.2 }}
          >
            <SettingsScreen
              lang={lang}
              onLangChange={setLang}
              onBack={handleBack}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: "'Outfit', sans-serif",
            border: "1.5px solid oklch(var(--border))",
            borderRadius: "16px",
            background: "oklch(var(--card))",
            color: "oklch(var(--foreground))",
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SoundProvider>
        <AppInner />
      </SoundProvider>
    </ThemeProvider>
  );
}
