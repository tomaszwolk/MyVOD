import { http } from "@/lib/http";
import type {
  PlatformDto,
  UserProfileDto,
  UpdateUserProfileCommand,
} from "@/types/api.types";

/**
 * Fetch all available VOD platforms.
 * Note: This endpoint returns a direct array (not paginated)
 * @returns Array of platform DTOs
 * @throws API error with status and data
 */
export async function getPlatforms(): Promise<PlatformDto[]> {
  const { data } = await http.get<PlatformDto[]>("/platforms/");
  return data;
}

/**
 * Update the user's selected platforms.
 * @param platformIds - Array of platform IDs to associate with the user
 * @returns Updated user profile
 * @throws API error with status and data
 */
export async function patchUserPlatforms(
  platformIds: number[]
): Promise<UserProfileDto> {
  const payload: UpdateUserProfileCommand = { platforms: platformIds };
  const { data } = await http.patch<UserProfileDto>("/me/", payload);
  return data;
}
