import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { THEMES, type ThemeId } from "../themes";

const THEME_KEY = "sudokuverse_theme";
const BG_OPACITY_KEY = "sudokuverse_bg_opacity";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  backgroundImage: string | undefined;
  backgroundOverlay: string;
  atmosphericClass: string | undefined;
  bgOpacity: number;
  setBgOpacity: (val: number) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "retro",
  setTheme: () => {},
  backgroundImage: undefined,
  backgroundOverlay: "rgba(0,0,20,0.45)",
  atmosphericClass: "theme-retro-fx",
  bgOpacity: 1,
  setBgOpacity: () => {},
});

function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute("data-theme", id);

  const themeObj = THEMES.find((t) => t.id === id);
  const root = document.documentElement;

  // Clear any previously-applied custom vars
  for (const theme of THEMES) {
    for (const key of Object.keys(theme.cssVars)) {
      root.style.removeProperty(`--${key}`);
    }
  }

  if (themeObj && Object.keys(themeObj.cssVars).length > 0) {
    for (const [key, value] of Object.entries(themeObj.cssVars)) {
      root.style.setProperty(`--${key}`, value);
    }
  }

  // Set background image CSS variable
  if (themeObj?.backgroundImage) {
    root.style.setProperty(
      "--theme-bg-image",
      `url("${themeObj.backgroundImage}")`,
    );
  } else {
    root.style.removeProperty("--theme-bg-image");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    return (stored as ThemeId) || "retro";
  });

  const [bgOpacity, setBgOpacityState] = useState<number>(() => {
    const stored = localStorage.getItem(BG_OPACITY_KEY);
    return stored ? Number(stored) : 1;
  });

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id);
    localStorage.setItem(THEME_KEY, id);
    applyTheme(id);
  }, []);

  const setBgOpacity = useCallback((val: number) => {
    setBgOpacityState(val);
    localStorage.setItem(BG_OPACITY_KEY, String(val));
  }, []);

  // Apply on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run on mount
  useEffect(() => {
    applyTheme(theme);
  }, []);

  const currentTheme = THEMES.find((t) => t.id === theme);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        backgroundImage: currentTheme?.backgroundImage,
        backgroundOverlay:
          currentTheme?.backgroundOverlay ?? "rgba(255,255,255,0.0)",
        atmosphericClass: currentTheme?.atmosphericClass,
        bgOpacity,
        setBgOpacity,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
