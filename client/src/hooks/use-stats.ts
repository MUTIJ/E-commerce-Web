import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useAuth } from "./use-auth";

export function useStats() {
  const { user } = useAuth();
  
  // Only fetch stats if user has permission
  // @ts-ignore
  const canViewStats = user && (user.isAdmin || user.isSuperAdmin || (user.permissions && user.permissions.viewStats));
  
  return useQuery({
    queryKey: [api.stats.get.path],
    queryFn: async () => {
      const res = await fetch(api.stats.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.stats.get.responses[200].parse(await res.json());
    },
    enabled: !!canViewStats, // Only enable query if user has permission
  });
}
