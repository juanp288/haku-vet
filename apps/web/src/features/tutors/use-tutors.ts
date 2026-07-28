"use client";

import { useQueryClient } from "@tanstack/react-query";
import { tsr } from "@/lib/api-client";

export const TUTORS_QUERY_KEY = ["tutors"];

export function useTutors() {
  return tsr.tutors.list.useQuery({ queryKey: TUTORS_QUERY_KEY });
}

export function useCreateTutor() {
  const queryClient = useQueryClient();
  return tsr.tutors.create.useMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TUTORS_QUERY_KEY });
    },
  });
}
