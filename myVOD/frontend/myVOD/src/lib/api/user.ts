import { http } from "@/lib/http";
import { type UserProfileDto } from "@/types/api.types";

/**
 * Fetches the profile of the currently authenticated user.
 * @returns A promise that resolves to the user's profile data.
 */
export async function getMyProfile(): Promise<UserProfileDto> {
  const response = await http.get<UserProfileDto>("/me/");
  return response.data;
}
