import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Grid } from "../sudokuEngine";

interface NumberPickerProps {
  onSelect: (num: number) => void;
  onClose: () => void;
  position: { x: number; y: number };
  isNoteMode: boolean;
}

function NumberPicker({
  onSelect,
  onClose,
  position,
  isNoteMode,
}: NumberPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    setTimeout(
      () => document.addEventListener("mousedown", handleClickOutside),
      10,
    );
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const pickerColors = [
    "oklch(0.52 0.24 292)", // purple
    "oklch(0.57 0.22 220)", // blue
    "oklch(0.62 0.23 340)", // pink
    "oklch(0.72 0.19 52)", // orange
    "oklch(0.52 0.24 292)", // purple
    "oklch(0.57 0.22 220)", // blue
    "oklch(0.62 0.23 340)", // pink
    "oklch(0.72 0.19 52)", // orange
    "oklch(0.52 0.24 292)", // purple
  ];

  // Constrain position to viewport
  const vpWidth = window.innerWidth;
  const vpHeight = window.innerHeight;
  const pickerWidth = 224;
  const pickerHeight = 200;

  let left = position.x - pickerWidth / 2;
  let top = position.y + 8;

  if (left < 8) left = 8;
  if (left + pickerWidth > vpWidth - 8) left = vpWidth - pickerWidth - 8;
  if (top + pickerHeight > vpHeight - 8) top = position.y - pickerHeight - 8;

  return (
    <div
      ref={pickerRef}
      data-ocid="game.number_picker.popover"
      className="number-picker-popup fixed z-50 rounded-2xl p-3 shadow-2xl"
      style={{
        left,
        top,
        background: "oklch(var(--card))",
        border: "2px solid oklch(var(--border))",
        boxShadow:
          "0 20px 60px oklch(var(--primary) / 0.2), 0 4px 12px oklch(0 0 0 / 0.15)",
        minWidth: `${pickerWidth}px`,
        touchAction: "none",
      }}
    >
      {isNoteMode && (
        <div
          className="text-center text-xs font-semibold mb-2 py-1 rounded-lg"
          style={{
            background: "oklch(var(--secondary))",
            color: "oklch(var(--primary))",
          }}
        >
          📝 Not Modu
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {numbers.map((num, i) => (
          <button
            type="button"
            key={num}
            onClick={() => onSelect(num)}
            className="rounded-xl py-2.5 font-bold text-lg text-white transition-all hover:scale-110 active:scale-95"
            style={{
              background: pickerColors[i],
              boxShadow: `0 2px 8px ${pickerColors[i]}66`,
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            {num}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSelect(0)}
        className="mt-2 w-full rounded-xl py-2 text-sm font-semibold transition-all hover:scale-105 active:scale-95"
        style={{
          background: "oklch(var(--muted))",
          color: "oklch(var(--muted-foreground))",
          border: "1px solid oklch(var(--border))",
        }}
      >
        ✕ Sil / Erase
      </button>
    </div>
  );
}

interface SudokuBoardProps {
  puzzle: Grid;
  solution: Grid;
  originalPuzzle: Grid;
  notes: Map<string, Set<number>>;
  onCellChange: (
    row: number,
    col: number,
    value: number,
    isNote?: boolean,
  ) => void;
  isNoteMode: boolean;
  errorCells: Set<string>;
  hintCells: Set<string>;
  isComplete: boolean;
  blindHidden?: Set<string>;
}

export function SudokuBoard({
  puzzle,
  solution: _solution,
  originalPuzzle,
  notes,
  onCellChange,
  isNoteMode,
  errorCells,
  hintCells,
  isComplete,
  blindHidden,
}: SudokuBoardProps) {
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
    null,
  );
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const handleCellActivate = useCallback(
    (row: number, col: number, el: HTMLElement) => {
      if (isComplete) return;
      const isGiven = originalPuzzle[row][col] !== 0;
      const cellKey = `${row}-${col}`;
      const isBlindHiddenCell = blindHidden?.has(cellKey) ?? false;
      if (isGiven && !isBlindHiddenCell) return;

      // If clicking the same cell that's already selected and picker is open, close picker
      if (
        selectedCell &&
        selectedCell[0] === row &&
        selectedCell[1] === col &&
        pickerPos
      ) {
        setPickerPos(null);
        setSelectedCell(null);
        return;
      }

      setSelectedCell([row, col]);
      const rect = el.getBoundingClientRect();
      setPickerPos({
        x: rect.left + rect.width / 2,
        y: rect.bottom,
      });
    },
    [isComplete, originalPuzzle, selectedCell, pickerPos, blindHidden],
  );

  const handleNumberSelect = useCallback(
    (num: number) => {
      if (!selectedCell) return;
      const [row, col] = selectedCell;
      onCellChange(row, col, num, isNoteMode);
      setPickerPos(null);
      setSelectedCell(null);
    },
    [selectedCell, onCellChange, isNoteMode],
  );

  const closePicker = useCallback(() => {
    setPickerPos(null);
    setSelectedCell(null);
  }, []);

  const getCellClasses = (row: number, col: number): string => {
    const cellKey = `${row}-${col}`;
    const isGiven = originalPuzzle[row][col] !== 0;
    const isSelected = selectedCell?.[0] === row && selectedCell?.[1] === col;
    const isError = errorCells.has(cellKey);
    const isHint = hintCells.has(cellKey);

    let classes = "sudoku-cell";

    if (isGiven) classes += " given";
    if (isError) classes += " error";
    else if (isHint) classes += " hint-cell";
    else if (isSelected) classes += " selected";
    else if (
      selectedCell &&
      (selectedCell[0] === row ||
        selectedCell[1] === col ||
        (Math.floor(selectedCell[0] / 3) === Math.floor(row / 3) &&
          Math.floor(selectedCell[1] / 3) === Math.floor(col / 3)))
    ) {
      classes += " highlighted";
    } else if (!isGiven) {
      classes += " player-entry";
    }

    return classes;
  };

  const getCellBorderStyle = (
    row: number,
    col: number,
  ): React.CSSProperties => {
    const style: React.CSSProperties = {
      border: "1px solid oklch(var(--border))",
    };

    // Thick borders for 3x3 box boundaries
    if (col % 3 === 2 && col !== 8) {
      style.borderRight = "2.5px solid oklch(var(--foreground) / 0.3)";
    }
    if (row % 3 === 2 && row !== 8) {
      style.borderBottom = "2.5px solid oklch(var(--foreground) / 0.3)";
    }

    return style;
  };

  const renderNotes = (row: number, col: number) => {
    const key = `${row}-${col}`;
    const cellNotes = notes.get(key);
    if (!cellNotes || cellNotes.size === 0) return null;

    return (
      <div className="absolute inset-0.5 grid grid-cols-3 grid-rows-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <div
            key={n}
            className="flex items-center justify-center"
            style={{
              fontSize: "clamp(5px, 1.5vw, 9px)",
              color: cellNotes.has(n) ? "oklch(0.52 0.24 292)" : "transparent",
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {cellNotes.has(n) ? n : ""}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div
        data-ocid="game.board.canvas_target"
        className="relative select-none"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(9, 1fr)",
          border: "3px solid oklch(var(--border))",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow:
            "0 8px 32px oklch(var(--primary) / 0.15), 0 2px 8px oklch(0 0 0 / 0.08)",
          aspectRatio: "1",
          width: "100%",
          maxWidth: "min(88vw, calc(100dvh - 240px))",
          maxHeight: "calc(100dvh - 240px)",
          background: "oklch(var(--card))",
        }}
      >
        {puzzle.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const isGiven = originalPuzzle[rowIdx][colIdx] !== 0;
            const cellKey = `${rowIdx}-${colIdx}`;
            const hasNotes =
              notes.has(cellKey) && (notes.get(cellKey)?.size ?? 0) > 0;
            const isBlindHiddenCell = blindHidden?.has(cellKey) ?? false;

            const cellStyle = {
              ...getCellBorderStyle(rowIdx, colIdx),
              fontSize: "clamp(12px, 3.5vw, 22px)",
              fontWeight: isGiven ? 700 : 600,
              cursor:
                (isGiven && !isBlindHiddenCell) || isComplete
                  ? "default"
                  : "pointer",
              transition: "background 0.1s ease",
              position: "relative" as const,
              ...(isBlindHiddenCell
                ? { filter: "blur(3px)", opacity: 0.4 }
                : {}),
            };
            const cellContent = (
              <>
                {cell !== 0 && !hasNotes ? cell : null}
                {cell === 0 && hasNotes ? renderNotes(rowIdx, colIdx) : null}
              </>
            );

            if ((isGiven && !isBlindHiddenCell) || isComplete) {
              return (
                <div
                  key={cellKey}
                  className={getCellClasses(rowIdx, colIdx)}
                  style={cellStyle}
                >
                  {cellContent}
                </div>
              );
            }

            return (
              <button
                type="button"
                key={cellKey}
                className={getCellClasses(rowIdx, colIdx)}
                style={{
                  ...cellStyle,
                  width: "100%",
                  background: "transparent",
                }}
                onClick={(e) =>
                  handleCellActivate(
                    rowIdx,
                    colIdx,
                    e.currentTarget as HTMLElement,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCellActivate(
                      rowIdx,
                      colIdx,
                      e.currentTarget as HTMLElement,
                    );
                  }
                }}
              >
                {cellContent}
              </button>
            );
          }),
        )}
      </div>

      {pickerPos && selectedCell && (
        <NumberPicker
          onSelect={handleNumberSelect}
          onClose={closePicker}
          position={pickerPos}
          isNoteMode={isNoteMode}
        />
      )}
    </>
  );
}
