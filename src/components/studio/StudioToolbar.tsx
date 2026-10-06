"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStudio } from "@/lib/studio/hooks";
import { trackStudioOverlay } from "@/lib/studio/overlay";
import {
  Eye,
  Sliders,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function StudioToolbar() {
  const {
    isActive,
    isPreviewMode,
    pendingCount,
    setPreviewMode,
    setActive,
    resetAllDrafts,
  } = useStudio();

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // While the confirmation is open it owns Escape, and focus moves into it.
  useEffect(() => {
    if (!showExitConfirm) return;
    const releaseOverlay = trackStudioOverlay();
    cancelButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowExitConfirm(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      releaseOverlay();
    };
  }, [showExitConfirm]);

  if (!isActive) {
    return null;
  }

  const handleExitClick = () => {
    if (pendingCount > 0) {
      setShowExitConfirm(true);
    } else {
      setActive(false);
    }
  };

  const handleConfirmExit = (discard: boolean) => {
    if (discard) {
      resetAllDrafts();
      // Clearing the drafts unmounts this toolbar, so nothing else may follow.
      setActive(false);
      return;
    }
    setShowExitConfirm(false);
    setActive(false);
  };

  return (
    <>
      <header
        role="region"
        aria-label="Studio Mode Toolbar"
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-11 px-3 sm:px-4",
          "bg-stone-950/95 text-stone-100 backdrop-blur-md border-b border-stone-800 shadow-md",
          "flex items-center justify-between select-none text-xs transition-colors duration-150"
        )}
      >
        {/* Left: Indicator & Status */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  isPreviewMode ? "bg-amber-400" : "bg-emerald-400"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  isPreviewMode ? "bg-amber-400" : "bg-emerald-500"
                )}
              />
            </span>

            {/*
              The wordmark shortens rather than disappearing: "STUDIO MODE" is how
              the owner knows the storefront is in an editing state at all, and on a
              320px screen it is the difference between the toolbar and the top
              actions fitting on one line. It is `aria-hidden` because the region
              already carries the same words as its accessible name.
            */}
            <span
              aria-hidden="true"
              className="truncate font-mono text-[11px] uppercase tracking-[0.2em] font-semibold text-stone-200"
            >
              <span className="hidden min-[380px]:inline">Studio Mode</span>
              <span className="min-[380px]:hidden">Studio</span>
            </span>
          </div>

          {/* Mode Pill */}
          {isPreviewMode ? (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-amber-950/70 text-amber-300 border border-amber-800/60">
              <Eye className="w-3 h-3" />
              Customer View
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-stone-900 text-stone-400 border border-stone-800">
              <Sparkles className="w-3 h-3 text-accent" />
              Storefront Editor
            </span>
          )}

          {/* Pending Drafts Indicator */}
          {pendingCount > 0 && (
            <span
              title="Local drafts held in this browser session. Nothing has been published."
              className="inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800/80"
            >
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              {pendingCount}
              <span className="hidden sm:inline">
                {" "}
                {pendingCount === 1 ? "draft" : "drafts"}
              </span>
            </span>
          )}
        </div>

        {/* Right: Actions.
            Icon-only below `sm`, where there is no room for the labels — so each
            control carries an `aria-label` as well as its desktop `title`, and
            grows to a fingertip-sized target. */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {/* Preview as Customer Toggle */}
          <button
            type="button"
            onClick={() => setPreviewMode(!isPreviewMode)}
            aria-label={isPreviewMode ? "Resume editing" : "Preview as a customer"}
            aria-pressed={isPreviewMode}
            className={cn(
              "touch-target inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-wider font-mono rounded-xs transition-colors cursor-pointer",
              isPreviewMode
                ? "bg-amber-500 text-stone-950 font-medium hover:bg-amber-400"
                : "bg-stone-900 text-stone-300 hover:text-stone-100 hover:bg-stone-800 border border-stone-800"
            )}
            title={isPreviewMode ? "Return to editing mode" : "Hide editing affordances and preview as a customer"}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isPreviewMode ? "Resume Editing" : "Preview Customer"}
            </span>
          </button>

          {/* Link to Admin Control Center */}
          <Link
            href="/admin"
            aria-label="Open the Admin Control Center"
            className="touch-target inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-wider font-mono bg-stone-900 text-stone-300 hover:text-stone-100 hover:bg-stone-800 border border-stone-800 rounded-xs transition-colors"
            title="Open traditional Admin Control Center"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Control Center</span>
          </Link>

          {/* Exit Studio Mode */}
          <button
            type="button"
            onClick={handleExitClick}
            aria-label="Exit Studio Mode"
            className="touch-target inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-wider font-mono text-stone-400 hover:text-stone-100 hover:bg-stone-900 rounded-xs transition-colors cursor-pointer"
            title="Exit Studio Mode"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* Exit with pending drafts confirmation modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-exit-confirm-title"
            aria-describedby="studio-exit-confirm-body"
            className="bg-surface border border-border max-w-sm w-full p-5 rounded-xs shadow-2xl flex flex-col gap-4 text-foreground"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <h3
                  id="studio-exit-confirm-title"
                  className="font-display text-lg font-medium text-foreground"
                >
                  Unsaved Local Drafts
                </h3>
                <p
                  id="studio-exit-confirm-body"
                  className="text-xs text-muted-foreground leading-relaxed"
                >
                  You have {pendingCount} unsaved catalogue{" "}
                  {pendingCount === 1 ? "change" : "changes"} held in this browser session.
                  Nothing has been published. Keep them for when you return, or discard them?
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="w-full sm:w-auto px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmExit(true)}
                className="w-full sm:w-auto px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-300 dark:border-rose-900/60 rounded-xs transition-colors cursor-pointer"
              >
                Discard & Exit
              </button>
              <button
                type="button"
                onClick={() => handleConfirmExit(false)}
                className="w-full sm:w-auto px-3 py-1.5 text-xs bg-foreground text-background uppercase tracking-wider font-mono rounded-xs transition-colors cursor-pointer"
              >
                Keep Drafts & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
