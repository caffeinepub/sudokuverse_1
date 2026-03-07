import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import VarArray "mo:core/VarArray";

actor {
  type Difficulty = {
    #easy;
    #medium;
    #hard;
    #expert;
    #master;
  };

  type DailyTaskType = {
    #solve_no_hints;
    #solve_under_time;
    #solve_two_puzzles;
  };

  type DailyTask = {
    taskType : DailyTaskType;
    isCompleted : Bool;
  };

  type PlayerStats = {
    avgEasyTime : Nat;
    avgMediumTime : Nat;
    avgHardTime : Nat;
    avgExpertTime : Nat;
    avgMasterTime : Nat;
  };

  type WeeklyChallenge = {
    puzzlesCompleted : Nat;
    weekStartTimestamp : Int;
    badgeAwarded : Bool;
  };

  type PlayerProfile = {
    uuid : Text;
    xp : Nat;
    rank : Nat;
    puzzlesSolved : Nat;
    hintsUsed : Nat;
    errorsMade : Nat;
    stats : PlayerStats;
    badges : [Text];
    dailyTasks : [DailyTask];
    dailyTasksTimestamp : Int;
    weeklyChallenge : WeeklyChallenge;
  };

  module PlayerProfile {
    public func compare(p1 : PlayerProfile, p2 : PlayerProfile) : Order.Order {
      Nat.compare(p1.xp, p2.xp);
    };
  };

  let players = Map.empty<Text, PlayerProfile>();

  func calculateXp(difficulty : Difficulty, solveTime : Nat, hintsUsed : Nat, errorsMade : Nat) : Nat {
    // XP Calculation logic (simplified)
    let baseXp = switch (difficulty) {
      case (#easy) { 50 };
      case (#medium) { 100 };
      case (#hard) { 200 };
      case (#expert) { 350 };
      case (#master) { 500 };
    };

    var totalXp = baseXp;
    if (hintsUsed == 0) { totalXp += baseXp / 5 };
    if (errorsMade == 0) { totalXp += baseXp / 5 };

    let timeBonus = if (solveTime < 600) { baseXp / 10 } else {
      0;
    };
    totalXp += timeBonus;

    totalXp;
  };

  func getCurrentDay() : Int {
    let now = Time.now();
    now / (24 * 60 * 60 * 1000000000);
  };

  func getCurrentWeek() : Int {
    let now = Time.now();
    now / (7 * 24 * 60 * 60 * 1000000000);
  };

  public shared ({ caller }) func initializePlayer(uuid : Text) : async PlayerProfile {
    switch (players.get(uuid)) {
      case (?profile) { profile };
      case (null) {
        let newProfile : PlayerProfile = {
          uuid;
          xp = 0;
          rank = 0;
          puzzlesSolved = 0;
          hintsUsed = 0;
          errorsMade = 0;
          stats = {
            avgEasyTime = 0;
            avgMediumTime = 0;
            avgHardTime = 0;
            avgExpertTime = 0;
            avgMasterTime = 0;
          };
          badges = [];
          dailyTasks = [
            { taskType = #solve_no_hints; isCompleted = false },
            { taskType = #solve_under_time; isCompleted = false },
            { taskType = #solve_two_puzzles; isCompleted = false },
          ];
          dailyTasksTimestamp = getCurrentDay();
          weeklyChallenge = {
            puzzlesCompleted = 0;
            weekStartTimestamp = getCurrentWeek();
            badgeAwarded = false;
          };
        };
        players.add(uuid, newProfile);
        newProfile;
      };
    };
  };

  public query ({ caller }) func getPlayerData(uuid : Text) : async PlayerProfile {
    switch (players.get(uuid)) {
      case (?profile) { profile };
      case (null) { Runtime.trap("Player not found") };
    };
  };

  public shared ({ caller }) func recordPuzzleSolve(
    uuid : Text,
    difficulty : Difficulty,
    solveTime : Nat,
    hintsUsed : Nat,
    errorsMade : Nat,
  ) : async {
    newRank : Nat;
    newXp : Nat;
    badgeUnlocked : Bool;
  } {
    let xp = calculateXp(difficulty, solveTime, hintsUsed, errorsMade);
    let newRank = if (xp < 200) {
      0;
    } else if (xp < 500) {
      1;
    } else if (xp < 1000) {
      2;
    } else if (xp < 2000) {
      3;
    } else if (xp < 3500) {
      4;
    } else if (xp < 5500) {
      5;
    } else if (xp < 8000) {
      6;
    } else if (xp < 12000) {
      7;
    } else if (xp < 18000) {
      8;
    } else {
      9;
    };

    let badges = [] : [Text];

    {
      newRank;
      newXp = xp;
      badgeUnlocked = badges.size() > 0;
    };
  };

  public query ({ caller }) func getAllPlayerProfiles() : async [PlayerProfile] {
    players.values().toArray().sort();
  };
};
