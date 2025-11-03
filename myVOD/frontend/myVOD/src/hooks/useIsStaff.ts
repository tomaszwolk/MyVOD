import { useUserProfile } from "@/hooks/useUserProfile";

/**
 * Custom hook to check if the current user has staff/admin permissions.
 * Uses the user profile data which includes is_staff flag from backend.
 *
 * @returns boolean indicating if user is staff, or undefined if profile is still loading
 */
export function useIsStaff(): boolean | undefined {
  const { data: profile } = useUserProfile();
  return profile?.is_staff;
}

