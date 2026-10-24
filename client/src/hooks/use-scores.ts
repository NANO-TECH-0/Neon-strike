import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ScoreInput } from "@shared/routes";
import { z } from "zod";

export interface LeaderboardFilter {
  scope: "global" | "national" | "regional" | "city";
  countryCode?: string;
  regionCode?: string;
  cityName?: string;
}

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useScores(filter: LeaderboardFilter) {
  const canLoad = filter.scope === "global" ||
    Boolean(filter.countryCode && (filter.scope === "national" ||
      filter.regionCode && (filter.scope === "regional" || filter.cityName && filter.scope === "city")));
  return useQuery({
    queryKey: [api.scores.list.path, filter],
    enabled: canLoad,
    queryFn: async () => {
      const params = new URLSearchParams({ scope: filter.scope });
      if (filter.countryCode) params.set("countryCode", filter.countryCode);
      if (filter.regionCode) params.set("regionCode", filter.regionCode);
      if (filter.cityName) params.set("cityName", filter.cityName);
      const res = await fetch(`${api.scores.list.path}?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch scores");
      const data = await res.json();
      return parseWithLogging(api.scores.list.responses[200], data, "scores.list");
    },
  });
}

export function useCreateScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ScoreInput) => {
      const validated = api.scores.create.input.parse(data);
      const res = await fetch(api.scores.create.path, {
        method: api.scores.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const errorData = await res.json();
          const error = parseWithLogging(api.scores.create.responses[400], errorData, "scores.create.error");
          throw new Error(error.message);
        }
        throw new Error("Failed to create score");
      }
      const responseData = await res.json();
      return parseWithLogging(api.scores.create.responses[201], responseData, "scores.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.scores.list.path] });
    },
  });
}
