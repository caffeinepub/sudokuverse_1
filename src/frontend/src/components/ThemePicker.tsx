import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "motion/react";
import React from "react";
import { useTheme } from "../context/ThemeContext";
import type { Lang } from "../i18n";
import { THEMES, type ThemeId } from "../themes";

interface ThemePickerProps {
  lang: Lang;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const THEME_SECTION_TITLE: Record<Lang, string> = {
  tr: "🎨 Tema Seç",
  en: "🎨 Choose Theme",
  de: "🎨 Thema wählen",
  fr: "🎨 Choisir le thème",
  es: "🎨 Elegir tema",
  it: "🎨 Scegli tema",
  pt: "🎨 Escolher tema",
  ru: "🎨 Выбрать тему",
  ja: "🎨 テーマを選択",
  ko: "🎨 테마 선택",
  zh: "🎨 选择主题",
  ar: "🎨 اختر السمة",
  hi: "🎨 थीम चुनें",
};

export function ThemePicker({ lang, open, onOpenChange }: ThemePickerProps) {
  const { theme: activeTheme, setTheme } = useTheme();

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="theme.picker.dialog"
        className="max-w-sm rounded-3xl p-0 overflow-hidden border-0"
        style={{
          background: "oklch(var(--background))",
          border: "1.5px solid oklch(var(--border))",
        }}
      >
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle
            className="text-xl font-black font-display"
            style={{ color: "oklch(var(--foreground))" }}
          >
            {THEME_SECTION_TITLE[lang]}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5">
          <div className="grid grid-cols-3 gap-2.5">
            {THEMES.map((themeObj, i) => {
              const isActive = activeTheme === themeObj.id;
              return (
                <motion.button
                  key={themeObj.id}
                  type="button"
                  data-ocid={`theme.option.${themeObj.id}`}
                  onClick={() => handleSelect(themeObj.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="relative overflow-hidden rounded-2xl text-center transition-all"
                  style={{
                    border: isActive
                      ? `2.5px solid ${themeObj.swatchBg}`
                      : "1.5px solid oklch(var(--border))",
                    boxShadow: isActive
                      ? `0 0 0 1px ${themeObj.swatchBg}55, 0 4px 14px ${themeObj.swatchBg}33`
                      : "0 1px 4px rgba(0,0,0,0.1)",
                    aspectRatio: "9/10",
                  }}
                >
                  {/* Thumbnail: image or color swatch */}
                  {themeObj.backgroundImage ? (
                    <div className="absolute inset-0">
                      <img
                        src={themeObj.backgroundImage}
                        alt={themeObj.names[lang] ?? themeObj.names.en}
                        className="w-full h-full object-cover"
                        style={{ display: "block" }}
                      />
                      {/* Gradient overlay for text legibility */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)",
                        }}
                      />
                    </div>
                  ) : (
                    /* Solid color swatch for classic/dark */
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${themeObj.swatchBg}, ${themeObj.swatchAccent})`,
                      }}
                    />
                  )}

                  {/* Emoji + name at bottom */}
                  <div
                    className="absolute bottom-0 left-0 right-0 px-1.5 py-2 flex flex-col items-center gap-0.5"
                    style={{
                      color: themeObj.backgroundImage ? "white" : "white",
                      textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                    }}
                  >
                    <span className="text-base leading-none">
                      {themeObj.emoji}
                    </span>
                    <span
                      className="text-xs font-bold leading-tight text-center"
                      style={{ fontSize: "0.65rem" }}
                    >
                      {themeObj.names[lang] ?? themeObj.names.en}
                    </span>
                  </div>

                  {/* Active checkmark */}
                  {isActive && (
                    <div
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow-md"
                      style={{
                        background: themeObj.swatchBg,
                        color: "white",
                        fontSize: "0.6rem",
                      }}
                    >
                      ✓
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          data-ocid="theme.picker.close_button"
          onClick={() => onOpenChange(false)}
          className="sr-only"
          aria-label="Close theme picker"
        >
          Close
        </button>
      </DialogContent>
    </Dialog>
  );
}

export function ThemePickerButton({
  onClick,
}: {
  onClick: () => void;
}) {
  const { theme } = useTheme();
  const currentTheme = THEMES.find((t) => t.id === theme);

  return (
    <button
      type="button"
      data-ocid="theme.open_modal_button"
      onClick={onClick}
      className="fixed bottom-6 left-4 z-50 rounded-2xl px-3 py-2 text-sm font-bold transition-all hover:scale-105 flex items-center gap-1.5 shadow-lg"
      style={{
        background: currentTheme?.swatchBg ?? "oklch(0.52 0.24 292)",
        color: "white",
        boxShadow: `0 4px 16px ${currentTheme?.swatchBg ?? "oklch(0.52 0.24 292)"}66`,
      }}
    >
      <span>🎨</span>
      <span>{currentTheme?.emoji}</span>
    </button>
  );
}
