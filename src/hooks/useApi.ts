import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function useApiList<T>(key: string, endpoint: string) {
  return useQuery<T[]>({
    queryKey: [key],
    queryFn: () => api.get<T[]>(endpoint),
    retry: 1,
  });
}

export function useApiGet<T>(key: string, endpoint: string, enabled = true) {
  return useQuery<T>({
    queryKey: [key],
    queryFn: () => api.get<T>(endpoint),
    enabled,
    retry: 1,
  });
}

export function useApiCreate<T>(key: string, endpoint: string, label: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<T>) => api.post<T>(endpoint, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [key] });
      toast.success(`${label} created successfully`);
    },
    onError: (err: Error) => {
      toast.error(err.message || `Failed to create ${label.toLowerCase()}`);
    },
  });
}

export function useApiUpdate<T>(key: string, endpoint: string, label: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<T> }) =>
      api.put<T>(`${endpoint}/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [key] });
      toast.success(`${label} updated successfully`);
    },
    onError: (err: Error) => {
      toast.error(err.message || `Failed to update ${label.toLowerCase()}`);
    },
  });
}

// For endpoints that use POST for updates (like patients)
export function useApiUpdatePost<T>(key: string, endpoint: string, label: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<T> }) =>
      api.post<T>(`${endpoint}/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [key] });
      toast.success(`${label} updated successfully`);
    },
    onError: (err: Error) => {
      toast.error(err.message || `Failed to update ${label.toLowerCase()}`);
    },
  });
}

export function useApiDelete(key: string, endpoint: string, label: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [key] });
      toast.success(`${label} deleted successfully`);
    },
    onError: (err: Error) => {
      toast.error(err.message || `Failed to delete ${label.toLowerCase()}`);
    },
  });
}
