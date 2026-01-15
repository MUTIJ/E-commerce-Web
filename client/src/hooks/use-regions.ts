import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertRegion } from "@shared/schema";

export function useRegions() {
  return useQuery({
    queryKey: [api.regions.list.path],
    queryFn: async () => {
      const res = await fetch(api.regions.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch regions");
      return api.regions.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateRegion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertRegion) => {
      const res = await fetch(api.regions.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create region");
      return api.regions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.regions.list.path] }),
  });
}

export function useDeleteRegion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.regions.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete region");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.regions.list.path] }),
  });
}
