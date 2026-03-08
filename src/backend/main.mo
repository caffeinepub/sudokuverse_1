import Map "mo:core/Map";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Order "mo:core/Order";
import VarArray "mo:core/VarArray";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";



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
    easyCount : Nat;
    mediumCount : Nat;
    hardCount : Nat;
    expertCount : Nat;
    masterCount : Nat;
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
      Nat.compare(p2.xp, p1.xp);
    };
  };

  let players = Map.empty<Text, PlayerProfile>();

  func calculateXp(difficulty : Difficulty, solveTime : Nat, hintsUsed : Nat, errorsMade : Nat) : Nat {
    let baseXp = switch (difficulty) {
      case (#easy) { 50 };
      case (#medium) { 80 };
      case (#hard) { 120 };
      case (#expert) { 160 };
      case (#master) { 200 };
    };

    var totalXp = baseXp;
    if (hintsUsed == 0) { totalXp += baseXp / 5 };
    if (errorsMade == 0) { totalXp += baseXp / 5 };

    let timeBonus = if (solveTime < 600) { baseXp / 10 } else {
      0;
    };
    totalXp += timeBonus;

    if (totalXp < 10) { 10 } else { totalXp };
  };

  func getCurrentDay() : Int {
    let now = Time.now();
    now / (24 * 60 * 60 * 1000000000);
  };

  func getCurrentWeek() : Int {
    let now = Time.now();
    now / (7 * 24 * 60 * 60 * 1000000000);
  };

  func rankFromXp(totalXp : Nat) : Nat {
    if (totalXp < 200) { 0 } else if (totalXp < 500) { 1 } else if (totalXp < 1000) {
      2;
    } else if (totalXp < 2000) { 3 } else if (totalXp < 3500) {
      4;
    } else if (totalXp < 5500) { 5 } else if (totalXp < 8000) {
      6;
    } else if (totalXp < 12000) { 7 } else if (totalXp < 18000) {
      8;
    } else { 9 };
  };

  func hasBadge(badges : [Text], badgeName : Text) : Bool {
    badges.any(func(b) { b == badgeName });
  };

  func difficultyToText(difficulty : Difficulty) : Text {
    switch (difficulty) {
      case (#easy) { "easy" };
      case (#medium) { "medium" };
      case (#hard) { "hard" };
      case (#expert) { "expert" };
      case (#master) { "master" };
    };
  };

  func updateStats(stats : PlayerStats, difficulty : Difficulty, solveTime : Nat) : PlayerStats {
    let (currentCount, newCount, currentAvg) = switch (difficulty) {
      case (#easy) {
        (stats.easyCount, stats.easyCount + 1, stats.avgEasyTime);
      };
      case (#medium) {
        (stats.mediumCount, stats.mediumCount + 1, stats.avgMediumTime);
      };
      case (#hard) {
        (stats.hardCount, stats.hardCount + 1, stats.avgHardTime);
      };
      case (#expert) {
        (stats.expertCount, stats.expertCount + 1, stats.avgExpertTime);
      };
      case (#master) {
        (stats.masterCount, stats.masterCount + 1, stats.avgMasterTime);
      };
    };

    let newAvg = if (currentCount > 0) {
      let totalTime = (currentAvg * currentCount) + solveTime;
      totalTime / newCount;
    } else { solveTime };

    switch (difficulty) {
      case (#easy) {
        {
          stats with
          avgEasyTime = newAvg;
          easyCount = newCount;
        };
      };
      case (#medium) {
        {
          stats with
          avgMediumTime = newAvg;
          mediumCount = newCount;
        };
      };
      case (#hard) {
        {
          stats with
          avgHardTime = newAvg;
          hardCount = newCount;
        };
      };
      case (#expert) {
        {
          stats with
          avgExpertTime = newAvg;
          expertCount = newCount;
        };
      };
      case (#master) {
        {
          stats with
          avgMasterTime = newAvg;
          masterCount = newCount;
        };
      };
    };
  };

  func checkAndAddBadges(profile : PlayerProfile, difficulty : Difficulty, solveTime : Nat, hintsUsed : Nat, errorsMade : Nat, newRank : Nat) : [Text] {
    let badgeChecks : [(Text, Bool)] = [
      ("first_solve", profile.puzzlesSolved == 0 and not hasBadge(profile.badges, "first_solve")),
      (
        "century",
        profile.puzzlesSolved >= 99 and not hasBadge(profile.badges, "century"),
      ),
      (
        "hint_free_10",
        hintsUsed == 0 and profile.puzzlesSolved >= 9 and not hasBadge(profile.badges, "hint_free_10"),
      ),
      (
        "perfect_solve",
        hintsUsed == 0 and errorsMade == 0 and not hasBadge(profile.badges, "perfect_solve"),
      ),
      (
        "master_difficulty",
        difficulty == #master and not hasBadge(profile.badges, "master_difficulty"),
      ),
      (
        "error_free_hard",
        (difficulty == #hard or difficulty == #expert or difficulty == #master) and errorsMade == 0 and not hasBadge(profile.badges, "error_free_hard"),
      ),
      (
        "speed_demon",
        solveTime < 120 and not hasBadge(profile.badges, "speed_demon"),
      ),
      (
        "rank_5",
        newRank >= 5 and not hasBadge(profile.badges, "rank_5"),
      ),
    ];

    let validBadgesList = List.empty<Text>();
    for ((badge, condition) in badgeChecks.values()) {
      if (condition) {
        validBadgesList.add(badge);
      };
    };

    let validBadgesArray = validBadgesList.toArray();

    if (validBadgesArray.size() > 0) {
      let currentBadges = profile.badges;
      let newBadgesList = List.empty<Text>();
      for (b in currentBadges.values()) { newBadgesList.add(b) };
      newBadgesList.addAll(validBadgesList.values());

      let newBadges = newBadgesList.toArray();
      ignore newBadges;
      validBadgesArray;
    } else {
      [];
    };
  };

  func updateWeeklyChallenge(weeklyChallenge : WeeklyChallenge) : WeeklyChallenge {
    let currentWeek = getCurrentWeek();
    if (weeklyChallenge.weekStartTimestamp == currentWeek) {
      {
        weeklyChallenge with
        puzzlesCompleted = weeklyChallenge.puzzlesCompleted + 1;
      };
    } else {
      {
        puzzlesCompleted = 1;
        weekStartTimestamp = currentWeek;
        badgeAwarded = false;
      };
    };
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
            easyCount = 0;
            mediumCount = 0;
            hardCount = 0;
            expertCount = 0;
            masterCount = 0;
          };
          badges = [];
          dailyTasks = [
            { taskType = #solve_no_hints; isCompleted = false },
            { taskType = #solve_under_time; isCompleted = false },
            { taskType = #solve_two_puzzles; isCompleted = false }
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
    unlockedBadges : [Text];
  } {
    let profile = switch (players.get(uuid)) {
      case (?p) { p };
      case (null) { Runtime.trap("Profile not found") };
    };

    let gainedXp = calculateXp(difficulty, solveTime, hintsUsed, errorsMade);

    let updatedProfile = {
      profile with
      xp = profile.xp + gainedXp;
      puzzlesSolved = profile.puzzlesSolved + 1;
      hintsUsed = profile.hintsUsed + hintsUsed;
      errorsMade = profile.errorsMade + errorsMade;
      stats = updateStats(profile.stats, difficulty, solveTime);
    };

    let newRank = rankFromXp(updatedProfile.xp);

    let badges = checkAndAddBadges(updatedProfile, difficulty, solveTime, hintsUsed, errorsMade, newRank);
    let hasNewBadges = badges.size() > 0;

    let finalProfile = {
      updatedProfile with
      badges = if (hasNewBadges) {
        let currentBadges = updatedProfile.badges;
        let newBadgesList = List.empty<Text>();
        for (b in currentBadges.values()) { newBadgesList.add(b) };
        newBadgesList.addAll(badges.values());
        newBadgesList.toArray();
      } else { updatedProfile.badges };
      rank = newRank;
      weeklyChallenge = updateWeeklyChallenge(updatedProfile.weeklyChallenge);
    };

    players.add(uuid, finalProfile);

    {
      newRank;
      newXp = finalProfile.xp;
      badgeUnlocked = hasNewBadges;
      unlockedBadges = badges;
    };
  };

  public shared ({ caller }) func addStreakBonus(uuid : Text, bonusXp : Nat) : async Nat {
    let profile = switch (players.get(uuid)) {
      case (?p) { p };
      case (null) {
        Runtime.trap("Profile not found");
      };
    };

    let updatedProfile = {
      profile with
      xp = profile.xp + bonusXp;
      rank = rankFromXp(profile.xp + bonusXp);
    };

    players.add(uuid, updatedProfile);
    updatedProfile.xp;
  };

  public query ({ caller }) func getAllPlayerProfiles() : async [PlayerProfile] {
    players.values().toArray();
  };
};
