import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Difficulty, PlayerProfile } from "../backend.d";
import { useActor } from "./useActor";

const UUID_KEY = "sudokuverse_uuid";

function getOrCreateUUID(): string {
  let uuid = localStorage.getItem(UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(UUID_KEY, uuid);
  }
  return uuid;
}

export function usePlayerData() {
  const { actor, isFetching } = useActor();
  const uuid = getOrCreateUUID();

  return useQuery<PlayerProfile>({
    queryKey: ["playerData", uuid],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      try {
        const data = await actor.getPlayerData(uuid);
        return data;
      } catch {
        // Player doesn't exist, initialize
        const data = await actor.initializePlayer(uuid);
        return data;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useRecordPuzzleSolve() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const uuid = getOrCreateUUID();

  return useMutation({
    mutationFn: async (params: {
      difficulty: Difficulty;
      solveTime: number;
      hintsUsed: number;
      errorsMade: number;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.recordPuzzleSolve(
        uuid,
        params.difficulty,
        BigInt(params.solveTime),
        BigInt(params.hintsUsed),
        BigInt(params.errorsMade),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playerData", uuid] });
    },
  });
}

export { getOrCreateUUID };
