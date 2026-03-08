# SudokuVerse

## Current State
Full-featured Sudoku app with 8 game modes, XP/rank system, badges, daily tasks (10), weekly challenges (7), 8 themes with atmospheric backgrounds, 13 languages, sound effects and background music. Missing: undo button, auto-notes, same-number highlighting, boss battle celebration animation, 100-level progression system, streak/daily login rewards, confetti on completion, rank-up celebration screen.

## Requested Changes (Diff)

### Add
1. **Undo button** in game controls -- stores move history (row, col, prev value, prev notes), single step undo per tap, also undoes note entries; shown next to Notes and Hint buttons; disabled when no history
2. **Auto-notes button** in game controls -- fills all empty cells with candidate numbers (values not already present in same row/col/box); only active before first manual entry or as a toggle; clears existing notes first
3. **Same-number highlighting** -- when a cell is selected or a number picker selects a digit, all cells on the board with the same value get a subtle highlight ring/glow (distinct from row/col/box highlight)
4. **Boss Battle particle explosion** -- on `showBossDefeated`, add particle burst animation (CSS/canvas confetti or motion keyframes) before showing modal; boss emoji explodes into particles; dramatic screen flash sequence
5. **100-level progression system** -- a `LevelScreen` or level map section on HomeScreen showing levels 1-100 with 6 difficulty tiers (as per original spec); each level unlocks sequentially; current level tracked in localStorage; level completion awards XP bonus; visual level badge on HomeScreen header next to rank
6. **Streak system** -- track consecutive days played in localStorage (`sudokuverse_streak_v1`); show streak count on HomeScreen with fire emoji; if streak >= 3, show a daily login bonus XP toast on first open each day; streak broken if a day is missed; streak badge milestone (7-day, 30-day)
7. **Puzzle completion confetti** -- on `showComplete` modal open, fire a confetti burst using CSS `@keyframes` animated particles (no external library needed); particles rain from top of screen for 2-3 seconds; only for clean solves (0 errors) show gold confetti, others show standard confetti
8. **Rank-up celebration screen** -- after XP is recorded, compare previous rank vs new rank in `useRecordPuzzleSolve` onSuccess; if rank increased, show a full-screen rank-up overlay with old rank → new rank, animated badge, particle effects, and a dismiss button; stored in component state `showRankUp`

### Modify
- `GameScreen.tsx` -- add undo history state + undo handler; add auto-notes handler; pass `highlightedNumber` state to `SudokuBoard`; enhance boss defeat with particle animation; add confetti component on completion; add rank-up overlay
- `SudokuBoard.tsx` -- accept `highlightedNumber?: number` prop; in `getCellClasses`, add `same-number` class when cell value equals `highlightedNumber`; update `index.css` with `.same-number` highlight style
- `HomeScreen.tsx` -- add streak display in header area; add level badge; add level progress indicator
- `usePlayerData.ts` -- in `onSuccess` of `useRecordPuzzleSolve`, compare old/new rank and return rank-up info
- `index.css` -- add `.same-number` cell style, confetti keyframe animations, rank-up overlay animations
- `i18n.ts` -- add translation keys for: `undo`, `autoNotes`, `streak`, `streakDays`, `levelUp`, `rankUp`, `dailyBonus`, `level` for all 13 languages

### Remove
Nothing removed.

## Implementation Plan
1. Add `undo` and `autoNotes` translation keys to all 13 language objects in `i18n.ts`
2. Update `SudokuBoard.tsx`:
   - Add `highlightedNumber?: number` prop
   - In `getCellClasses`, add `same-number` CSS class when `cell === highlightedNumber && highlightedNumber !== 0`
3. Update `index.css` with `.same-number` highlight, confetti keyframes, rank-up animations
4. Update `GameScreen.tsx`:
   - Add `moveHistory` state (array of `{row, col, prevValue, prevNotes}`)
   - Add `handleUndo` function
   - Add `autoNotesUsed` ref, `handleAutoNotes` function that computes candidates for all empty cells
   - Add `highlightedNumber` state, set it on cell selection and number pick
   - Add confetti component (pure CSS, inline animated divs) shown on `showComplete`
   - Add `showRankUp` state + rank-up overlay modal
   - Enhance boss defeat: particle burst using motion + CSS before modal shows
5. Update `HomeScreen.tsx`:
   - Add streak display (fire icon + count) in header
   - Add current level badge
   - Check and show daily login bonus XP toast on first open
6. Create `useStreak.ts` hook -- manages streak localStorage logic
7. Create `useLevelSystem.ts` hook -- 100 levels mapped to difficulty tiers, current level in localStorage
