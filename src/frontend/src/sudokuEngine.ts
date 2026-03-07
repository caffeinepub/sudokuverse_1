import { Difficulty } from "./backend.d";

// Number of given cells per difficulty
const GIVEN_COUNTS: Record<Difficulty, number> = {
  [Difficulty.easy]: 36,
  [Difficulty.medium]: 30,
  [Difficulty.hard]: 25,
  [Difficulty.expert]: 22,
  [Difficulty.master]: 18,
};

type Grid = number[][];

function createEmptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function isValid(grid: Grid, row: number, col: number, num: number): boolean {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function solveSudoku(grid: Grid, limit = 2): number {
  let count = 0;

  function solve(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of nums) {
            if (isValid(grid, row, col, num)) {
              grid[row][col] = num;
              if (solve()) {
                if (limit === 1) return true;
              }
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }

  solve();
  return count;
}

function countSolutions(grid: Grid): number {
  const copy = grid.map((row) => [...row]);
  let count = 0;

  function solve(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (copy[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(copy, row, col, num)) {
              copy[row][col] = num;
              if (solve()) return true;
              copy[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= 2; // Stop after finding 2 solutions
  }

  solve();
  return count;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateFullSolution(): Grid {
  const grid = createEmptyGrid();
  solveSudoku(grid, 1);
  return grid;
}

function copyGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function generatePuzzle(difficulty: Difficulty): {
  puzzle: Grid;
  solution: Grid;
} {
  const solution = generateFullSolution();
  const puzzle = copyGrid(solution);

  const targetGivens = GIVEN_COUNTS[difficulty];
  const totalCells = 81;
  let toRemove = totalCells - targetGivens;

  // Get all cell positions in random order
  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  const shuffled = shuffleArray(positions);

  let removed = 0;
  for (const [r, c] of shuffled) {
    if (removed >= toRemove) break;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    // Check if still has unique solution
    if (countSolutions(puzzle) === 1) {
      removed++;
    } else {
      puzzle[r][c] = backup; // Restore if not unique
    }
  }

  return { puzzle, solution };
}

// LCG-based seeded random number generator
function createSeededRandom(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  }
  // LCG parameters from Numerical Recipes
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  return () => {
    state = (a * state + c) % m;
    return state / m;
  };
}

function shuffleArrayWithRandom<T>(arr: T[], random: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateFullSolutionSeeded(random: () => number): Grid {
  const grid = createEmptyGrid();

  function solveSeeded(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const nums = shuffleArrayWithRandom(
            [1, 2, 3, 4, 5, 6, 7, 8, 9],
            random,
          );
          for (const num of nums) {
            if (isValid(grid, row, col, num)) {
              grid[row][col] = num;
              if (solveSeeded()) return true;
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  solveSeeded();
  return grid;
}

export function generatePuzzleWithSeed(
  difficulty: Difficulty,
  seed: string,
): { puzzle: Grid; solution: Grid } {
  const random = createSeededRandom(seed);
  const solution = generateFullSolutionSeeded(random);
  const puzzle = copyGrid(solution);

  const targetGivens = GIVEN_COUNTS[difficulty];
  const totalCells = 81;
  const toRemove = totalCells - targetGivens;

  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  const shuffled = shuffleArrayWithRandom(positions, random);

  let removed = 0;
  for (const [r, c] of shuffled) {
    if (removed >= toRemove) break;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    if (countSolutions(puzzle) === 1) {
      removed++;
    } else {
      puzzle[r][c] = backup;
    }
  }

  return { puzzle, solution };
}

export function checkSolution(puzzle: Grid, solution: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

export function isPuzzleComplete(puzzle: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] === 0) return false;
    }
  }
  return true;
}

export type { Grid };
