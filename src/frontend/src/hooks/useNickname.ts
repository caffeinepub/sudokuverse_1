import { useCallback, useState } from "react";

const NICKNAME_KEY = "sudokuverse_nickname";

export function useNickname() {
  const [nickname, setNicknameState] = useState<string>(() => {
    return localStorage.getItem(NICKNAME_KEY) ?? "";
  });

  const setNickname = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 20);
    setNicknameState(trimmed);
    localStorage.setItem(NICKNAME_KEY, trimmed);
  }, []);

  return { nickname, setNickname };
}
