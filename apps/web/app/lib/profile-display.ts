import type { UserDto } from "@ai-stock-advisor/shared";

export function getUserInitials(user: UserDto): string {
  const personalInitials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((value) => value?.[0])
    .join("");

  if (personalInitials) {
    return personalInitials.toUpperCase();
  }

  const fallback = user.nickname ?? user.name ?? user.email;
  const words = fallback.trim().split(/\s+/);
  return (words.length > 1 ? words.map((word) => word[0]).join("") : fallback)
    .slice(0, 2)
    .toUpperCase();
}
