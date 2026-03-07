import { motion } from "motion/react";
import React from "react";
import { useTheme } from "../context/ThemeContext";
import { LANGUAGES, type Lang } from "../i18n";
import { THEMES } from "../themes";

interface SettingsScreenProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onBack: () => void;
}

const FLAG_MAP: Record<Lang, string> = {
  tr: "🇹🇷",
  en: "🇬🇧",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
  it: "🇮🇹",
  pt: "🇧🇷",
  ru: "🇷🇺",
  ja: "🇯🇵",
  ko: "🇰🇷",
  zh: "🇨🇳",
  ar: "🇸🇦",
  hi: "🇮🇳",
};

const TIPS_BY_LANG: Partial<Record<Lang, string[]>> = {
  tr: [
    "Her satır, sütun ve 3x3 kutuya 1-9 rakamlarını yerleştir",
    "Her rakam yalnızca bir kez kullanılabilir",
    "💡 İpucu butonu ile bir hücreyi ortaya çıkar",
    "✏️ Not modu ile aday rakamları işaretle",
    "Hata yaparsan hücre kırmızı olur",
  ],
  en: [
    "Fill every row, column and 3×3 box with digits 1–9",
    "Each digit can only appear once",
    "💡 Use hints to reveal a cell",
    "✏️ Use note mode to mark candidate digits",
    "Wrong entries turn red",
  ],
  de: [
    "Fülle jede Zeile, Spalte und 3×3-Box mit Ziffern 1–9",
    "Jede Ziffer darf nur einmal vorkommen",
    "💡 Hinweise nutzen, um eine Zelle aufzudecken",
    "✏️ Notizmodus für Kandidatenziffern verwenden",
    "Falsche Einträge werden rot",
  ],
  fr: [
    "Remplissez chaque ligne, colonne et boîte 3×3 avec les chiffres 1–9",
    "Chaque chiffre ne peut apparaître qu'une seule fois",
    "💡 Utilisez les indices pour révéler une cellule",
    "✏️ Utilisez le mode notes pour les candidats",
    "Les entrées incorrectes deviennent rouges",
  ],
  es: [
    "Rellena cada fila, columna y caja 3×3 con dígitos 1–9",
    "Cada dígito solo puede aparecer una vez",
    "💡 Usa pistas para revelar una celda",
    "✏️ Usa el modo notas para candidatos",
    "Las entradas incorrectas se vuelven rojas",
  ],
  it: [
    "Riempi ogni riga, colonna e riquadro 3×3 con le cifre 1–9",
    "Ogni cifra può comparire solo una volta",
    "💡 Usa i suggerimenti per rivelare una cella",
    "✏️ Usa la modalità note per i candidati",
    "Le voci errate diventano rosse",
  ],
  pt: [
    "Preencha cada linha, coluna e caixa 3×3 com os dígitos 1–9",
    "Cada dígito só pode aparecer uma vez",
    "💡 Use dicas para revelar uma célula",
    "✏️ Use o modo de notas para candidatos",
    "Entradas incorretas ficam vermelhas",
  ],
  ru: [
    "Заполни каждую строку, столбец и блок 3×3 цифрами 1–9",
    "Каждая цифра может появляться только один раз",
    "💡 Используй подсказки для открытия ячейки",
    "✏️ Режим заметок для кандидатских цифр",
    "Неверные записи становятся красными",
  ],
  ja: [
    "各行・列・3×3ボックスに1〜9の数字を入れてください",
    "各数字は一度しか使えません",
    "💡 ヒントで1つのマスを明らかにできます",
    "✏️ メモモードで候補数字を記録できます",
    "間違った入力は赤くなります",
  ],
  ko: [
    "각 행, 열, 3×3 박스에 1~9 숫자를 채워야 합니다",
    "각 숫자는 한 번만 나타날 수 있습니다",
    "💡 힌트로 하나의 칸을 공개할 수 있습니다",
    "✏️ 메모 모드로 후보 숫자를 표시하세요",
    "잘못된 입력은 빨간색으로 바뀝니다",
  ],
  zh: [
    "在每行、每列和每个3×3方块中填入数字1-9",
    "每个数字只能出现一次",
    "💡 使用提示揭示一个格子",
    "✏️ 使用笔记模式标注候选数字",
    "错误输入变为红色",
  ],
  ar: [
    "املأ كل صف وعمود ومربع 3×3 بالأرقام 1-9",
    "يمكن لكل رقم أن يظهر مرة واحدة فقط",
    "💡 استخدم التلميحات لكشف خلية",
    "✏️ استخدم وضع الملاحظات للأرقام المرشحة",
    "الإدخالات الخاطئة تصبح حمراء",
  ],
  hi: [
    "हर पंक्ति, कॉलम और 3×3 बॉक्स में 1-9 अंक भरें",
    "प्रत्येक अंक केवल एक बार आ सकता है",
    "💡 एक सेल प्रकट करने के लिए संकेत उपयोग करें",
    "✏️ उम्मीदवार अंकों के लिए नोट मोड उपयोग करें",
    "गलत प्रविष्टियाँ लाल हो जाती हैं",
  ],
};

const THEME_LABEL: Record<Lang, string> = {
  tr: "Tema",
  en: "Theme",
  de: "Thema",
  fr: "Thème",
  es: "Tema",
  it: "Tema",
  pt: "Tema",
  ru: "Тема",
  ja: "テーマ",
  ko: "테마",
  zh: "主题",
  ar: "السمة",
  hi: "थीम",
};

export function SettingsScreen({
  lang,
  onLangChange,
  onBack,
}: SettingsScreenProps) {
  const tips = TIPS_BY_LANG[lang] || TIPS_BY_LANG.en || [];
  const currentLang = LANGUAGES.find((l) => l.code === lang);
  const { theme: activeTheme, setTheme } = useTheme();

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        overflowY: "auto",
        background: "oklch(var(--background))",
      }}
    >
      {/* Header */}
      <header className="flex items-center gap-4 px-6 pt-4 pb-3">
        <button
          type="button"
          data-ocid="settings.back.button"
          onClick={onBack}
          className="rounded-xl px-3 py-2 font-semibold text-sm transition-all hover:scale-105"
          style={{
            background: "oklch(var(--secondary))",
            color: "oklch(var(--primary))",
          }}
        >
          ←{" "}
          {lang === "tr"
            ? "Geri"
            : lang === "de"
              ? "Zurück"
              : lang === "fr"
                ? "Retour"
                : lang === "es"
                  ? "Atrás"
                  : lang === "it"
                    ? "Indietro"
                    : lang === "pt"
                      ? "Voltar"
                      : lang === "ru"
                        ? "Назад"
                        : lang === "ja"
                          ? "戻る"
                          : lang === "ko"
                            ? "뒤로"
                            : lang === "zh"
                              ? "返回"
                              : lang === "ar"
                                ? "رجوع"
                                : lang === "hi"
                                  ? "वापस"
                                  : "Back"}
        </button>
        <h1 className="text-2xl font-black font-display gradient-text">
          ⚙️{" "}
          {lang === "tr"
            ? "Ayarlar"
            : lang === "de"
              ? "Einstellungen"
              : lang === "fr"
                ? "Paramètres"
                : lang === "es"
                  ? "Configuración"
                  : lang === "it"
                    ? "Impostazioni"
                    : lang === "pt"
                      ? "Configurações"
                      : lang === "ru"
                        ? "Настройки"
                        : lang === "ja"
                          ? "設定"
                          : lang === "ko"
                            ? "설정"
                            : lang === "zh"
                              ? "设置"
                              : lang === "ar"
                                ? "إعدادات"
                                : lang === "hi"
                                  ? "सेटिंग्स"
                                  : "Settings"}
        </h1>
      </header>

      <main className="flex-1 px-6 pb-8 space-y-4">
        {/* Language section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5"
          style={{
            background: "oklch(var(--card))",
            border: "1.5px solid oklch(var(--border))",
            boxShadow: "0 2px 12px oklch(var(--primary) / 0.06)",
          }}
        >
          <h2
            className="font-bold font-display text-base mb-4"
            style={{ color: "oklch(var(--foreground))" }}
          >
            🌐{" "}
            {lang === "ar"
              ? "اللغة"
              : lang === "hi"
                ? "भाषा"
                : lang === "zh"
                  ? "语言"
                  : lang === "ja"
                    ? "言語"
                    : lang === "ko"
                      ? "언어"
                      : lang === "ru"
                        ? "Язык"
                        : lang === "de"
                          ? "Sprache"
                          : lang === "fr"
                            ? "Langue"
                            : lang === "es"
                              ? "Idioma"
                              : lang === "it"
                                ? "Lingua"
                                : lang === "pt"
                                  ? "Idioma"
                                  : lang === "tr"
                                    ? "Dil"
                                    : "Language"}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {LANGUAGES.map((language) => {
              const isActive = lang === language.code;
              return (
                <button
                  key={language.code}
                  type="button"
                  data-ocid={`settings.lang.${language.code}.toggle`}
                  onClick={() => onLangChange(language.code)}
                  className="flex items-center gap-3 rounded-xl p-3 transition-all hover:scale-105 text-left"
                  style={{
                    background: isActive
                      ? "oklch(var(--secondary))"
                      : "oklch(var(--muted))",
                    border: `2px solid ${isActive ? "oklch(var(--primary))" : "oklch(var(--border))"}`,
                    color: isActive
                      ? "oklch(var(--primary))"
                      : "oklch(var(--muted-foreground))",
                  }}
                >
                  <span className="text-xl flex-shrink-0">
                    {FLAG_MAP[language.code]}
                  </span>
                  <div className="text-left min-w-0">
                    <div className="font-bold text-sm truncate">
                      {language.nativeLabel}
                    </div>
                    <div className="text-xs opacity-70 truncate">
                      {language.label}
                    </div>
                  </div>
                  {isActive && (
                    <span className="ml-auto flex-shrink-0 font-bold">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {currentLang?.rtl && (
            <p
              className="mt-3 text-xs text-center opacity-60"
              style={{ color: "oklch(var(--muted-foreground))" }}
            >
              {lang === "ar"
                ? "* هذه اللغة تُكتب من اليمين إلى اليسار"
                : "* RTL language"}
            </p>
          )}
        </motion.div>

        {/* Theme section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-5"
          style={{
            background: "oklch(var(--card))",
            border: "1.5px solid oklch(var(--border))",
            boxShadow: "0 2px 12px oklch(var(--primary) / 0.06)",
          }}
        >
          <h2
            className="font-bold font-display text-base mb-4"
            style={{ color: "oklch(var(--foreground))" }}
          >
            🎨 {THEME_LABEL[lang]}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map((themeObj) => {
              const isActive = activeTheme === themeObj.id;
              return (
                <button
                  key={themeObj.id}
                  type="button"
                  data-ocid={`settings.theme.${themeObj.id}.toggle`}
                  onClick={() => setTheme(themeObj.id)}
                  className="flex items-center gap-3 rounded-xl p-3 transition-all hover:scale-105 text-left"
                  style={{
                    background: isActive
                      ? `${themeObj.swatchBg}22`
                      : "oklch(var(--muted))",
                    border: `2px solid ${isActive ? themeObj.swatchBg : "oklch(var(--border))"}`,
                    color: "oklch(var(--foreground))",
                  }}
                >
                  <div className="flex gap-1 flex-shrink-0">
                    <div
                      className="w-5 h-5 rounded-full shadow-sm"
                      style={{ background: themeObj.swatchBg }}
                    />
                    <div
                      className="w-4 h-4 rounded-full shadow-sm self-end"
                      style={{ background: themeObj.swatchAccent }}
                    />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-bold text-sm truncate">
                      {themeObj.emoji}{" "}
                      {themeObj.names[lang] ?? themeObj.names.en}
                    </div>
                  </div>
                  {isActive && (
                    <span
                      className="ml-auto flex-shrink-0 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: themeObj.swatchBg,
                        color: "white",
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* About section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5"
          style={{
            background: "oklch(var(--card))",
            border: "1.5px solid oklch(var(--border))",
            boxShadow: "0 2px 12px oklch(var(--primary) / 0.06)",
          }}
        >
          <h2
            className="font-bold font-display text-base mb-3"
            style={{ color: "oklch(var(--foreground))" }}
          >
            ℹ️{" "}
            {lang === "tr"
              ? "Hakkında"
              : lang === "de"
                ? "Über"
                : lang === "fr"
                  ? "À propos"
                  : lang === "es"
                    ? "Acerca de"
                    : lang === "it"
                      ? "Informazioni"
                      : lang === "pt"
                        ? "Sobre"
                        : lang === "ru"
                          ? "О приложении"
                          : lang === "ja"
                            ? "アプリについて"
                            : lang === "ko"
                              ? "앱 정보"
                              : lang === "zh"
                                ? "关于"
                                : lang === "ar"
                                  ? "عن التطبيق"
                                  : lang === "hi"
                                    ? "के बारे में"
                                    : "About"}
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: "oklch(var(--muted-foreground))" }}>
                {lang === "tr"
                  ? "Versiyon"
                  : lang === "de"
                    ? "Version"
                    : lang === "fr"
                      ? "Version"
                      : lang === "es"
                        ? "Versión"
                        : lang === "it"
                          ? "Versione"
                          : lang === "pt"
                            ? "Versão"
                            : lang === "ru"
                              ? "Версия"
                              : lang === "ja"
                                ? "バージョン"
                                : lang === "ko"
                                  ? "버전"
                                  : lang === "zh"
                                    ? "版本"
                                    : lang === "ar"
                                      ? "الإصدار"
                                      : lang === "hi"
                                        ? "संस्करण"
                                        : "Version"}
              </span>
              <span
                className="font-bold"
                style={{ color: "oklch(var(--foreground))" }}
              >
                1.0.0
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "oklch(var(--muted-foreground))" }}>
                Platform
              </span>
              <span
                className="font-bold"
                style={{ color: "oklch(var(--foreground))" }}
              >
                Internet Computer
              </span>
            </div>
          </div>
        </motion.div>

        {/* How to play */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-5"
          style={{
            background: "oklch(var(--secondary))",
            border: "1.5px solid oklch(var(--primary) / 0.3)",
          }}
        >
          <h2
            className="font-bold font-display text-base mb-3"
            style={{ color: "oklch(var(--secondary-foreground))" }}
          >
            🎮{" "}
            {lang === "tr"
              ? "Nasıl Oynanır"
              : lang === "de"
                ? "Spielanleitung"
                : lang === "fr"
                  ? "Comment jouer"
                  : lang === "es"
                    ? "Cómo jugar"
                    : lang === "it"
                      ? "Come giocare"
                      : lang === "pt"
                        ? "Como jogar"
                        : lang === "ru"
                          ? "Как играть"
                          : lang === "ja"
                            ? "遊び方"
                            : lang === "ko"
                              ? "게임 방법"
                              : lang === "zh"
                                ? "游戏方法"
                                : lang === "ar"
                                  ? "كيفية اللعب"
                                  : lang === "hi"
                                    ? "कैसे खेलें"
                                    : "How to Play"}
          </h2>
          <ul
            className="space-y-2 text-sm"
            style={{
              color: "oklch(var(--secondary-foreground))",
              direction: lang === "ar" ? "rtl" : "ltr",
            }}
          >
            {tips.map((tip, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: static tip list, order never changes
                key={i}
                className="flex items-start gap-2"
              >
                <span
                  className="mt-0.5 font-bold text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "oklch(var(--primary))",
                    color: "oklch(var(--primary-foreground))",
                    fontSize: "9px",
                  }}
                >
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </motion.div>
      </main>
    </div>
  );
}
