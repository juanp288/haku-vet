"use client";

import { useQueryClient } from "@tanstack/react-query";
import { tsr } from "@/lib/api-client";

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return tsr.appointments.create.useMutation({
    // También en error (409): "si otro usuario tomó la franja... la agenda se refresca".
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}

export function useChangeAppointmentStatus() {
  const queryClient = useQueryClient();
  return tsr.appointments.changeStatus.useMutation({
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}

export function useMoveAppointment() {
  const queryClient = useQueryClient();
  return tsr.appointments.move.useMutation({
    // También en error (409): revalida solapamiento, la agenda se refresca igual.
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agenda"] });
    },
  });
}
