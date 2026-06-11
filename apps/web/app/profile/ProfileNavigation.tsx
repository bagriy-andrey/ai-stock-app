"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const profileNavigationItems = [
  { href: "/profile", label: "Profile" },
  { href: "/profile/security", label: "Security" },
] as const;

export function ProfileNavigation() {
  const pathname = usePathname();

  return (
    <nav className="profile-navigation" aria-label="Profile settings">
      {profileNavigationItems.map((item) => (
        <Link
          key={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
          href={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
