import { AnimatePresence, motion } from "motion/react";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Difficulty } from "../backend.d";
import { useSound } from "../context/SoundContext";
import { useDailyTasks } from "../hooks/useDailyTasks";
import { useLevelSystem } from "../hooks/useLevelSystem";
import { useModeStats } from "../hooks/useModeStats";
import { usePlayerData, useRecordPuzzleSolve } from "../hooks/usePlayerData";
import { type Lang, useTranslation } from "../i18n";
import {
  type Grid,
  checkSolution,
  generatePuzzle,
  generatePuzzleWithSeed,
  isPuzzleComplete,
} from "../sudokuEngine";
import type { GameMode } from "../types/gameMode";
import { isBadgeLocallyUnlocked, recordBadgeUnlockDate } from "./BadgesScreen";
import { SudokuBoard } from "./SudokuBoard";
import { getRankInfo } from "./XPBar";

// Badge display info
const BADGE_INFO: Record<
  string,
  { emoji: string; name: { tr: string; en: string } }
> = {
  first_solve: { emoji: "🌟", name: { tr: "İlk Çözüm", en: "First Solve" } },
  hint_free_10: {
    emoji: "🧠",
    name: { tr: "İpuçsuz Kahraman", en: "Hint-Free Hero" },
  },
  rank_5: { emoji: "🎖", name: { tr: "Stratejist", en: "Strategist" } },
  perfect_solve: { emoji: "💎", name: { tr: "Mükemmel", en: "Perfect" } },
  speed_demon: { emoji: "⚡", name: { tr: "Hız Şeytanı", en: "Speed Demon" } },
  weekly_champion: {
    emoji: "🏆",
    name: { tr: "Haftalık Şampiyon", en: "Weekly Champion" },
  },
  century: { emoji: "💯", name: { tr: "Yüzüncü", en: "Century" } },
  master_difficulty: { emoji: "🧩", name: { tr: "Usta", en: "Master" } },
  daily_streak: {
    emoji: "🔥",
    name: { tr: "Günlük Streak", en: "Daily Streak" },
  },
  error_free_hard: {
    emoji: "🎯",
    name: { tr: "Hatasız Zor", en: "Error-Free Hard" },
  },
  speed_rush_champion: {
    emoji: "⚡",
    name: { tr: "Hız Şampiyonu", en: "Speed Champion" },
  },
  survival_master: {
    emoji: "❤️",
    name: { tr: "Hayatta Kalanlar", en: "Survival Master" },
  },
  chain_5: { emoji: "⛓️", name: { tr: "Zincir Ustası", en: "Chain Master" } },
  boss_slayer: { emoji: "🐉", name: { tr: "Boss Katili", en: "Boss Slayer" } },
  star_perfect: {
    emoji: "⭐",
    name: { tr: "Yıldız Toplayıcı", en: "Star Collector" },
  },
};

interface GameScreenProps {
  difficulty: Difficulty;
  gameMode: GameMode;
  lang: Lang;
  onBack: () => void;
  onPlayAgain?: () => void;
  onOpenModes?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function calculateXP(
  difficulty: Difficulty,
  time: number,
  hints: number,
  errors: number,
): number {
  const base: Record<Difficulty, number> = {
    [Difficulty.easy]: 50,
    [Difficulty.medium]: 80,
    [Difficulty.hard]: 120,
    [Difficulty.expert]: 160,
    [Difficulty.master]: 200,
  };

  let xp = base[difficulty];
  xp -= hints * 10;
  xp -= errors * 5;

  const timeBonus = Math.max(0, 60 - Math.floor(time / 60)) * 2;
  xp += timeBonus;

  return Math.max(10, xp);
}

function getTodaySeed(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const DAILY_TOURNAMENT_KEY = "sudokuverse_daily_tournament";
const CHAIN_RECORD_KEY = "sudokuverse_chain_record";
const STAR_TOTAL_KEY = "sudokuverse_star_total";

function getTodayTournamentData(): { played: boolean; score: number } {
  try {
    const stored = localStorage.getItem(DAILY_TOURNAMENT_KEY);
    if (stored) {
      const data = JSON.parse(stored) as { date: string; score: number };
      const today = getTodaySeed();
      if (data.date === today) return { played: true, score: data.score };
    }
  } catch (_) {
    /* ignore */
  }
  return { played: false, score: 0 };
}

function saveTournamentScore(score: number) {
  localStorage.setItem(
    DAILY_TOURNAMENT_KEY,
    JSON.stringify({ date: getTodaySeed(), score }),
  );
}

function getChainRecord(): number {
  return Number.parseInt(localStorage.getItem(CHAIN_RECORD_KEY) ?? "0", 10);
}

function saveChainRecord(n: number) {
  const prev = getChainRecord();
  if (n > prev) localStorage.setItem(CHAIN_RECORD_KEY, String(n));
}

function getStarTotal(): number {
  return Number.parseInt(localStorage.getItem(STAR_TOTAL_KEY) ?? "0", 10);
}

function addStars(n: number) {
  localStorage.setItem(STAR_TOTAL_KEY, String(getStarTotal() + n));
}

// Pre-generated particle data (static, avoids random in render)
const BOSS_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: `bp-${i}`,
  dx: ((i * 73 + 31) % 200) - 100,
  dy: ((i * 53 + 17) % 200) - 100,
  color: [
    "oklch(0.72 0.19 52)",
    "oklch(0.62 0.23 340)",
    "oklch(0.57 0.22 220)",
  ][i % 3],
}));

const RANKUP_PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: `rp-${i}`,
  dx: ((i * 61 + 23) % 260) - 130,
  dy: ((i * 47 + 11) % 260) - 130,
  color: [
    "oklch(0.72 0.19 52)",
    "oklch(0.62 0.23 340)",
    "oklch(0.52 0.24 292)",
    "oklch(0.68 0.2 145)",
  ][i % 4],
}));

// Pre-generated confetti pieces
const CONFETTI_PIECES = Array.from({ length: 40 }, (_, i) => ({
  id: `conf-${i}`,
  x: (i * 257 + 13) % 100,
  delay: ((i * 37) % 50) / 100,
  duration: 1.5 + ((i * 31) % 100) / 100,
  color: [
    "oklch(0.72 0.19 52)",
    "oklch(0.62 0.23 340)",
    "oklch(0.52 0.24 292)",
    "oklch(0.57 0.22 220)",
    "oklch(0.68 0.2 145)",
  ][i % 5],
  size: 6 + ((i * 19) % 80) / 10,
  rotation: (i * 137) % 360,
}));

// ---- Share Result helper ----
function buildShareText(
  gameMode: string,
  errorCount: number,
  hintsUsed: number,
  time: number,
  xp: number,
  lang: string,
): string {
  const m = Math.floor(time / 60);
  const s = time % 60;
  const timeStr = `${m}:${s.toString().padStart(2, "0")}`;
  const appUrl = window.location.href.split("?")[0];
  if (lang === "tr") {
    return `🎮 SudokuVerse — ${gameMode}\n⏱ Süre: ${timeStr}\n❌ Hata: ${errorCount}\n💡 İpucu: ${hintsUsed}\n⭐ XP: +${xp}\n\nBen de oyna: ${appUrl}`;
  }
  return `🎮 SudokuVerse — ${gameMode}\n⏱ Time: ${timeStr}\n❌ Errors: ${errorCount}\n💡 Hints: ${hintsUsed}\n⭐ XP: +${xp}\n\nPlay too: ${appUrl}`;
}

// ---- Foggy Mode helpers ----
function initFogRevealedCells(originalPuzzle: Grid): Set<string> {
  const revealed = new Set<string>();
  // Reveal all given cells and their immediate neighbors
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (originalPuzzle[r][c] !== 0) {
        revealed.add(`${r}-${c}`);
        // Reveal orthogonal neighbors
        for (const [dr, dc] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
            revealed.add(`${nr}-${nc}`);
          }
        }
      }
    }
  }
  return revealed;
}

function expandFog(
  revealed: Set<string>,
  row: number,
  col: number,
): Set<string> {
  const next = new Set(revealed);
  // Reveal all cells in same row, column, and 3x3 box
  for (let c = 0; c < 9; c++) next.add(`${row}-${c}`);
  for (let r = 0; r < 9; r++) next.add(`${r}-${col}`);
  const boxR = Math.floor(row / 3) * 3;
  const boxC = Math.floor(col / 3) * 3;
  for (let r = boxR; r < boxR + 3; r++)
    for (let c = boxC; c < boxC + 3; c++) next.add(`${r}-${c}`);
  return next;
}

// ---- Boss Battle helpers ----
function countEmptyCells(puzzle: Grid): number {
  let count = 0;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) if (puzzle[r][c] === 0) count++;
  return count;
}

// ---- Blind Mode helpers ----
function makeBlindHidden(originalPuzzle: Grid, hideRatio: number): Set<string> {
  const givenCells: [number, number][] = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (originalPuzzle[r][c] !== 0) givenCells.push([r, c]);
  const toHide = Math.floor(givenCells.length * hideRatio);
  const shuffled = [...givenCells].sort(() => Math.random() - 0.5);
  const hidden = new Set<string>();
  for (let i = 0; i < toHide; i++) {
    const [r, c] = shuffled[i];
    hidden.add(`${r}-${c}`);
  }
  return hidden;
}

export function GameScreen({
  difficulty,
  gameMode,
  lang,
  onBack,
  onPlayAgain,
  onOpenModes,
}: GameScreenProps) {
  const t = useTranslation(lang);
  const recordSolve = useRecordPuzzleSolve();
  const { data: playerProfile } = usePlayerData();
  const { playSound } = useSound();
  const { onPuzzleSolved, newlyCompletedTasks, clearNewlyCompleted } =
    useDailyTasks();
  const { recordModeResult } = useModeStats();
  const { advanceLevel, currentLevel } = useLevelSystem();

  // Hints based on player level: base 3 + 1 for every 10 levels
  const maxHints = 3 + Math.floor((currentLevel - 1) / 10);

  // Track if note mode was used this game
  const noteModeUsedRef = useRef(false);

  // Toast notifications for newly completed daily tasks
  useEffect(() => {
    if (newlyCompletedTasks.length === 0) return;
    const TASK_LABELS: Record<string, { tr: string; en: string }> = {
      solve_two_puzzles: { tr: "2 bulmaca çözüldü", en: "Solved 2 puzzles" },
      solve_no_hints: { tr: "İpuçsuz çözüm", en: "Solved without hints" },
      solve_under_time: { tr: "Hızlı çözüm", en: "Speed solve" },
      solve_three_puzzles: { tr: "3 bulmaca çözüldü", en: "Solved 3 puzzles" },
      solve_hard_puzzle: { tr: "Zor bulmaca çözüldü", en: "Hard puzzle done" },
      no_errors_puzzle: { tr: "Hatasız çözüm", en: "Error-free solve" },
      speed_solve: { tr: "5 dk'da çözüm", en: "Solved in 5 min" },
      use_notes_mode: { tr: "Not modu kullanıldı", en: "Notes mode used" },
      solve_medium_plus: { tr: "Orta+ bulmaca", en: "Medium+ puzzle done" },
      chain_two: { tr: "2 zincir tamamlandı", en: "Chain x2 done" },
    };
    newlyCompletedTasks.forEach((taskType, i) => {
      const label = TASK_LABELS[taskType];
      if (!label) return;
      setTimeout(() => {
        toast.success(
          lang === "tr"
            ? `✅ Görev Tamamlandı: ${label.tr}!`
            : `✅ Task Complete: ${label.en}!`,
          { duration: 3000 },
        );
      }, i * 600);
    });
    clearNewlyCompleted();
  }, [newlyCompletedTasks, clearNewlyCompleted, lang]);

  const [puzzle, setPuzzle] = useState<Grid>([]);
  const [solution, setSolution] = useState<Grid>([]);
  const [originalPuzzle, setOriginalPuzzle] = useState<Grid>([]);
  const [notes, setNotes] = useState<Map<string, Set<number>>>(new Map());
  const [errorCells, setErrorCells] = useState<Set<string>>(new Set());
  const [hintCells, setHintCells] = useState<Set<string>>(new Set());
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(() => maxHints);
  const [errorCount, setErrorCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Speed Rush ---
  const SPEED_RUSH_DURATION = 180;
  const [speedTimeLeft, setSpeedTimeLeft] = useState(SPEED_RUSH_DURATION);
  const [combo, setCombo] = useState(0);
  const [showTimeUp, setShowTimeUp] = useState(false);

  // --- Survival ---
  const [lives, setLives] = useState(3);
  const [showGameOver, setShowGameOver] = useState(false);
  const [shakeHeart, setShakeHeart] = useState(false);

  // --- Chain ---
  const [chainCount, setChainCount] = useState(1);
  const [chainFlash, setChainFlash] = useState(false);
  const [showChainSummary, setShowChainSummary] = useState(false);
  const [chainTotalXP, setChainTotalXP] = useState(0);
  const [chainTotalTime, setChainTotalTime] = useState(0);
  const [chainTotalErrors, setChainTotalErrors] = useState(0);

  // --- Blind ---
  const [blindCountdown, setBlindCountdown] = useState<number | null>(null);
  const [isBlind, setIsBlind] = useState(false);
  const [blindHidden, setBlindHidden] = useState<Set<string>>(new Set());

  // --- Star Collector ---
  const [starsEarned, setStarsEarned] = useState(0);
  const [showStars, setShowStars] = useState(false);

  // --- Boss Battle ---
  const [bossMaxHp, setBossMaxHp] = useState(0);
  const [bossHp, setBossHp] = useState(0);
  const [bossShake, setBossShake] = useState(false);
  const [showBossDefeated, setShowBossDefeated] = useState(false);
  const [bossHitFlash, setBossHitFlash] = useState(false);

  // --- Blind Mode completion ---
  const [showBlindComplete, setShowBlindComplete] = useState(false);
  // --- Blind Mode "Play Again" countdown (re-show memorisation window) ---
  const [blindPlayAgainCountdown, setBlindPlayAgainCountdown] = useState<
    number | null
  >(null);

  // --- Foggy Mode ---
  const [fogRevealed, setFogRevealed] = useState<Set<string>>(new Set());

  // --- One Error Mode ---
  const [showOneErrorGameOver, setShowOneErrorGameOver] = useState(false);
  const [showOneErrorComplete, setShowOneErrorComplete] = useState(false);

  // --- Daily Tournament ---
  const [tournamentScore, setTournamentScore] = useState(0);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  // --- Chain Auto-Advance ---
  const [chainAutoAdvanceCountdown, setChainAutoAdvanceCountdown] = useState<
    number | null
  >(null);

  // --- Speed Rush Combo Burst ---
  const [showComboBurst, setShowComboBurst] = useState(false);
  const [comboBurstValue, setComboBurstValue] = useState(0);

  // --- New Features ---
  // Undo history
  type MoveHistoryEntry = {
    row: number;
    col: number;
    prevValue: number;
    prevNotes: Map<string, Set<number>>;
    prevErrors: Set<string>;
  };
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([]);

  // Highlighted number (same-number highlighting)
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(
    null,
  );

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  // Rank-up celebration
  const [showRankUp, setShowRankUp] = useState(false);
  const [rankUpInfo, setRankUpInfo] = useState<{
    oldRank: string;
    newRank: string;
  } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordModeResultRef = useRef(recordModeResult);
  useEffect(() => {
    recordModeResultRef.current = recordModeResult;
  });
  const comboRef = useRef(combo);
  useEffect(() => {
    comboRef.current = combo;
  });

  const effectiveDifficulty =
    gameMode === "boss_battle"
      ? difficulty === Difficulty.easy || difficulty === Difficulty.medium
        ? Difficulty.expert
        : difficulty
      : difficulty;

  // Initialize puzzle
  useEffect(() => {
    setIsLoading(true);

    // Check daily tournament
    if (gameMode === "daily_tournament") {
      const data = getTodayTournamentData();
      if (data.played) {
        setAlreadyPlayed(true);
        setIsLoading(false);
        return;
      }
    }

    const timeout = setTimeout(() => {
      let p: Grid;
      let s: Grid;
      if (gameMode === "daily_tournament") {
        const seed = getTodaySeed();
        ({ puzzle: p, solution: s } = generatePuzzleWithSeed(difficulty, seed));
      } else {
        ({ puzzle: p, solution: s } = generatePuzzle(effectiveDifficulty));
      }
      setPuzzle(p);
      setSolution(s);
      setOriginalPuzzle(p.map((row) => [...row]));

      // Boss HP
      if (gameMode === "boss_battle") {
        const empty = countEmptyCells(p);
        setBossMaxHp(empty * 100);
        setBossHp(empty * 100);
      }

      // Blind Mode countdown
      if (gameMode === "blind") {
        setBlindCountdown(5);
      }

      // Foggy Mode: initialize revealed cells
      if (gameMode === "foggy") {
        setFogRevealed(initFogRevealedCells(p));
      }

      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, gameMode, effectiveDifficulty]);

  // Blind mode countdown
  useEffect(() => {
    if (blindCountdown === null) return;
    if (blindCountdown === 0) {
      setIsBlind(true);
      setBlindCountdown(null);
      // hide some given cells
      const ratio =
        difficulty === Difficulty.easy
          ? 0.3
          : difficulty === Difficulty.medium
            ? 0.35
            : 0.45;
      setBlindHidden(makeBlindHidden(originalPuzzle, ratio));
      return;
    }
    const id = setTimeout(
      () => setBlindCountdown((c) => (c !== null ? c - 1 : null)),
      1000,
    );
    return () => clearTimeout(id);
  }, [blindCountdown, originalPuzzle, difficulty]);

  // Blind Mode "Play Again" countdown: show a new puzzle with memorisation window
  useEffect(() => {
    if (blindPlayAgainCountdown === null) return;
    if (blindPlayAgainCountdown <= 0) {
      setBlindPlayAgainCountdown(null);
      // Actually restart: reset state and load new puzzle
      setShowBlindComplete(false);
      setIsComplete(false);
      setErrorCount(0);
      setHintsUsed(0);
      setHintsLeft(maxHints);
      setTimer(0);
      setErrorCells(new Set());
      setNotes(new Map());
      setHintCells(new Set());
      setIsNoteMode(false);
      setMoveHistory([]);
      noteModeUsedRef.current = false;
      setIsBlind(false);
      setBlindHidden(new Set());
      setIsLoading(true);
      setTimeout(() => {
        const { puzzle: p, solution: s } = generatePuzzle(effectiveDifficulty);
        setPuzzle(p);
        setSolution(s);
        setOriginalPuzzle(p.map((row) => [...row]));
        setBlindCountdown(5); // restart memorisation countdown
        setIsLoading(false);
      }, 100);
      return;
    }
    const id = setTimeout(() => {
      setBlindPlayAgainCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(id);
  }, [blindPlayAgainCountdown, effectiveDifficulty, maxHints]);

  // Speed Rush timer
  useEffect(() => {
    if (gameMode !== "speed_rush") return;
    if (isLoading || isPaused || isComplete || showTimeUp) return;
    const id = setInterval(() => {
      setSpeedTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          // Time's up without completing the puzzle: record as a loss, no XP
          recordModeResultRef.current({
            gameMode: "speed_rush",
            won: false,
            combo: comboRef.current,
          });
          // Do NOT call handleComplete here -- puzzle was not finished
          setShowTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gameMode, isLoading, isPaused, isComplete, showTimeUp]);

  // Main timer (non-speed modes)
  useEffect(() => {
    if (gameMode === "speed_rush") return;
    if (isLoading || isPaused || isComplete) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameMode, isLoading, isPaused, isComplete]);

  const handleComplete = useCallback(
    (finalPuzzle: Grid, _currentXP = 0) => {
      void finalPuzzle;
      // Use real cumulative XP from playerProfile for rank-up detection
      const realCurrentXP = Number(playerProfile?.xp ?? 0);
      setIsComplete(true);
      if (timerRef.current) clearInterval(timerRef.current);

      const elapsed =
        gameMode === "speed_rush" ? SPEED_RUSH_DURATION - speedTimeLeft : timer;
      let xp = calculateXP(effectiveDifficulty, elapsed, hintsUsed, errorCount);

      if (gameMode === "speed_rush") {
        const comboMult = Math.min(combo, 5);
        xp = Math.round(xp * (1 + comboMult * 0.3));
      }
      if (gameMode === "chain") {
        const chainMult =
          chainCount <= 1
            ? 1
            : chainCount <= 2
              ? 1.2
              : chainCount <= 3
                ? 1.5
                : 2;
        xp = Math.round(xp * chainMult);
        setChainTotalXP((prev) => prev + xp);
        setChainTotalTime((prev) => prev + elapsed);
        setChainTotalErrors((prev) => prev + errorCount);
        saveChainRecord(chainCount);
      }
      if (gameMode === "daily_tournament") {
        const score = Math.max(
          0,
          10000 - elapsed * 10 + (errorCount === 0 ? 500 : 0),
        );
        setTournamentScore(score);
        saveTournamentScore(score);
      }

      // Level system: advance on solve
      const levelAdvanced = advanceLevel(effectiveDifficulty);
      if (levelAdvanced) {
        setTimeout(() => {
          toast.success(
            lang === "tr"
              ? "🎯 Seviye Atladın! +1 Seviye"
              : "🎯 Level Up! +1 Level",
            { duration: 3000 },
          );
        }, 1200);
      }

      let starsForThisGame = 0;
      if (gameMode === "star_collector") {
        let stars = 1;
        if (errorCount < 3) stars = 2;
        if (errorCount === 0 && elapsed < 300) stars = 3;
        starsForThisGame = stars;
        setStarsEarned(stars);
        addStars(stars);
        setTimeout(() => {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }, 100);
        setTimeout(() => setShowStars(true), 300);
      }
      if (gameMode === "boss_battle") {
        playSound("boss_defeated");
        // Show boss defeated with particle explosion after 1500ms
        // (allows the HP bar spring animation to fully complete before the modal appears)
        setTimeout(() => setShowBossDefeated(true), 1500);
        // Confetti for boss defeat
        setTimeout(() => {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }, 100);
      } else {
        playSound("puzzle_complete");
        // Confetti for all modes including chain and star_collector
        setTimeout(() => {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }, 200);
      }

      // Play XP gain sound after a small delay
      setTimeout(() => playSound("xp_gain"), 700);

      setEarnedXP(xp);

      // Rank-up detection using real cumulative XP
      const prevRankInfo = getRankInfo(realCurrentXP, lang);
      const newRankInfo = getRankInfo(realCurrentXP + xp, lang);
      if (newRankInfo.rankIndex > prevRankInfo.rankIndex) {
        setRankUpInfo({
          oldRank: prevRankInfo.rankName,
          newRank: newRankInfo.rankName,
        });
        setTimeout(() => {
          setShowRankUp(true);
          playSound("badge_unlock");
        }, 1500);
        setTimeout(() => setShowRankUp(false), 5000);
      }

      // Track daily tasks & weekly challenges
      onPuzzleSolved({
        difficulty: effectiveDifficulty,
        solveTimeSeconds: elapsed,
        hintsUsed,
        errors: errorCount,
        isNotesModeUsed: noteModeUsedRef.current,
        chainCount,
        gameMode,
      });

      // Track mode stats
      recordModeResult({
        gameMode,
        won: true,
        combo,
        livesRemaining: lives,
        chainCount,
        starsEarned: starsForThisGame,
      });

      recordSolve.mutate(
        {
          difficulty: effectiveDifficulty,
          solveTime: elapsed,
          hintsUsed,
          errorsMade: errorCount,
        },
        {
          onSuccess: (data) => {
            // Use unlockedBadges array from backend (exact badge IDs)
            const backendBadges = data.unlockedBadges ?? [];

            // Also check game-mode specific badges not tracked by backend
            const extraBadges: string[] = [];
            if (
              gameMode === "boss_battle" &&
              !backendBadges.includes("boss_slayer")
            ) {
              extraBadges.push("boss_slayer");
            }
            if (
              gameMode === "survival" &&
              lives === 3 && // must have survived with all 3 lives intact
              !backendBadges.includes("survival_master")
            ) {
              extraBadges.push("survival_master");
            }
            if (
              gameMode === "chain" &&
              chainCount >= 5 &&
              !backendBadges.includes("chain_5")
            ) {
              extraBadges.push("chain_5");
            }
            if (
              gameMode === "star_collector" &&
              starsForThisGame === 3 && // only if perfect 3-star solve
              !backendBadges.includes("star_perfect")
            ) {
              extraBadges.push("star_perfect");
            }
            if (
              gameMode === "speed_rush" &&
              !backendBadges.includes("speed_rush_champion")
            ) {
              extraBadges.push("speed_rush_champion");
            }

            // weekly_champion: all 7 weekly tasks completed
            // Check this after onPuzzleSolved has run (which may mark weekly tasks)
            // Use a short delay to ensure state has updated
            // We check via localStorage directly
            (() => {
              if (isBadgeLocallyUnlocked("weekly_champion")) return;
              try {
                const raw = localStorage.getItem("sudokuverse_weekly_v2");
                if (raw) {
                  const parsed = JSON.parse(raw) as {
                    weekKey: string;
                    completed: boolean[];
                  };
                  if (parsed.completed.every(Boolean)) {
                    extraBadges.push("weekly_champion");
                  }
                }
              } catch (_) {
                /* ignore */
              }
            })();

            // daily_streak: player has a streak >= 3
            (() => {
              if (isBadgeLocallyUnlocked("daily_streak")) return;
              try {
                const raw = localStorage.getItem("sudokuverse_streak_v1");
                if (raw) {
                  const parsed = JSON.parse(raw) as {
                    currentStreak: number;
                  };
                  if (parsed.currentStreak >= 3) {
                    extraBadges.push("daily_streak");
                  }
                }
              } catch (_) {
                /* ignore */
              }
            })();

            const allNewBadges = [...backendBadges, ...extraBadges];

            if (allNewBadges.length > 0) {
              const badgeDisplayNames: string[] = [];
              allNewBadges.forEach((badgeId, i) => {
                const info = BADGE_INFO[badgeId] ?? BADGE_INFO.first_solve;
                const badgeEmoji = info?.emoji ?? "🏅";
                const badgeName =
                  info?.name[lang as "tr" | "en"] ??
                  (lang === "tr" ? "Yeni Rozet" : "New Badge");
                badgeDisplayNames.push(`${badgeEmoji} ${badgeName}`);
                recordBadgeUnlockDate(badgeId);
                const delay = 900 + i * 800;
                setTimeout(() => playSound("badge_unlock"), delay);
                setTimeout(() => {
                  toast.success(
                    lang === "tr"
                      ? `${badgeEmoji} Rozet Açıldı: ${badgeName}!`
                      : `${badgeEmoji} Badge Unlocked: ${badgeName}!`,
                    { duration: 4000 },
                  );
                }, delay + 100);
              });
              setNewBadges(badgeDisplayNames);
            }
          },
        },
      );

      if (
        gameMode !== "chain" &&
        gameMode !== "star_collector" &&
        gameMode !== "boss_battle"
      ) {
        if (gameMode === "blind") {
          setTimeout(() => setShowBlindComplete(true), 400);
        } else if (gameMode === "one_error") {
          setTimeout(() => setShowOneErrorComplete(true), 400);
        } else {
          setTimeout(() => setShowComplete(true), 400);
        }
      }
    },
    [
      gameMode,
      effectiveDifficulty,
      timer,
      speedTimeLeft,
      hintsUsed,
      errorCount,
      combo,
      chainCount,
      lives,
      recordSolve,
      playSound,
      onPuzzleSolved,
      recordModeResult,
      advanceLevel,
      lang,
      playerProfile,
    ],
  );

  // Chain mode: auto-restart after completion
  const handleChainNext = useCallback(() => {
    setIsComplete(false);
    setChainAutoAdvanceCountdown(null);
    setErrorCells(new Set());
    setNotes(new Map());
    setHintCells(new Set());
    setErrorCount(0);
    setHintsUsed(0);
    setHintsLeft(maxHints); // reset hints for next puzzle in chain
    setIsNoteMode(false);
    setMoveHistory([]); // clear undo history for next puzzle
    setChainFlash(true);
    setChainCount((c) => c + 1);
    setTimeout(() => setChainFlash(false), 500);

    const { puzzle: p, solution: s } = generatePuzzle(effectiveDifficulty);
    setPuzzle(p);
    setSolution(s);
    setOriginalPuzzle(p.map((row) => [...row]));
    setTimer(0);
  }, [effectiveDifficulty, maxHints]);

  // Store handleChainNext in a ref for use in the countdown effect
  const handleChainNextRef = useRef(handleChainNext);
  useEffect(() => {
    handleChainNextRef.current = handleChainNext;
  });

  // Chain mode: auto-advance countdown effect
  useEffect(() => {
    if (!isComplete || gameMode !== "chain" || showChainSummary) return;
    // Start countdown at 2 when chain puzzle is complete
    setChainAutoAdvanceCountdown(2);
  }, [isComplete, gameMode, showChainSummary]);

  useEffect(() => {
    if (chainAutoAdvanceCountdown === null) return;
    if (chainAutoAdvanceCountdown <= 0) {
      setChainAutoAdvanceCountdown(null);
      handleChainNextRef.current();
      return;
    }
    const id = setTimeout(() => {
      setChainAutoAdvanceCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(id);
  }, [chainAutoAdvanceCountdown]);

  const handleCellChange = useCallback(
    (row: number, col: number, value: number, isNote = false) => {
      if (isNote) {
        // Save history for note changes too (deep copy notes for correct undo)
        const notesCopy = new Map<string, Set<number>>();
        notes.forEach((v, k) => notesCopy.set(k, new Set(v)));
        setMoveHistory((prev) => {
          const entry: MoveHistoryEntry = {
            row,
            col,
            prevValue: puzzle[row]?.[col] ?? 0,
            prevNotes: notesCopy,
            prevErrors: new Set(errorCells),
          };
          return [...prev.slice(-29), entry];
        });
        setNotes((prev) => {
          const next = new Map(prev);
          const key = `${row}-${col}`;
          const cellNotes = new Set(next.get(key) ?? []);
          if (value === 0) {
            next.delete(key);
          } else if (cellNotes.has(value)) {
            cellNotes.delete(value);
            if (cellNotes.size === 0) next.delete(key);
            else next.set(key, cellNotes);
          } else {
            cellNotes.add(value);
            next.set(key, cellNotes);
          }
          return next;
        });
        return;
      }

      // Save to history before applying (deep copy notes for correct undo)
      const notesCopy2 = new Map<string, Set<number>>();
      notes.forEach((v, k) => notesCopy2.set(k, new Set(v)));
      setMoveHistory((prev) => {
        const entry: MoveHistoryEntry = {
          row,
          col,
          prevValue: puzzle[row]?.[col] ?? 0,
          prevNotes: notesCopy2,
          prevErrors: new Set(errorCells),
        };
        return [...prev.slice(-29), entry];
      });

      // Update highlighted number on input
      if (value !== 0) {
        setHighlightedNumber(value);
      }

      // Play number_enter on every digit entry
      playSound("number_enter");

      const newPuzzle = puzzle.map((r) => [...r]);
      newPuzzle[row][col] = value;
      setPuzzle(newPuzzle);

      setNotes((prev) => {
        const next = new Map(prev);
        next.delete(`${row}-${col}`);
        return next;
      });

      if (value === 0) {
        setErrorCells((prev) => {
          const next = new Set(prev);
          next.delete(`${row}-${col}`);
          return next;
        });
        return;
      }

      const cellKey = `${row}-${col}`;
      if (solution[row][col] !== value) {
        playSound("error");
        setErrorCells((prev) => new Set(prev).add(cellKey));
        setErrorCount((c) => c + 1);

        // Mode-specific error handling
        if (gameMode === "speed_rush") {
          setCombo(0);
        }
        if (gameMode === "survival") {
          setLives((l) => {
            const next = l - 1;
            setShakeHeart(true);
            setTimeout(() => setShakeHeart(false), 500);
            if (next <= 0) {
              playSound("game_over");
              recordModeResultRef.current({
                gameMode: "survival",
                won: false,
                livesRemaining: 0,
              });
              setTimeout(() => setShowGameOver(true), 300);
            }
            return next;
          });
        }
        if (gameMode === "one_error") {
          // One error mode: instant game over on first mistake
          playSound("game_over");
          recordModeResultRef.current({ gameMode: "one_error", won: false });
          setTimeout(() => setShowOneErrorGameOver(true), 300);
        }
        if (gameMode === "boss_battle") {
          setBossShake(true);
          setTimeout(() => setBossShake(false), 400);
        }
      } else {
        playSound("correct");
        setErrorCells((prev) => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });

        // Mode-specific correct handling
        if (gameMode === "speed_rush") {
          setCombo((c) => {
            const next = c + 1;
            if (next > c) playSound("combo_hit");
            // Show combo burst overlay at milestones
            if (next >= 2) {
              setComboBurstValue(next);
              setShowComboBurst(true);
              setTimeout(() => setShowComboBurst(false), 1000);
            }
            return next;
          });
        }
        if (gameMode === "boss_battle") {
          playSound("boss_hit");
          setBossHp((hp) => {
            const next = Math.max(0, hp - 100);
            setBossHitFlash(true);
            setTimeout(() => setBossHitFlash(false), 200);
            return next;
          });
        }
        if (gameMode === "foggy") {
          setFogRevealed((prev) => expandFog(prev, row, col));
        }
      }

      if (isPuzzleComplete(newPuzzle) && checkSolution(newPuzzle, solution)) {
        handleComplete(newPuzzle);
      }
    },
    [puzzle, solution, gameMode, handleComplete, playSound, notes, errorCells],
  );

  const handleHint = useCallback(() => {
    if (hintsLeft <= 0) return;

    const emptyCells: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (originalPuzzle[r][c] === 0 && puzzle[r][c] !== solution[r][c]) {
          emptyCells.push([r, c]);
        }
      }
    }

    if (emptyCells.length === 0) return;

    playSound("hint_use");

    const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newPuzzle = puzzle.map((row) => [...row]);
    newPuzzle[r][c] = solution[r][c];
    setPuzzle(newPuzzle);
    setHintsLeft((h) => h - 1);
    setHintsUsed((h) => h + 1);

    const cellKey = `${r}-${c}`;
    setHintCells((prev) => new Set(prev).add(cellKey));
    setErrorCells((prev) => {
      const next = new Set(prev);
      next.delete(cellKey);
      return next;
    });
    setNotes((prev) => {
      const next = new Map(prev);
      next.delete(cellKey);
      return next;
    });

    if (isPuzzleComplete(newPuzzle) && checkSolution(newPuzzle, solution)) {
      handleComplete(newPuzzle);
    }
  }, [hintsLeft, puzzle, solution, originalPuzzle, handleComplete, playSound]);

  const handleUndo = useCallback(() => {
    setMoveHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const next = prev.slice(0, -1);

      // Restore puzzle
      setPuzzle((currentPuzzle) => {
        const restored = currentPuzzle.map((row) => [...row]);
        restored[last.row][last.col] = last.prevValue;
        return restored;
      });
      // Restore notes
      setNotes(new Map(last.prevNotes));
      // Restore errors
      setErrorCells(new Set(last.prevErrors));

      return next;
    });
  }, []);

  const handleAutoNotes = useCallback(() => {
    const newNotes = new Map<string, Set<number>>();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) continue;
        if (originalPuzzle[r][c] !== 0) continue;
        const candidates = new Set<number>();
        for (let num = 1; num <= 9; num++) {
          let valid = true;
          // Check row
          for (let cc = 0; cc < 9; cc++) {
            if (puzzle[r][cc] === num) {
              valid = false;
              break;
            }
          }
          if (!valid) continue;
          // Check col
          for (let rr = 0; rr < 9; rr++) {
            if (puzzle[rr][c] === num) {
              valid = false;
              break;
            }
          }
          if (!valid) continue;
          // Check box
          const boxR = Math.floor(r / 3) * 3;
          const boxC = Math.floor(c / 3) * 3;
          for (let rr = boxR; rr < boxR + 3; rr++) {
            for (let cc = boxC; cc < boxC + 3; cc++) {
              if (puzzle[rr][cc] === num) {
                valid = false;
              }
            }
          }
          if (valid) candidates.add(num);
        }
        if (candidates.size > 0) {
          newNotes.set(`${r}-${c}`, candidates);
        }
      }
    }
    setNotes(newNotes);
    toast.success(
      lang === "tr"
        ? "🔢 Aday rakamlar otomatik dolduruldu!"
        : "🔢 Candidate numbers filled automatically!",
      { duration: 2000 },
    );
  }, [puzzle, originalPuzzle, lang]);

  // Confetti component
  function ConfettiEffect({ active }: { active: boolean }) {
    if (!active) return null;
    return (
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {CONFETTI_PIECES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-sm"
            initial={{
              top: "-5%",
              left: `${p.x}%`,
              opacity: 1,
              rotate: p.rotation,
            }}
            animate={{
              top: "110%",
              opacity: [1, 1, 0],
              rotate: p.rotation + 720,
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: "easeIn",
            }}
            style={{ width: p.size, height: p.size, background: p.color }}
          />
        ))}
      </div>
    );
  }

  const difficultyColors: Record<Difficulty, string> = {
    [Difficulty.easy]: "oklch(0.68 0.2 145)",
    [Difficulty.medium]: "oklch(0.57 0.22 220)",
    [Difficulty.hard]: "oklch(0.72 0.19 52)",
    [Difficulty.expert]: "oklch(0.62 0.23 340)",
    [Difficulty.master]: "oklch(0.52 0.24 292)",
  };

  const difficultyLabels: Record<Difficulty, string> = {
    [Difficulty.easy]: t("easy"),
    [Difficulty.medium]: t("medium"),
    [Difficulty.hard]: t("hard"),
    [Difficulty.expert]: t("expert"),
    [Difficulty.master]: t("master"),
  };

  // Loading
  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ height: "100dvh" }}
      >
        <div
          className="w-12 h-12 rounded-full border-4 animate-spin"
          style={{
            borderColor: "oklch(var(--primary))",
            borderTopColor: "transparent",
          }}
        />
        <p
          className="mt-4 font-semibold"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          {t("loading")}
        </p>
      </div>
    );
  }

  // Already played daily tournament today
  if (gameMode === "daily_tournament" && alreadyPlayed) {
    const data = getTodayTournamentData();
    return (
      <div
        className="flex flex-col items-center justify-center px-6 text-center"
        style={{ height: "100dvh", background: "transparent" }}
      >
        <div className="text-6xl mb-4">🏆</div>
        <h2
          className="text-2xl font-black font-display mb-2"
          style={{ color: "oklch(var(--foreground))" }}
        >
          {t("mode_daily_tournament")}
        </h2>
        <p
          className="text-sm mb-4"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          {lang === "tr" ? "Bugün zaten oynadın!" : "You already played today!"}
        </p>
        <div
          className="rounded-2xl px-8 py-4 mb-6"
          style={{ background: "oklch(var(--secondary))" }}
        >
          <div
            className="text-3xl font-black font-display"
            style={{ color: "oklch(var(--primary))" }}
          >
            {data.score}
          </div>
          <div
            className="text-sm"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            {t("tournamentScore")}
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {onPlayAgain && (
            <button
              type="button"
              data-ocid="game.tournament.play_again_button"
              onClick={onPlayAgain}
              className="rounded-2xl px-8 py-3 font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.55 0.2 145), oklch(0.62 0.2 162))",
              }}
            >
              {lang === "tr" ? "🎮 Başka Mod Oyna" : "🎮 Play Another Mode"}
            </button>
          )}
          <button
            type="button"
            data-ocid="game.back.button"
            onClick={onBack}
            className="rounded-2xl px-8 py-3 font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.52 0.24 292), oklch(0.62 0.23 340))",
            }}
          >
            {t("back")}
          </button>
        </div>
      </div>
    );
  }

  const comboMultiplier = gameMode === "speed_rush" ? Math.min(combo, 5) : 0;
  const bossHpPercent = bossMaxHp > 0 ? (bossHp / bossMaxHp) * 100 : 0;
  const chainMultiplier =
    gameMode === "chain"
      ? chainCount <= 1
        ? "1x"
        : chainCount <= 2
          ? "1.2x"
          : chainCount <= 3
            ? "1.5x"
            : "2x"
      : null;

  const completionStats = [
    {
      label: t("timeLabel"),
      value: formatTime(
        gameMode === "speed_rush" ? SPEED_RUSH_DURATION - speedTimeLeft : timer,
      ),
      emoji: "⏱",
    },
    { label: t("xpEarned"), value: `+${earnedXP}`, emoji: "⭐" },
    { label: t("hintsUsed"), value: String(hintsUsed), emoji: "💡" },
    { label: t("errorsCount"), value: String(errorCount), emoji: "❌" },
  ];

  return (
    <div
      className="flex flex-col relative"
      style={{
        height: "100dvh",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      {/* Confetti */}
      <ConfettiEffect active={showConfetti} />

      {/* Speed Rush Combo Burst Overlay */}
      <AnimatePresence>
        {showComboBurst && gameMode === "speed_rush" && (
          <motion.div
            key={`combo-burst-${comboBurstValue}`}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.4, 1.2, 0.9] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, times: [0, 0.2, 0.6, 1] }}
            className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <div
              className="font-black font-display text-6xl drop-shadow-2xl"
              style={{
                color:
                  comboBurstValue >= 5
                    ? "oklch(0.62 0.23 340)"
                    : "oklch(0.72 0.19 52)",
                textShadow:
                  "0 0 32px oklch(0.72 0.19 52 / 0.7), 0 0 8px oklch(0 0 0 / 0.5)",
                WebkitTextStroke: "2px oklch(0 0 0 / 0.3)",
              }}
            >
              🔥 {comboBurstValue}x
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chain Flash Overlay */}
      <AnimatePresence>
        {chainFlash && (
          <motion.div
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{ background: "oklch(0.68 0.2 145)" }}
          />
        )}
      </AnimatePresence>

      {/* Boss Hit Flash */}
      <AnimatePresence>
        {bossHitFlash && (
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 pointer-events-none"
            style={{ background: "oklch(0.65 0.22 145)" }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 sticky top-0 z-10 glass-card">
        <button
          type="button"
          data-ocid="game.back.button"
          onClick={() => {
            playSound("button_click");
            if (gameMode === "chain") setShowChainSummary(true);
            else onBack();
          }}
          className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-sm transition-all hover:scale-105"
          style={{
            background: "oklch(var(--secondary))",
            color: "oklch(var(--primary))",
          }}
        >
          ← {t("back")}
        </button>

        <div className="flex items-center gap-2">
          {/* Mode badge */}
          {gameMode === "daily_tournament" && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-black text-white"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.6 0.18 80), oklch(0.7 0.16 60))",
              }}
            >
              🏆
            </span>
          )}
          {gameMode === "blind" && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-black text-white"
              style={{ background: "oklch(0.3 0.15 275)" }}
            >
              👁️ {lang === "tr" ? "KÖR" : "BLIND"}
            </span>
          )}
          {gameMode === "foggy" && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-black text-white"
              style={{ background: "oklch(0.42 0.14 250)" }}
            >
              🌫️ {lang === "tr" ? "SİSLİ" : "FOGGY"}
            </span>
          )}
          {gameMode === "one_error" && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-black text-white"
              style={{ background: "oklch(0.4 0.18 350)" }}
            >
              ☠️ {lang === "tr" ? "0 HATA" : "0 ERR"}
            </span>
          )}

          <span
            className="rounded-full px-3 py-1 text-xs font-bold text-white"
            style={{ background: difficultyColors[effectiveDifficulty] }}
          >
            {difficultyLabels[effectiveDifficulty]}
          </span>

          {/* Timer */}
          {gameMode === "speed_rush" ? (
            <motion.div
              className="rounded-xl px-3 py-1.5 font-bold text-sm font-display"
              animate={speedTimeLeft < 30 ? { opacity: [1, 0.4, 1] } : {}}
              transition={{
                repeat: speedTimeLeft < 30 ? Number.POSITIVE_INFINITY : 0,
                duration: 0.8,
              }}
              style={{
                background:
                  speedTimeLeft < 30
                    ? "oklch(0.55 0.22 30)"
                    : "oklch(var(--card))",
                border: "1.5px solid oklch(var(--border))",
                color:
                  speedTimeLeft < 30 ? "white" : "oklch(var(--foreground))",
                minWidth: "64px",
                textAlign: "center",
              }}
            >
              ⏱ {formatTime(speedTimeLeft)}
            </motion.div>
          ) : (
            <div
              className="rounded-xl px-3 py-1.5 font-bold text-sm font-display"
              style={{
                background: "oklch(var(--card))",
                border: "1.5px solid oklch(var(--border))",
                color: "oklch(var(--foreground))",
                minWidth: "64px",
                textAlign: "center",
              }}
            >
              {formatTime(timer)}
            </div>
          )}

          {gameMode !== "chain" && (
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{
                background: "oklch(var(--secondary))",
                color: "oklch(var(--foreground))",
              }}
            >
              {isPaused ? "▶" : "⏸"}
            </button>
          )}
        </div>
      </header>

      {/* Mode-specific header panels */}
      <div className="px-3 py-1.5 space-y-1.5">
        {/* Speed Rush: Combo */}
        {gameMode === "speed_rush" && combo >= 3 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-2 py-1.5 rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.2 52), oklch(0.55 0.22 30))",
            }}
          >
            <span className="text-white font-black font-display text-sm">
              🔥 {combo} {t("combo")} × {(1 + comboMultiplier * 0.3).toFixed(1)}
              x XP
            </span>
          </motion.div>
        )}

        {/* Survival: Lives */}
        {gameMode === "survival" && (
          <div className="flex items-center justify-center gap-3">
            <span
              className="text-sm font-bold"
              style={{ color: "oklch(var(--foreground))" }}
            >
              {t("lives")}:
            </span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={`life-${i}`}
                  className="text-2xl leading-none"
                  animate={
                    shakeHeart && i === lives
                      ? { x: [-4, 4, -4, 4, 0], rotate: [-10, 10, -10, 10, 0] }
                      : {}
                  }
                  style={{
                    opacity: i < lives ? 1 : 0.2,
                    filter: i < lives ? "none" : "grayscale(1)",
                  }}
                >
                  ❤️
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* Chain: Counter */}
        {gameMode === "chain" && (
          <div className="flex items-center justify-center gap-2">
            <span
              className="text-sm font-bold"
              style={{ color: "oklch(var(--foreground))" }}
            >
              {t("chain")}:
            </span>
            <motion.span
              key={chainCount}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              className="font-black font-display text-lg"
              style={{ color: "oklch(0.42 0.2 160)" }}
            >
              #{chainCount}
            </motion.span>
            <span
              className="text-sm font-bold"
              style={{ color: "oklch(0.42 0.2 160)" }}
            >
              {chainMultiplier} XP
            </span>
          </div>
        )}

        {/* Boss Battle: HP Bar */}
        {gameMode === "boss_battle" && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <motion.span
                className="text-2xl"
                animate={bossShake ? { x: [-6, 6, -6, 6, 0] } : {}}
              >
                🐉
              </motion.span>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span
                    className="font-bold"
                    style={{ color: "oklch(var(--foreground))" }}
                  >
                    {t("bossHp")}
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: "oklch(0.5 0.22 26)" }}
                  >
                    {bossHp} / {bossMaxHp}
                  </span>
                </div>
                <div
                  className="h-3 rounded-full overflow-hidden"
                  style={{ background: "oklch(var(--muted))" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${bossHpPercent}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    style={{
                      background:
                        bossHpPercent > 50
                          ? "linear-gradient(90deg, oklch(0.5 0.22 145), oklch(0.62 0.2 130))"
                          : bossHpPercent > 25
                            ? "linear-gradient(90deg, oklch(0.72 0.19 52), oklch(0.65 0.2 40))"
                            : "linear-gradient(90deg, oklch(0.5 0.22 26), oklch(0.62 0.22 340))",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blind Countdown is handled in board area -- no overlay needed here */}

        {/* Errors row */}
        {gameMode !== "survival" && (
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">💡</span>
              <div className="flex gap-1 flex-wrap max-w-24">
                {Array.from({ length: maxHints }, (_, i) => {
                  const dotKey = `hint-slot-${i + 1}`;
                  return (
                    <div
                      key={dotKey}
                      className="w-4 h-4 rounded-full"
                      style={{
                        background:
                          i < hintsLeft
                            ? "oklch(0.72 0.19 52)"
                            : "oklch(0.88 0.02 260)",
                        transition: "background 0.3s",
                      }}
                    />
                  );
                })}
              </div>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl"
              style={{
                background:
                  errorCount > 0
                    ? "oklch(var(--game-cell-error))"
                    : "oklch(var(--muted))",
              }}
            >
              <span>{errorCount > 0 ? "❌" : "✓"}</span>
              <span
                className="font-bold text-sm"
                style={{
                  color:
                    errorCount > 0
                      ? "oklch(var(--destructive))"
                      : "oklch(var(--muted-foreground))",
                }}
              >
                {errorCount} {t("errors")}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Board area */}
      <main
        className="flex-1 flex flex-col items-center justify-center px-3 py-1"
        style={{ minHeight: 0 }}
      >
        {/* Blind mode countdown: hide board completely */}
        {gameMode === "blind" && blindCountdown !== null ? (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <motion.div
              key={blindCountdown}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-8xl font-black font-display"
              style={{ color: "oklch(var(--foreground))" }}
            >
              {blindCountdown === 0 ? "👁️" : blindCountdown}
            </motion.div>
            <p
              className="mt-4 font-semibold text-lg"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {t("revealTime")}
            </p>
          </div>
        ) : isPaused ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center w-full h-full"
            style={{
              background: "oklch(var(--card) / 0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "24px",
              padding: "2rem",
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.4, type: "spring" }}
              className="text-7xl mb-5"
            >
              ⏸
            </motion.div>
            <h2
              className="text-2xl font-bold font-display mb-2"
              style={{ color: "oklch(var(--foreground))" }}
            >
              {t("pause")}
            </h2>
            <p
              className="text-sm mb-8"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {lang === "tr" ? "Bulmaca gizlendi" : "Puzzle is hidden"}
            </p>
            <button
              type="button"
              onClick={() => setIsPaused(false)}
              className="gradient-bg-purple-pink text-white font-bold px-10 py-3 rounded-2xl text-lg transition-all hover:scale-105 active:scale-95"
            >
              {t("resume")}
            </button>
          </motion.div>
        ) : (
          <SudokuBoard
            puzzle={puzzle}
            solution={solution}
            originalPuzzle={originalPuzzle}
            notes={notes}
            onCellChange={handleCellChange}
            isNoteMode={isNoteMode}
            errorCells={errorCells}
            hintCells={hintCells}
            isComplete={isComplete}
            blindHidden={
              gameMode === "blind" && isBlind ? blindHidden : undefined
            }
            fogRevealed={
              gameMode === "foggy" && fogRevealed.size > 0
                ? fogRevealed
                : undefined
            }
            highlightedNumber={highlightedNumber ?? undefined}
            onCellSelect={(val) => setHighlightedNumber(val)}
            lang={lang}
          />
        )}
      </main>

      {/* Controls */}
      {!isPaused && (
        <div className="flex items-center justify-center gap-2 px-3 py-2">
          <button
            type="button"
            data-ocid="game.note_toggle"
            onClick={() => {
              playSound("button_click");
              setIsNoteMode((n) => {
                if (!n) noteModeUsedRef.current = true;
                return !n;
              });
            }}
            className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-all hover:scale-105"
            style={{
              background: isNoteMode
                ? "oklch(var(--primary))"
                : "oklch(var(--secondary))",
              color: isNoteMode
                ? "oklch(var(--primary-foreground))"
                : "oklch(var(--primary))",
              minWidth: "60px",
            }}
          >
            <span className="text-lg">✏️</span>
            <span className="text-xs font-semibold">{t("notes")}</span>
          </button>

          <button
            type="button"
            data-ocid="game.hint_button"
            onClick={handleHint}
            disabled={hintsLeft === 0}
            className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background:
                hintsLeft > 0
                  ? "oklch(var(--accent))"
                  : "oklch(var(--secondary))",
              color:
                hintsLeft > 0
                  ? "oklch(var(--accent-foreground))"
                  : "oklch(var(--muted-foreground))",
              minWidth: "60px",
            }}
          >
            <span className="text-lg">💡</span>
            <span className="text-xs font-semibold">
              {t("hints")} ({hintsLeft})
            </span>
          </button>

          {/* Undo button */}
          <button
            type="button"
            data-ocid="game.undo_button"
            onClick={() => {
              playSound("button_click");
              handleUndo();
            }}
            disabled={moveHistory.length === 0}
            className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "oklch(var(--secondary))",
              color: "oklch(var(--primary))",
              minWidth: "60px",
            }}
          >
            <span className="text-lg">↩️</span>
            <span className="text-xs font-semibold">{t("undo")}</span>
          </button>

          {/* Auto-Notes button */}
          <button
            type="button"
            data-ocid="game.autonotes_button"
            onClick={() => {
              playSound("button_click");
              handleAutoNotes();
            }}
            className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-all hover:scale-105"
            style={{
              background: "oklch(var(--secondary))",
              color: "oklch(var(--primary))",
              minWidth: "60px",
            }}
          >
            <span className="text-lg">🔢</span>
            <span className="text-xs font-semibold">{t("autoNotes")}</span>
          </button>

          {/* Chain mode exit */}
          {gameMode === "chain" && (
            <button
              type="button"
              data-ocid="game.chain.exit.button"
              onClick={() => setShowChainSummary(true)}
              className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-all hover:scale-105"
              style={{
                background: "oklch(var(--secondary))",
                color: "oklch(var(--muted-foreground))",
                minWidth: "60px",
              }}
            >
              <span className="text-lg">🏁</span>
              <span className="text-xs font-semibold">
                {lang === "tr" ? "Bitir" : "End"}
              </span>
            </button>
          )}
        </div>
      )}

      {/* ---- Modals ---- */}

      {/* Standard Completion Modal */}
      <AnimatePresence>
        {showComplete &&
          gameMode !== "chain" &&
          gameMode !== "star_collector" &&
          gameMode !== "boss_battle" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{
                background: "oklch(0 0 0 / 0.5)",
                backdropFilter: "blur(4px)",
              }}
            >
              <motion.div
                data-ocid="game.complete.modal"
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
                style={{ background: "oklch(var(--card))" }}
              >
                <div className="text-5xl mb-4">🎉</div>
                <h2
                  className="text-2xl font-bold font-display mb-2"
                  style={{ color: "oklch(var(--card-foreground))" }}
                >
                  {t("puzzleComplete")}
                </h2>
                {newBadges.length > 0 && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center justify-center gap-2 mb-4 px-4 py-2 rounded-2xl text-sm font-bold"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.72 0.19 52 / 0.15), oklch(0.62 0.23 340 / 0.15))",
                      border: "1.5px solid oklch(0.72 0.19 52 / 0.4)",
                      color: "oklch(var(--card-foreground))",
                    }}
                  >
                    {newBadges[0]}
                  </motion.div>
                )}
                {/* Tournament Score */}
                {gameMode === "daily_tournament" && (
                  <div
                    className="mb-4 px-6 py-3 rounded-2xl"
                    style={{
                      background: "oklch(var(--secondary))",
                    }}
                  >
                    <div
                      className="text-3xl font-black font-display"
                      style={{ color: "oklch(var(--primary))" }}
                    >
                      {tournamentScore}
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: "oklch(var(--muted-foreground))" }}
                    >
                      {t("tournamentScore")}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {completionStats.map(({ label, value, emoji }) => (
                    <div
                      key={label}
                      className="rounded-2xl p-3"
                      style={{ background: "oklch(var(--muted))" }}
                    >
                      <div className="text-2xl mb-1">{emoji}</div>
                      <div
                        className="text-lg font-bold font-display"
                        style={{ color: "oklch(var(--card-foreground))" }}
                      >
                        {value}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "oklch(var(--muted-foreground))" }}
                      >
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  {/* Try Another Mode button */}
                  {onOpenModes && (
                    <button
                      type="button"
                      data-ocid="game.complete.try_mode_button"
                      onClick={onOpenModes}
                      className="w-full font-bold py-3 rounded-2xl text-sm transition-all hover:scale-105 text-white"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.42 0.22 292), oklch(0.62 0.23 340))",
                      }}
                    >
                      🎮 {lang === "tr" ? "Başka Mod Dene" : "Try Another Mode"}
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-ocid="game.complete.secondary_button"
                      onClick={async () => {
                        const elapsed =
                          gameMode === "speed_rush"
                            ? SPEED_RUSH_DURATION - speedTimeLeft
                            : timer;
                        const text = buildShareText(
                          gameMode,
                          errorCount,
                          hintsUsed,
                          elapsed,
                          earnedXP,
                          lang,
                        );
                        if (navigator.share && navigator.canShare?.({ text })) {
                          try {
                            await navigator.share({ text });
                          } catch (_) {
                            /* user cancelled */
                          }
                        } else {
                          navigator.clipboard.writeText(text).then(() => {
                            toast.success(t("shareCopied"), { duration: 2000 });
                          });
                        }
                      }}
                      className="flex-1 font-bold py-3 rounded-2xl text-sm border-2 transition-all hover:scale-105"
                      style={{
                        border: "2px solid oklch(var(--primary))",
                        color: "oklch(var(--primary))",
                        background: "transparent",
                      }}
                    >
                      📤 {t("shareResult")}
                    </button>
                    <button
                      type="button"
                      data-ocid="game.complete.confirm_button"
                      onClick={onBack}
                      className="flex-1 gradient-bg-purple-pink text-white font-bold py-3 rounded-2xl text-sm transition-all hover:scale-105"
                    >
                      {t("backToHome")}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Speed Rush: Time's Up */}
      <AnimatePresence>
        {showTimeUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "oklch(0 0 0 / 0.6)",
              backdropFilter: "blur(4px)",
            }}
          >
            <motion.div
              data-ocid="game.timeup.modal"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.18 0.06 26), oklch(0.25 0.08 20))",
              }}
            >
              <div className="text-5xl mb-3">{isComplete ? "🎉" : "⏰"}</div>
              <h2 className="text-2xl font-bold font-display text-white mb-2">
                {isComplete ? t("puzzleComplete") : t("timeUp")}
              </h2>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.08)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {lang === "tr" ? "Combo" : "Combo"}
                  </div>
                  <div className="text-white font-bold text-lg">🔥 {combo}</div>
                </div>
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.08)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {lang === "tr" ? "Hata" : "Errors"}
                  </div>
                  <div className="text-white font-bold text-lg">
                    ❌ {errorCount}
                  </div>
                </div>
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.08)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {t("timeLabel")}
                  </div>
                  <div className="text-white font-bold text-lg">
                    ⏱ {formatTime(SPEED_RUSH_DURATION - speedTimeLeft)}
                  </div>
                </div>
                {isComplete && (
                  <div
                    className="rounded-xl p-2.5 text-left"
                    style={{ background: "oklch(0.55 0.2 52 / 0.3)" }}
                  >
                    <div className="text-white/50 text-xs mb-0.5">
                      {t("xpEarned")}
                    </div>
                    <div className="text-white font-bold text-lg">
                      ⭐ +{earnedXP}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {onPlayAgain && (
                  <button
                    type="button"
                    data-ocid="game.timeup.play_again_button"
                    onClick={onPlayAgain}
                    className="flex-1 font-bold py-3 rounded-2xl text-sm"
                    style={{
                      background: "oklch(0.55 0.2 145)",
                      color: "white",
                    }}
                  >
                    {t("playAgain")} ⚡
                  </button>
                )}
                <button
                  type="button"
                  data-ocid="game.timeup.confirm_button"
                  onClick={onBack}
                  className="flex-1 bg-white font-bold py-3 rounded-2xl text-sm"
                  style={{ color: "oklch(0.4 0.18 26)" }}
                >
                  {t("back")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Survival: Game Over */}
      <AnimatePresence>
        {showGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "oklch(0 0 0 / 0.7)",
              backdropFilter: "blur(6px)",
            }}
          >
            <motion.div
              data-ocid="game.gameover.modal"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.15 0.08 10), oklch(0.25 0.1 340))",
              }}
            >
              <div className="text-5xl mb-3">💔</div>
              <h2 className="text-2xl font-bold font-display text-white mb-2">
                {t("gameOver")}
              </h2>
              <div className="text-white/60 text-sm mb-2">
                {lang === "tr"
                  ? `${errorCount} hata yaptın`
                  : `${errorCount} errors made`}
              </div>
              <div className="text-white/60 text-sm mb-6">
                {formatTime(timer)} {t("time")}
              </div>
              <div className="flex flex-col gap-2">
                {onOpenModes && (
                  <button
                    type="button"
                    data-ocid="game.gameover.try_mode_button"
                    onClick={onOpenModes}
                    className="w-full font-bold py-3 rounded-2xl text-sm text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.42 0.22 292), oklch(0.62 0.23 340))",
                    }}
                  >
                    🎮 {lang === "tr" ? "Başka Mod Dene" : "Try Another Mode"}
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-ocid="game.gameover.play_again_button"
                    onClick={() => {
                      // Reset survival state and regenerate puzzle
                      setShowGameOver(false);
                      setIsComplete(false);
                      setLives(3);
                      setErrorCount(0);
                      setHintsUsed(0);
                      setHintsLeft(3);
                      setTimer(0);
                      setErrorCells(new Set());
                      setNotes(new Map());
                      setHintCells(new Set());
                      setIsNoteMode(false);
                      noteModeUsedRef.current = false;
                      setIsLoading(true);
                      setTimeout(() => {
                        const { puzzle: p, solution: s } =
                          generatePuzzle(effectiveDifficulty);
                        setPuzzle(p);
                        setSolution(s);
                        setOriginalPuzzle(p.map((row) => [...row]));
                        setIsLoading(false);
                      }, 100);
                    }}
                    className="flex-1 font-bold py-3 rounded-2xl text-sm"
                    style={{
                      background: "oklch(0.55 0.2 145)",
                      color: "white",
                    }}
                  >
                    {lang === "tr" ? "Tekrar Dene 🔄" : "Try Again 🔄"}
                  </button>
                  <button
                    type="button"
                    data-ocid="game.gameover.confirm_button"
                    onClick={onBack}
                    className="flex-1 bg-white font-bold py-3 rounded-2xl text-sm"
                    style={{ color: "oklch(0.4 0.2 340)" }}
                  >
                    {t("back")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* One Error Mode: Game Over */}
      <AnimatePresence>
        {showOneErrorGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "oklch(0 0 0 / 0.8)",
              backdropFilter: "blur(8px)",
            }}
          >
            <motion.div
              data-ocid="game.one_error_gameover.modal"
              initial={{ scale: 0.7, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.12 0.06 10), oklch(0.22 0.12 350))",
              }}
            >
              <div className="text-6xl mb-3">☠️</div>
              <h2 className="text-2xl font-bold font-display text-white mb-2">
                {t("gameOver")}
              </h2>
              <p className="text-white/60 text-sm mb-6">
                {lang === "tr"
                  ? "Bir hata yaptın. Mükemmel oynamalısın!"
                  : lang === "ar"
                    ? "ارتكبت خطأً. يجب أن تلعب بشكل مثالي!"
                    : "One mistake. You must play perfectly!"}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-ocid="game.one_error_gameover.play_again_button"
                  onClick={() => {
                    setShowOneErrorGameOver(false);
                    setIsComplete(false);
                    setErrorCount(0);
                    setHintsUsed(0);
                    setHintsLeft(maxHints);
                    setTimer(0);
                    setErrorCells(new Set());
                    setNotes(new Map());
                    setHintCells(new Set());
                    setIsNoteMode(false);
                    noteModeUsedRef.current = false;
                    // Reset blind mode state
                    setIsBlind(false);
                    setBlindHidden(new Set());
                    setBlindCountdown(null);
                    setFogRevealed(new Set());
                    setMoveHistory([]);
                    setIsLoading(true);
                    setTimeout(() => {
                      const { puzzle: p, solution: s } =
                        generatePuzzle(effectiveDifficulty);
                      setPuzzle(p);
                      setSolution(s);
                      setOriginalPuzzle(p.map((row) => [...row]));
                      // Re-init blind countdown for blind/one_error combo
                      if (gameMode === "blind") {
                        setBlindCountdown(5);
                      }
                      // Re-init fog for foggy mode
                      if (gameMode === "foggy") {
                        setFogRevealed(initFogRevealedCells(p));
                      }
                      setIsLoading(false);
                    }, 100);
                  }}
                  className="flex-1 font-bold py-3 rounded-2xl text-sm"
                  style={{ background: "oklch(0.55 0.2 145)", color: "white" }}
                >
                  {lang === "tr" ? "Tekrar Dene 🔄" : "Try Again 🔄"}
                </button>
                <button
                  type="button"
                  data-ocid="game.one_error_gameover.confirm_button"
                  onClick={onBack}
                  className="flex-1 bg-white font-bold py-3 rounded-2xl text-sm"
                  style={{ color: "oklch(0.4 0.12 350)" }}
                >
                  {t("back")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chain Mode: Complete puzzle, auto-advance or stop */}
      <AnimatePresence>
        {isComplete && gameMode === "chain" && !showChainSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "oklch(0 0 0 / 0.5)",
              backdropFilter: "blur(4px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.2 0.1 160), oklch(0.35 0.15 175))",
              }}
            >
              <div className="text-5xl mb-3">⛓️</div>
              <div className="text-4xl font-black font-display text-white mb-1">
                #{chainCount}
              </div>
              <p className="text-white/80 mb-4">
                {lang === "tr" ? "Harika! Devam et!" : "Great! Keep going!"}
              </p>
              {/* Auto-advance countdown indicator */}
              {chainAutoAdvanceCountdown !== null && (
                <motion.div
                  key={chainAutoAdvanceCountdown}
                  initial={{ scale: 1.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mb-4"
                >
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold"
                    style={{
                      background: "oklch(1 0 0 / 0.15)",
                      color: "oklch(0.85 0.15 150)",
                    }}
                  >
                    <span>
                      {lang === "tr" ? "Otomatik devam" : "Auto-continuing"}
                    </span>
                    <motion.span
                      key={chainAutoAdvanceCountdown}
                      initial={{ scale: 1.6 }}
                      animate={{ scale: 1 }}
                      className="font-black text-white text-base w-5 inline-block text-center"
                    >
                      {chainAutoAdvanceCountdown}
                    </motion.span>
                  </div>
                </motion.div>
              )}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  data-ocid="game.chain.next.button"
                  onClick={() => {
                    setChainAutoAdvanceCountdown(null);
                    handleChainNext();
                  }}
                  className="font-bold py-3 rounded-2xl text-white"
                  style={{ background: "oklch(0.55 0.2 145)" }}
                >
                  {lang === "tr"
                    ? `Devam ⚡${chainAutoAdvanceCountdown !== null ? ` (${chainAutoAdvanceCountdown})` : ""}`
                    : `Continue ⚡${chainAutoAdvanceCountdown !== null ? ` (${chainAutoAdvanceCountdown})` : ""}`}
                </button>
                <button
                  type="button"
                  data-ocid="game.chain.stop.button"
                  onClick={() => {
                    setChainAutoAdvanceCountdown(null);
                    setShowChainSummary(true);
                  }}
                  className="font-bold py-3 rounded-2xl"
                  style={{
                    background: "oklch(0.9 0.02 260)",
                    color: "oklch(0.35 0.04 264)",
                  }}
                >
                  {lang === "tr" ? "Dur 🏁" : "Stop 🏁"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chain Summary Modal */}
      <AnimatePresence>
        {showChainSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "oklch(0 0 0 / 0.5)",
              backdropFilter: "blur(4px)",
            }}
          >
            <motion.div
              data-ocid="game.chain.summary.modal"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
              style={{ background: "oklch(var(--card))" }}
            >
              <div className="text-5xl mb-3">⛓️</div>
              <h2
                className="text-2xl font-bold font-display mb-4"
                style={{ color: "oklch(var(--card-foreground))" }}
              >
                {t("chainRecord")}
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div
                  className="rounded-2xl p-3"
                  style={{ background: "oklch(var(--secondary))" }}
                >
                  <div
                    className="text-2xl font-black font-display"
                    style={{ color: "oklch(var(--primary))" }}
                  >
                    {chainCount}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "oklch(var(--muted-foreground))" }}
                  >
                    {t("chain")}
                  </div>
                </div>
                <div
                  className="rounded-2xl p-3"
                  style={{ background: "oklch(var(--secondary))" }}
                >
                  <div
                    className="text-2xl font-black font-display"
                    style={{ color: "oklch(var(--primary))" }}
                  >
                    +{chainTotalXP}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "oklch(var(--muted-foreground))" }}
                  >
                    {t("xpEarned")}
                  </div>
                </div>
                <div
                  className="rounded-2xl p-3"
                  style={{ background: "oklch(var(--muted))" }}
                >
                  <div
                    className="text-lg font-black font-display"
                    style={{ color: "oklch(var(--foreground))" }}
                  >
                    {formatTime(chainTotalTime)}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "oklch(var(--muted-foreground))" }}
                  >
                    {lang === "tr" ? "Toplam Süre" : "Total Time"}
                  </div>
                </div>
                <div
                  className="rounded-2xl p-3"
                  style={{ background: "oklch(var(--muted))" }}
                >
                  <div
                    className="text-lg font-black font-display"
                    style={{
                      color:
                        chainTotalErrors === 0
                          ? "oklch(0.68 0.2 145)"
                          : "oklch(0.62 0.23 340)",
                    }}
                  >
                    {chainTotalErrors === 0 ? "✓ 0" : chainTotalErrors}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "oklch(var(--muted-foreground))" }}
                  >
                    {lang === "tr" ? "Toplam Hata" : "Total Errors"}
                  </div>
                </div>
                <div
                  className="rounded-2xl p-3 col-span-2"
                  style={{
                    background: "oklch(0.52 0.2 160 / 0.15)",
                    border: "1px solid oklch(0.52 0.2 160 / 0.3)",
                  }}
                >
                  <div
                    className="text-2xl font-black font-display"
                    style={{ color: "oklch(0.42 0.2 160)" }}
                  >
                    🏆 {getChainRecord()}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "oklch(var(--muted-foreground))" }}
                  >
                    {lang === "tr"
                      ? "En İyi Zincir Rekoru"
                      : "Personal Best Chain"}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {onOpenModes && (
                  <button
                    type="button"
                    data-ocid="game.chain.try_mode_button"
                    onClick={onOpenModes}
                    className="w-full font-bold py-3 rounded-2xl text-sm text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.42 0.22 292), oklch(0.62 0.23 340))",
                    }}
                  >
                    🎮 {lang === "tr" ? "Başka Mod Dene" : "Try Another Mode"}
                  </button>
                )}
                <div className="flex gap-2">
                  {onPlayAgain && (
                    <button
                      type="button"
                      data-ocid="game.chain.play_again_button"
                      onClick={onPlayAgain}
                      className="flex-1 font-bold py-3 rounded-2xl text-sm"
                      style={{
                        background: "oklch(0.55 0.2 145)",
                        color: "white",
                      }}
                    >
                      {t("playAgain")} ⛓️
                    </button>
                  )}
                  <button
                    type="button"
                    data-ocid="game.chain.confirm_button"
                    onClick={onBack}
                    className="flex-1 gradient-bg-purple-pink text-white font-bold py-3 rounded-2xl text-sm"
                  >
                    {t("backToHome")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Star Collector Modal */}
      <AnimatePresence>
        {showStars && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "oklch(0 0 0 / 0.5)",
              backdropFilter: "blur(4px)",
            }}
          >
            <motion.div
              data-ocid="game.stars.modal"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.15 0.08 290), oklch(0.28 0.14 300))",
              }}
            >
              <h2 className="text-2xl font-bold font-display text-white mb-6">
                {t("starsEarned")}
              </h2>
              <div className="flex justify-center gap-3 mb-6">
                {[1, 2, 3].map((i) => (
                  <motion.span
                    key={`star-${i}`}
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: i <= starsEarned ? 1 : 0.6, rotate: 0 }}
                    transition={{
                      delay: i * 0.15,
                      type: "spring",
                      stiffness: 200,
                    }}
                    className="text-5xl"
                    style={{ opacity: i <= starsEarned ? 1 : 0.25 }}
                  >
                    ⭐
                  </motion.span>
                ))}
              </div>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2 mb-4 w-full">
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.1)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {t("timeLabel")}
                  </div>
                  <div className="text-white font-bold text-base">
                    ⏱ {formatTime(timer)}
                  </div>
                </div>
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.1)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {t("xpEarned")}
                  </div>
                  <div className="text-white font-bold text-base">
                    ⭐ +{earnedXP}
                  </div>
                </div>
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.1)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {t("hintsUsed")}
                  </div>
                  <div className="text-white font-bold text-base">
                    💡 {hintsUsed}
                  </div>
                </div>
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.1)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {lang === "tr" ? "Toplam Yıldız" : "Total Stars"}
                  </div>
                  <div className="text-white font-bold text-base">
                    ⭐ {getStarTotal()}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full">
                {onOpenModes && (
                  <button
                    type="button"
                    data-ocid="game.stars.try_mode_button"
                    onClick={onOpenModes}
                    className="w-full font-bold py-3 rounded-2xl text-sm text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.42 0.22 292), oklch(0.62 0.23 340))",
                    }}
                  >
                    🎮 {lang === "tr" ? "Başka Mod Dene" : "Try Another Mode"}
                  </button>
                )}
                <div className="flex gap-2">
                  {onPlayAgain && (
                    <button
                      type="button"
                      data-ocid="game.stars.play_again_button"
                      onClick={onPlayAgain}
                      className="flex-1 font-bold py-3 rounded-2xl text-sm"
                      style={{
                        background: "oklch(0.55 0.2 145)",
                        color: "white",
                      }}
                    >
                      {t("playAgain")} ⭐
                    </button>
                  )}
                  <button
                    type="button"
                    data-ocid="game.stars.confirm_button"
                    onClick={onBack}
                    className="flex-1 bg-white font-bold py-3 rounded-2xl text-sm"
                    style={{ color: "oklch(0.42 0.2 300)" }}
                  >
                    {t("backToHome")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boss Defeated Modal */}
      <AnimatePresence>
        {showBossDefeated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "oklch(0 0 0 / 0.7)",
              backdropFilter: "blur(8px)",
            }}
          >
            <motion.div
              data-ocid="game.boss.defeated.modal"
              initial={{ scale: 0.5, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl overflow-hidden relative"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.12 0.06 20), oklch(0.3 0.18 30))",
              }}
            >
              {/* Particle explosion */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {BOSS_PARTICLES.map((p, i) => (
                  <motion.div
                    key={p.id}
                    className="absolute w-2 h-2 rounded-full"
                    style={{ top: "50%", left: "50%", background: p.color }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: p.dx * 3, y: p.dy * 3, opacity: 0, scale: 0 }}
                    transition={{ duration: 0.8, delay: i * 0.02 }}
                  />
                ))}
              </div>

              {/* Flash overlay */}
              <motion.div
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0"
                style={{ background: "oklch(0.9 0.18 52)" }}
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-6xl mb-3 relative"
              >
                💀
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-black font-display text-white mb-2 relative"
              >
                {t("bossDefeated")}
              </motion.h2>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-1 mb-6 relative"
              >
                <div className="text-white/70 text-sm">{formatTime(timer)}</div>
                <div className="text-white/70 text-sm">+{earnedXP} XP</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex flex-col gap-2 relative"
              >
                {onOpenModes && (
                  <button
                    type="button"
                    data-ocid="game.boss.try_mode_button"
                    onClick={onOpenModes}
                    className="w-full font-bold py-3 rounded-2xl text-sm text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.42 0.22 292), oklch(0.62 0.23 340))",
                    }}
                  >
                    🎮 {lang === "tr" ? "Başka Mod Dene" : "Try Another Mode"}
                  </button>
                )}
                <div className="flex gap-2">
                  {onPlayAgain && (
                    <button
                      type="button"
                      data-ocid="game.boss.play_again_button"
                      onClick={onPlayAgain}
                      className="flex-1 bg-white/20 font-bold py-3 rounded-2xl text-sm"
                      style={{ color: "white" }}
                    >
                      {t("playAgain")} 🐉
                    </button>
                  )}
                  <button
                    type="button"
                    data-ocid="game.boss.confirm_button"
                    onClick={onBack}
                    className="flex-1 bg-white font-bold py-3 rounded-2xl text-sm"
                    style={{ color: "oklch(0.35 0.15 20)" }}
                  >
                    🏆 {t("backToHome")}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rank Up Celebration Overlay */}
      <AnimatePresence>
        {showRankUp && rankUpInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{
              background: "oklch(0 0 0 / 0.8)",
              backdropFilter: "blur(8px)",
            }}
            onClick={() => setShowRankUp(false)}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0, 0.2, 0] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.19 52 / 0.3), oklch(0.62 0.23 340 / 0.3), transparent)",
              }}
            />

            <motion.div
              data-ocid="game.rankup.modal"
              initial={{ scale: 0.5, y: 60 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.15 0.08 280), oklch(0.28 0.16 300))",
              }}
            >
              {/* Particle burst */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {RANKUP_PARTICLES.map((p, i) => (
                  <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                      top: "50%",
                      left: "50%",
                      width: 8,
                      height: 8,
                      background: p.color,
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: p.dx * 2, y: p.dy * 2, opacity: 0, scale: 0 }}
                    transition={{ duration: 1, delay: i * 0.03 }}
                  />
                ))}
              </div>

              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                className="text-6xl mb-4 relative"
              >
                🏆
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-black font-display text-white mb-5"
              >
                {t("rankUp")}
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="flex items-center justify-center gap-4 mb-6"
              >
                <div
                  className="rounded-2xl px-4 py-2 text-sm font-bold"
                  style={{
                    background: "oklch(1 0 0 / 0.1)",
                    color: "oklch(0.85 0.05 280)",
                  }}
                >
                  {rankUpInfo.oldRank}
                </div>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.5, 1] }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="text-2xl"
                >
                  →
                </motion.span>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
                  className="rounded-2xl px-4 py-2 text-sm font-black"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.72 0.19 52), oklch(0.62 0.23 340))",
                    color: "white",
                  }}
                >
                  {rankUpInfo.newRank}
                </motion.div>
              </motion.div>

              <motion.button
                type="button"
                data-ocid="game.rankup.close_button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={() => setShowRankUp(false)}
                className="w-full font-bold py-3 rounded-2xl text-sm relative"
                style={{
                  background: "oklch(1 0 0 / 0.15)",
                  color: "white",
                  border: "1.5px solid oklch(1 0 0 / 0.25)",
                }}
              >
                {lang === "tr" ? "Harika! 🎉" : "Awesome! 🎉"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* One Error Mode Completion Modal */}
      <AnimatePresence>
        {showOneErrorComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "oklch(0 0 0 / 0.75)",
              backdropFilter: "blur(8px)",
            }}
          >
            <motion.div
              data-ocid="game.one_error_complete.modal"
              initial={{ scale: 0.7, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl overflow-hidden relative"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.14 0.06 10), oklch(0.28 0.12 340))",
              }}
            >
              {/* Particle burst */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {RANKUP_PARTICLES.map((p, i) => (
                  <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                      top: "50%",
                      left: "50%",
                      width: 6,
                      height: 6,
                      background: p.color,
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: p.dx * 2.5,
                      y: p.dy * 2.5,
                      opacity: 0,
                      scale: 0,
                    }}
                    transition={{ duration: 1.2, delay: i * 0.04 }}
                  />
                ))}
              </div>

              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: [0, 1.3, 1], rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 280 }}
                className="text-6xl mb-3 relative"
              >
                ☠️
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-2xl font-black font-display text-white mb-1 relative"
              >
                {lang === "tr" ? "Mükemmel Oyun!" : "Flawless Victory!"}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/70 text-sm mb-5 relative"
              >
                {lang === "tr"
                  ? "Sıfır Tolerans modunu hatasız tamamladın!"
                  : "You completed Zero Tolerance mode without a single mistake!"}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="grid grid-cols-2 gap-2 mb-6 relative"
              >
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.1)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {t("timeLabel")}
                  </div>
                  <div className="text-white font-bold text-base">
                    ⏱ {formatTime(timer)}
                  </div>
                </div>
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.1)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {t("xpEarned")}
                  </div>
                  <div className="text-white font-bold text-base">
                    ⭐ +{earnedXP}
                  </div>
                </div>
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.1)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {t("hintsUsed")}
                  </div>
                  <div className="text-white font-bold text-base">
                    💡 {hintsUsed}
                  </div>
                </div>
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(0.55 0.2 145 / 0.3)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {lang === "tr" ? "Hata" : "Errors"}
                  </div>
                  <div className="text-white font-bold text-base">✓ 0</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col gap-2 relative"
              >
                {onOpenModes && (
                  <button
                    type="button"
                    data-ocid="game.one_error_complete.try_mode_button"
                    onClick={onOpenModes}
                    className="w-full font-bold py-3 rounded-2xl text-sm text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.42 0.22 292), oklch(0.62 0.23 340))",
                    }}
                  >
                    🎮 {lang === "tr" ? "Başka Mod Dene" : "Try Another Mode"}
                  </button>
                )}
                <div className="flex gap-2">
                  {onPlayAgain && (
                    <button
                      type="button"
                      data-ocid="game.one_error_complete.play_again_button"
                      onClick={onPlayAgain}
                      className="flex-1 font-bold py-3 rounded-2xl text-sm"
                      style={{
                        background: "oklch(0.55 0.2 145)",
                        color: "white",
                      }}
                    >
                      {t("playAgain")} ☠️
                    </button>
                  )}
                  <button
                    type="button"
                    data-ocid="game.one_error_complete.confirm_button"
                    onClick={onBack}
                    className="flex-1 bg-white font-bold py-3 rounded-2xl text-sm"
                    style={{ color: "oklch(0.4 0.12 350)" }}
                  >
                    {t("backToHome")}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blind Mode Completion Modal */}
      <AnimatePresence>
        {showBlindComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "oklch(0 0 0 / 0.75)",
              backdropFilter: "blur(8px)",
            }}
          >
            <motion.div
              data-ocid="game.blind.complete.modal"
              initial={{ scale: 0.7, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl overflow-hidden relative"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.14 0.06 275), oklch(0.28 0.12 290))",
              }}
            >
              {/* Particle burst */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {RANKUP_PARTICLES.map((p, i) => (
                  <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                      top: "50%",
                      left: "50%",
                      width: 6,
                      height: 6,
                      background: p.color,
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: p.dx * 2.5,
                      y: p.dy * 2.5,
                      opacity: 0,
                      scale: 0,
                    }}
                    transition={{ duration: 1.2, delay: i * 0.04 }}
                  />
                ))}
              </div>

              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: [0, 1.3, 1], rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 280 }}
                className="text-6xl mb-3 relative"
              >
                👁️
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-2xl font-black font-display text-white mb-1 relative"
              >
                {lang === "tr" ? "Hafızan Çok Güçlü!" : "Memory Master!"}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/70 text-sm mb-5 relative"
              >
                {lang === "tr"
                  ? "Kör modunda bulmacayı çözdün!"
                  : "You solved the puzzle in blind mode!"}
              </motion.p>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="grid grid-cols-2 gap-2 mb-6 relative"
              >
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.1)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {t("timeLabel")}
                  </div>
                  <div className="text-white font-bold text-base">
                    ⏱ {formatTime(timer)}
                  </div>
                </div>
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.1)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {t("xpEarned")}
                  </div>
                  <div className="text-white font-bold text-base">
                    ⭐ +{earnedXP}
                  </div>
                </div>
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.1)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {t("hintsUsed")}
                  </div>
                  <div className="text-white font-bold text-base">
                    💡 {hintsUsed}
                  </div>
                </div>
                <div
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: "oklch(1 0 0 / 0.1)" }}
                >
                  <div className="text-white/50 text-xs mb-0.5">
                    {t("errorsCount")}
                  </div>
                  <div className="text-white font-bold text-base">
                    ❌ {errorCount}
                  </div>
                </div>
              </motion.div>

              <div className="flex flex-col gap-2 relative">
                {/* Blind play-again countdown indicator */}
                {blindPlayAgainCountdown !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 py-2 rounded-2xl text-sm font-bold"
                    style={{
                      background: "oklch(1 0 0 / 0.12)",
                      color: "oklch(0.85 0.12 280)",
                    }}
                  >
                    <span>👁️</span>
                    <span>
                      {lang === "tr"
                        ? "Ezberleme başlıyor..."
                        : "Memorise in..."}
                    </span>
                    <motion.span
                      key={blindPlayAgainCountdown}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      className="font-black text-white text-base w-5 inline-block text-center"
                    >
                      {blindPlayAgainCountdown}
                    </motion.span>
                  </motion.div>
                )}
                <div className="flex gap-2">
                  <motion.button
                    type="button"
                    data-ocid="game.blind.play_again_button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    onClick={() => {
                      // Start 3-second countdown before loading new puzzle
                      setBlindPlayAgainCountdown(3);
                    }}
                    disabled={blindPlayAgainCountdown !== null}
                    className="flex-1 font-bold py-3 rounded-2xl text-sm disabled:opacity-50"
                    style={{
                      background: "oklch(0.55 0.2 145)",
                      color: "white",
                    }}
                  >
                    {blindPlayAgainCountdown !== null
                      ? `${blindPlayAgainCountdown}...`
                      : `${t("playAgain")} 👁️`}
                  </motion.button>
                  <motion.button
                    type="button"
                    data-ocid="game.blind.confirm_button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    onClick={onBack}
                    className="flex-1 bg-white font-bold py-3 rounded-2xl text-sm"
                    style={{ color: "oklch(0.35 0.12 280)" }}
                  >
                    {t("backToHome")}
                  </motion.button>
                </div>
                <motion.button
                  type="button"
                  data-ocid="game.blind.secondary_button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  onClick={async () => {
                    const text = buildShareText(
                      "blind",
                      errorCount,
                      hintsUsed,
                      timer,
                      earnedXP,
                      lang,
                    );
                    if (navigator.share && navigator.canShare?.({ text })) {
                      try {
                        await navigator.share({ text });
                      } catch (_) {
                        /* user cancelled */
                      }
                    } else {
                      navigator.clipboard.writeText(text).then(() => {
                        toast.success(t("shareCopied"), { duration: 2000 });
                      });
                    }
                  }}
                  className="w-full font-bold py-2.5 rounded-2xl text-sm"
                  style={{
                    border: "1.5px solid oklch(1 0 0 / 0.3)",
                    color: "oklch(1 0 0 / 0.8)",
                    background: "transparent",
                  }}
                >
                  📤 {t("shareResult")}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
