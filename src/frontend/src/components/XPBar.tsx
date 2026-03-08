import React from "react";
import { type Lang, useTranslation } from "../i18n";

const RANKS = [
  { name_tr: "Başlangıç", name_en: "Beginner", xp: 0 },
  { name_tr: "Çırak", name_en: "Apprentice", xp: 200 },
  { name_tr: "Kaşif", name_en: "Explorer", xp: 500 },
  { name_tr: "Çözücü", name_en: "Solver", xp: 1000 },
  { name_tr: "Taktikçi", name_en: "Tactician", xp: 2000 },
  { name_tr: "Stratejist", name_en: "Strategist", xp: 3500 },
  { name_tr: "Uzman", name_en: "Expert", xp: 5500 },
  { name_tr: "Usta", name_en: "Master", xp: 8000 },
  { name_tr: "GrandUsta", name_en: "GrandMaster", xp: 12000 },
  { name_tr: "Efsane", name_en: "Legend", xp: 18000 },
];

export function getRankInfo(xp: number, lang: Lang = "tr") {
  const xpNum = typeof xp === "bigint" ? Number(xp) : xp;
  let rankIndex = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xpNum >= RANKS[i].xp) {
      rankIndex = i;
      break;
    }
  }
  const currentRank = RANKS[rankIndex];
  const nextRank = RANKS[Math.min(rankIndex + 1, RANKS.length - 1)];
  const isMax = rankIndex === RANKS.length - 1;

  const currentXpThreshold = currentRank.xp;
  const nextXpThreshold = nextRank.xp;
  const xpInLevel = xpNum - currentXpThreshold;
  const xpNeeded = nextXpThreshold - currentXpThreshold;
  const progress = isMax ? 100 : Math.min(100, (xpInLevel / xpNeeded) * 100);

  return {
    rankIndex,
    rankName: lang === "tr" ? currentRank.name_tr : currentRank.name_en,
    nextRankName: lang === "tr" ? nextRank.name_tr : nextRank.name_en,
    progress,
    xpToNext: isMax ? 0 : xpNeeded - xpInLevel,
    isMax,
  };
}

interface XPBarProps {
  xp: number | bigint;
  lang: Lang;
}

export function XPBar({ xp, lang }: XPBarProps) {
  const _t = useTranslation(lang);
  const xpNum = typeof xp === "bigint" ? Number(xp) : xp;
  const { rankName, nextRankName, progress, xpToNext, isMax } = getRankInfo(
    xpNum,
    lang,
  );

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between">
        <span
          className="font-semibold font-display text-sm"
          style={{ color: "oklch(var(--primary))" }}
        >
          {rankName}
        </span>
        {!isMax && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "oklch(var(--primary) / 0.12)",
              color: "oklch(var(--primary))",
              border: "1px solid oklch(var(--primary) / 0.25)",
            }}
          >
            {xpToNext.toLocaleString()} XP → {nextRankName}
          </span>
        )}
        {isMax && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "oklch(0.72 0.19 52 / 0.15)",
              color: "oklch(0.72 0.19 52)",
              border: "1px solid oklch(0.72 0.19 52 / 0.3)",
            }}
          >
            MAX ✨
          </span>
        )}
      </div>
      <div
        className="h-3 rounded-full overflow-hidden"
        style={{ background: "oklch(var(--muted))" }}
      >
        <div
          className="h-full rounded-full xp-bar-fill transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        className="text-xs text-right"
        style={{ color: "oklch(var(--muted-foreground))" }}
      >
        {xpNum.toLocaleString()} XP
      </div>
    </div>
  );
}
