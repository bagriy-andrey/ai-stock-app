"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface AvatarProps {
  alt: string;
  fallback: string;
  src?: string;
}

export function Avatar({ alt, fallback, src }: AvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => setHasImageError(false), [src]);

  return (
    <span className="ui-avatar">
      {src && !hasImageError ? (
        <Image
          src={src}
          alt={alt}
          width={96}
          height={96}
          unoptimized
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span aria-label={`${alt} initials`}>{fallback}</span>
      )}
    </span>
  );
}
