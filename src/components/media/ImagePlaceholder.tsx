import React from "react";
import { cn } from "@/lib/utils";

export type AspectRatio = "square" | "portrait" | "wide" | "classic" | "tall";

export interface ImagePlaceholderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: AspectRatio;
  label?: string;
  sublabel?: string;
  interactive?: boolean;
  /** Real image URL. When set, the photograph replaces the placeholder frame. */
  src?: string | null;
  /**
   * Accessible description of the photograph.
   *
   * Deliberately separate from `label`, which is the caption drawn on the *empty*
   * frame. Conflating the two made every owner-written "Photo description" a
   * no-op — the alt text came from the placeholder caption instead, so an image
   * that failed to load announced "Featured Hand Editorial" rather than the
   * description the owner had actually written.
   *
   * Falls back to `aria-label` and then `label`, so existing callers are unchanged.
   */
  alt?: string;
}

export function ImagePlaceholder({
  className,
  ratio = "portrait",
  label = "Visual Archive",
  sublabel,
  interactive = false,
  src = null,
  alt,
  ...props
}: ImagePlaceholderProps) {
  const ratioClasses: Record<AspectRatio, string> = {
    square: "aspect-square",
    portrait: "aspect-[4/5]",
    wide: "aspect-[16/9]",
    classic: "aspect-[3/2]",
    tall: "aspect-[9/16]",
  };

  const ratioTags: Record<AspectRatio, string> = {
    square: "1:1 • SQUARE",
    portrait: "4:5 • PORTRAIT",
    wide: "16:9 • LANDSCAPE",
    classic: "3:2 • EDITORIAL",
    tall: "9:16 • STORY",
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-surface-subtle border border-border flex flex-col items-center justify-center p-6 text-center select-none group",
        ratioClasses[ratio],
        interactive && "transition-colors duration-200 hover:border-accent/50 hover:bg-surface",
        className
      )}
      {...props}
    >
      {src ? (
        // Real catalogue photography: fills the same frame the placeholder used.
        // A plain <img> is deliberate: the storefront already ships
        // placeholder-first media and the image host is a public Storage bucket.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          // An aria-label on the wrapper div of a plain image is not announced,
          // so the caller's photo description becomes the image's accessible
          // name; `label` is only the last resort.
          alt={alt ?? (typeof props["aria-label"] === "string" ? props["aria-label"] : label)}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <>
      {/* Corner crosshairs for architectural/editorial tactile feel */}
      <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 border-t border-l border-border pointer-events-none" />
      <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 border-t border-r border-border pointer-events-none" />
      <div className="absolute bottom-2.5 left-2.5 w-1.5 h-1.5 border-b border-l border-border pointer-events-none" />
      <div className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 border-b border-r border-border pointer-events-none" />

      {/* Center content */}
      <div className="flex flex-col items-center gap-2 max-w-[85%] z-10">
        <span className="eyebrow text-[10px] text-muted-foreground/80 tracking-[0.22em]">
          {sublabel || ratioTags[ratio]}
        </span>
        <span className="font-display font-light text-base sm:text-lg text-foreground/90 tracking-wide">
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground/60 font-sans tracking-wider">
          Awaiting Photography
        </span>
      </div>
        </>
      )}
    </div>
  );
}
