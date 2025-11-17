import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { getMyProfile } from "@/lib/api/user";
import { useAuth } from "@/contexts/AuthContext";

export const useVerifyUser = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["user", "me"],
    queryFn: getMyProfile,
    enabled: isAuthenticated, // Uruchom zapytanie tylko, jeśli tokeny istnieją
    retry: (failureCount, error: unknown) => {
      // Nie ponawiaj próby przy błędzie 401, bo to oznacza, że sesja jest nieważna
      const axiosError = error as AxiosError;
      if (axiosError?.response?.status === 401) {
        return false;
      }
      // W przeciwnym razie, ponów próbę standardową ilość razy (domyślnie 3)
      return failureCount < 3;
    },
    // Ustaw `staleTime` na `Infinity`, aby dane użytkownika nie były odświeżane w tle,
    // dopóki nie zostaną ręcznie unieważnione (np. przy edycji profilu).
    // To zapobiega niepotrzebnym zapytaniom do /api/me/ przy każdej nawigacji.
    staleTime: Infinity,
  });
};
