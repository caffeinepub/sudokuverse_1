import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface WeeklyChallenge {
    puzzlesCompleted: bigint;
    weekStartTimestamp: bigint;
    badgeAwarded: boolean;
}
export interface DailyTask {
    isCompleted: boolean;
    taskType: DailyTaskType;
}
export interface PlayerStats {
    avgMasterTime: bigint;
    avgExpertTime: bigint;
    avgEasyTime: bigint;
    avgHardTime: bigint;
    avgMediumTime: bigint;
}
export interface PlayerProfile {
    xp: bigint;
    dailyTasks: Array<DailyTask>;
    weeklyChallenge: WeeklyChallenge;
    puzzlesSolved: bigint;
    badges: Array<string>;
    rank: bigint;
    errorsMade: bigint;
    uuid: string;
    dailyTasksTimestamp: bigint;
    stats: PlayerStats;
    hintsUsed: bigint;
}
export enum DailyTaskType {
    solve_two_puzzles = "solve_two_puzzles",
    solve_no_hints = "solve_no_hints",
    solve_under_time = "solve_under_time"
}
export enum Difficulty {
    easy = "easy",
    hard = "hard",
    master = "master",
    expert = "expert",
    medium = "medium"
}
export interface backendInterface {
    getAllPlayerProfiles(): Promise<Array<PlayerProfile>>;
    getPlayerData(uuid: string): Promise<PlayerProfile>;
    initializePlayer(uuid: string): Promise<PlayerProfile>;
    recordPuzzleSolve(uuid: string, difficulty: Difficulty, solveTime: bigint, hintsUsed: bigint, errorsMade: bigint): Promise<{
        newXp: bigint;
        badgeUnlocked: boolean;
        newRank: bigint;
    }>;
}
