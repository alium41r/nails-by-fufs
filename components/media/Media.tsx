"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ImagePlaceholder, type AspectRatio } from "./ImagePlaceholder";

export interface MediaProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt: string;
  ratio?: AspectRatio;
  objectFit?: "cover" | "contain";
  objectPosition?: "center" | "top" | "bottom";
  priority?: boolean;
  sizes?: string;
  placeholderLabel?: string;
  placeholderSublabel?: string;
  interactive?: boolean;
}

export function Media({
  className,
  src,
  alt,
  ratio = "portrait",
  objectFit = "cover",
  objectPosition = "center",
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  placeholderLabel,
  placeholderSublabel,
  interactive = false,
  ...props
}: MediaProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const ratioClasses: Record<AspectRatio, string> = {
    square: "aspect-square",
    portrait: "aspect-[4/5]",
    wide: "aspect-[16/9]",
    classic: "aspect-[3/2]",
    tall: "aspect-[9/16]",
  };

  const objectFitClasses = {
    cover: "object-cover",
    contain: "object-contain",
  };

  const objectPosClasses = {
    center: "object-center",
    top: "object-top",
    bottom: "object-bottom",
  };

  // If no source provided or loading failed, render intentional placeholder
  if (!src || hasError) {
    return (
      <ImagePlaceholder
        ratio={ratio}
        label={placeholderLabel || alt || "Visual Archive"}
        sublabel={placeholderSublabel}
        interactive={interactive}
        className={className}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-surface-subtle border border-border group",
        ratioClasses[ratio],
        className
      )}
      {...props}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        className={cn(
          "transition-all duration-500",
          objectFitClasses[objectFit],
          objectPosClasses[objectPosition],
          isLoading ? "scale-105 blur-sm opacity-0" : "scale-100 blur-0 opacity-100",
          interactive && "group-hover:scale-[1.03] transition-transform duration-500 ease-out"
        )}
      />

      {/* Subtle hairline edge frame overlay for high-end editorial finish */}
      <div className="absolute inset-0 pointer-events-none border border-black/[0.04]" />
    </div>
  );
}
