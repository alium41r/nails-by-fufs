"use client";

import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ReferenceUploader } from "@/components/custom/ReferenceUploader";
import {
  AVAILABLE_SHAPES,
  AVAILABLE_LENGTHS,
  AVAILABLE_SIZING_OPTIONS,
  INITIAL_CUSTOM_ORDER_STATE,
  CustomOrderFormState,
  UploadedReferenceImage,
} from "@/data/custom-order";
import { Sparkles, Heart, ArrowRight, RotateCcw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  prepareReferenceUploads,
  submitCustomOrderRequest,
  type ReferenceUploadTarget,
} from "@/app/custom/actions";

export function CustomOrderForm() {
  const [formData, setFormData] = useState<CustomOrderFormState>(INITIAL_CUSTOM_ORDER_STATE);
  const [referenceImages, setReferenceImages] = useState<UploadedReferenceImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachedCount, setAttachedCount] = useState(0);

  // Upload targets are minted once by the server for the current selection. A
  // retry reuses them, so files that already uploaded are not sent again and a
  // double submission resolves to the same request row.
  const uploadSessionRef = useRef<{
    token: string;
    targets: ReferenceUploadTarget[];
    uploaded: Set<string>;
  } | null>(null);

  const handleReferenceChange = (nextImages: UploadedReferenceImage[]) => {
    setReferenceImages(nextImages);
    // Changing the selection invalidates the scoped upload targets.
    uploadSessionRef.current = null;
  };

  const handleInputChange = (field: keyof CustomOrderFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Please enter your name";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Please enter your email address";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.conceptDescription.trim()) {
      newErrors.conceptDescription = "Please provide a brief description of your design concept";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let submissionToken: string | undefined;

      if (referenceImages.length > 0) {
        const files = referenceImages
          .map((image) => image.file)
          .filter((file): file is File => Boolean(file));

        if (files.length !== referenceImages.length) {
          setSubmitError("One of the selected files is no longer available. Please re-attach your references.");
          return;
        }

        if (!uploadSessionRef.current) {
          const prepared = await prepareReferenceUploads(
            files.map((file) => ({
              filename: file.name,
              contentType: file.type,
              sizeBytes: file.size,
            })),
          );

          if (!prepared.ok) {
            setSubmitError(prepared.error);
            return;
          }

          uploadSessionRef.current = {
            token: prepared.submissionToken,
            targets: prepared.targets,
            uploaded: new Set<string>(),
          };
        }

        const session = uploadSessionRef.current;
        let failed = 0;

        for (const [index, file] of files.entries()) {
          const target = session.targets[index];
          if (!target || session.uploaded.has(target.path)) continue;

          try {
            // Direct browser → Storage upload with the short-lived signed URL;
            // the image body never passes through the Next.js server.
            const response = await fetch(target.signedUrl, {
              method: "PUT",
              headers: { "content-type": file.type, "x-upsert": "false" },
              body: file,
            });

            if (response.ok) session.uploaded.add(target.path);
            else failed += 1;
          } catch {
            failed += 1;
          }
        }

        if (failed > 0 && session.uploaded.size === 0) {
          setSubmitError("We could not upload your reference images. Please check your connection and try again.");
          return;
        }

        submissionToken = session.token;
      }

      const result = await submitCustomOrderRequest({ submissionToken, ...formData });

      if (!result.ok) {
        setErrors((previous) => ({ ...previous, ...result.errors }));
        setSubmitError(
          result.errors.form ??
            Object.values(result.errors)[0] ??
            "Please check the highlighted fields and try again.",
        );
        return;
      }

      setAttachedCount(result.referenceCount);
      setIsSubmitted(true);
      window.scrollTo({ top: 120, behavior: "smooth" });
    } catch {
      setSubmitError("Something went wrong sending your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_CUSTOM_ORDER_STATE);
    setReferenceImages([]);
    setErrors({});
    setIsSubmitted(false);
    setIsSubmitting(false);
    setSubmitError(null);
    setAttachedCount(0);
    uploadSessionRef.current = null;
  };

  if (isSubmitted) {
    return (
      <div className="border border-border bg-surface p-8 sm:p-12 lg:p-16 flex flex-col items-center text-center gap-6 max-w-2xl mx-auto shadow-xs">
        <div className="w-14 h-14 rounded-full bg-accent-subtle border border-accent/40 flex items-center justify-center text-accent">
          <Heart className="h-6 w-6" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="eyebrow text-accent tracking-[0.2em]">Inspiration Received</span>
          <h2 className="font-display font-light text-3xl sm:text-4xl text-foreground tracking-tight">
            Thank you, {formData.name}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed font-sans max-w-md">
            Your custom set concept has been captured. Fatima will review your design ideas, shape preferences, and attached references.
          </p>
        </div>

        {/* Prototype Submission Summary Card */}
        <div className="w-full bg-surface-subtle border border-border p-5 text-left flex flex-col gap-3 text-xs font-sans">
          <div className="flex items-center justify-between border-b border-border/80 pb-2">
            <span className="eyebrow text-accent">Design Summary Preview</span>
            <span className="text-[10px] font-mono text-muted-foreground">Received by the Studio</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-muted-foreground">
            <div>
              <span className="text-[10px] uppercase font-mono block text-foreground">Shape & Length</span>
              <span className="capitalize">{formData.shape} • {formData.length}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono block text-foreground">Sizing</span>
              <span>
                {formData.sizingPreference === "kit_first"
                  ? "Sizing kit requested"
                  : formData.sizingPreference === "standard"
                  ? `Standard ${formData.standardSize}`
                  : "Custom measurements"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono block text-foreground">References</span>
              <span>{attachedCount} {attachedCount === 1 ? "Image attached" : "Images attached"}</span>
            </div>
          </div>

          {formData.colorPalette && (
            <div className="pt-1">
              <span className="text-[10px] uppercase font-mono block text-foreground">Color Notes</span>
              <span className="text-muted-foreground">{formData.colorPalette}</span>
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleReset}
            className="w-full sm:w-auto inline-flex items-center gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Create Another Request</span>
          </Button>

          <Button
            href="/shop"
            variant="primary"
            size="md"
            className="w-full sm:w-auto inline-flex items-center gap-2"
          >
            <span>Browse Ready-to-Wear Sets</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-12 sm:gap-16 w-full max-w-3xl mx-auto" noValidate>
      {/* ─────────────────────────────────────────────────────────────
          GROUP 1: ABOUT YOU
      ───────────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-5 border-b border-border pb-10" aria-labelledby="about-you-heading">
        <div className="flex flex-col gap-1">
          <span className="eyebrow text-accent tracking-[0.2em]">01 / Client Info</span>
          <h2 id="about-you-heading" className="font-display font-light text-2xl sm:text-3xl text-foreground">
            About You
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans">
            Where we can reach you to discuss your set and confirm details.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2">
          <Input
            id="custom-name"
            label="Your Name *"
            placeholder="e.g. Fatima / Sarah"
            required
            value={formData.name}
            error={errors.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
          />

          <Input
            id="custom-email"
            type="email"
            label="Email Address *"
            placeholder="name@example.com"
            required
            value={formData.email}
            error={errors.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
          />
        </div>

        <div className="pt-1">
          <Input
            id="custom-instagram"
            label="Instagram Handle or Preferred Contact (Optional)"
            placeholder="@yourhandle"
            helperText="Helpful if you'd like to chat via Instagram direct messages."
            value={formData.instagram}
            onChange={(e) => handleInputChange("instagram", e.target.value)}
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          GROUP 2: YOUR SET PREFERENCES
      ───────────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-8 border-b border-border pb-10" aria-labelledby="set-pref-heading">
        <div className="flex flex-col gap-1">
          <span className="eyebrow text-accent tracking-[0.2em]">02 / Set Anatomy</span>
          <h2 id="set-pref-heading" className="font-display font-light text-2xl sm:text-3xl text-foreground">
            Nail Preferences
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans">
            Select your preferred shape, length, and design direction.
          </p>
        </div>

        {/* Shape Selection Cards */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs uppercase tracking-[0.16em] font-medium text-foreground">
            Desired Shape: <span className="font-normal text-muted-foreground capitalize">{formData.shape}</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5" role="radiogroup" aria-label="Desired Nail Shape">
            {AVAILABLE_SHAPES.map((shape) => {
              const isSelected = formData.shape === shape.id;
              return (
                <button
                  key={shape.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleInputChange("shape", shape.id)}
                  className={cn(
                    "p-3.5 border transition-all duration-150 text-left flex flex-col gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                    isSelected
                      ? "border-accent bg-accent-subtle text-accent ring-1 ring-accent"
                      : "border-border bg-surface text-foreground hover:border-foreground/40"
                  )}
                >
                  <span className="text-xs font-medium font-sans">{shape.name}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                    {shape.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Length Selection */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs uppercase tracking-[0.16em] font-medium text-foreground">
            Desired Length: <span className="font-normal text-muted-foreground capitalize">{formData.length}</span>
          </label>

          <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Desired Nail Length">
            {AVAILABLE_LENGTHS.map((length) => {
              const isSelected = formData.length === length.id;
              return (
                <button
                  key={length.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleInputChange("length", length.id)}
                  className={cn(
                    "p-3 border text-center transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                    isSelected
                      ? "border-accent bg-accent-subtle text-accent ring-1 ring-accent"
                      : "border-border bg-surface text-foreground hover:border-foreground/40"
                  )}
                >
                  <span className="text-xs uppercase tracking-wider font-medium">{length.name}</span>
                  <span className="text-[10px] text-muted-foreground">{length.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Palette Preferences */}
        <Input
          id="custom-color-palette"
          label="Preferred Colours or Tones (Optional)"
          placeholder="e.g. Deep cherry burgundy, sheer milky cream, chrome accents"
          value={formData.colorPalette}
          onChange={(e) => handleInputChange("colorPalette", e.target.value)}
        />

        {/* Concept Description */}
        <Textarea
          id="custom-concept"
          label="Design Description & Vibe *"
          rows={4}
          required
          placeholder="Tell Fufs what you are imagining. Describe the mood, aesthetic, theme, event details, or specific artistic elements you love."
          value={formData.conceptDescription}
          error={errors.conceptDescription}
          onChange={(e) => handleInputChange("conceptDescription", e.target.value)}
        />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          GROUP 3: INSPIRATION & REFERENCE UPLOADER
      ───────────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 border-b border-border pb-10" aria-labelledby="inspiration-heading">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-accent text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="eyebrow text-accent tracking-[0.2em]">03 / Visual Inspiration</span>
          </div>
          <h2 id="inspiration-heading" className="font-display font-light text-2xl sm:text-3xl text-foreground">
            Bring a Little Inspiration
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans">
            Upload photos, screenshots, sketches, or color palettes you&apos;d like Fufs to see.
          </p>
        </div>

        <div className="pt-2">
          <ReferenceUploader
            images={referenceImages}
            onChange={handleReferenceChange}
            maxFiles={6}
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          GROUP 4: SIZING & EVENT TIMELINE
      ───────────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-6 border-b border-border pb-10" aria-labelledby="sizing-heading">
        <div className="flex flex-col gap-1">
          <span className="eyebrow text-accent tracking-[0.2em]">04 / Sizing & Details</span>
          <h2 id="sizing-heading" className="font-display font-light text-2xl sm:text-3xl text-foreground">
            Sizing & Event Timeline
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans">
            How would you like to handle your custom nail sizing?
          </p>
        </div>

        {/* Sizing Preference Options */}
        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Sizing Preference">
          {AVAILABLE_SIZING_OPTIONS.map((opt) => {
            const isSelected = formData.sizingPreference === opt.id;
            return (
              <label
                key={opt.id}
                className={cn(
                  "p-4 border transition-all duration-150 flex items-start gap-3 cursor-pointer",
                  isSelected
                    ? "border-accent bg-accent-subtle/50 ring-1 ring-accent"
                    : "border-border bg-surface hover:border-foreground/40"
                )}
              >
                <input
                  type="radio"
                  name="sizingPreference"
                  value={opt.id}
                  checked={isSelected}
                  onChange={() => handleInputChange("sizingPreference", opt.id)}
                  className="mt-0.5 text-accent focus:ring-accent h-4 w-4"
                />
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-xs font-medium text-foreground">{opt.name}</span>
                  <span className="text-[11px] text-muted-foreground">{opt.description}</span>
                </div>
              </label>
            );
          })}
        </div>

        {/* Conditional Size Inputs */}
        {formData.sizingPreference === "standard" && (
          <div className="p-4 bg-surface-subtle border border-border flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider font-medium text-foreground">
              Select Preset Size:
            </label>
            <div className="flex gap-2">
              {["XS", "S", "M", "L"].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleInputChange("standardSize", sz)}
                  className={cn(
                    "h-10 px-4 border text-xs font-mono transition-all",
                    formData.standardSize === sz
                      ? "border-accent bg-accent text-white font-medium"
                      : "border-border bg-surface text-foreground hover:border-foreground/40"
                  )}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        )}

        {formData.sizingPreference === "custom_measurements" && (
          <div className="p-4 bg-surface-subtle border border-border flex flex-col gap-2">
            <Input
              id="custom-measurements"
              label="Millimeter Measurements"
              placeholder="e.g. Left: 15/11/12/11/9 mm, Right: 15/11/12/11/9 mm"
              value={formData.customMeasurements}
              onChange={(e) => handleInputChange("customMeasurements", e.target.value)}
            />
          </div>
        )}

        {/* Event Date & Budget Range (Optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2">
          <Input
            id="custom-date"
            label="Needed by Date or Event (Optional)"
            placeholder="e.g. Oct 24 / Wedding weekend"
            value={formData.eventDate}
            onChange={(e) => handleInputChange("eventDate", e.target.value)}
          />

          <Input
            id="custom-budget"
            label="Budget Guidance (Optional)"
            placeholder="e.g. Standard custom tier / Open"
            value={formData.budgetGuidance}
            onChange={(e) => handleInputChange("budgetGuidance", e.target.value)}
          />
        </div>

        <Textarea
          id="custom-notes"
          label="Any Additional Notes or Questions (Optional)"
          rows={2}
          placeholder="Anything else you'd like Fatima to keep in mind..."
          value={formData.additionalNotes}
          onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
        />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SUBMIT AREA
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4 text-center">
        {submitError && (
          <div
            role="alert"
            className="w-full flex items-start gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-3 text-left"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          className="w-full sm:w-auto sm:px-12 min-h-[50px] text-xs uppercase tracking-[0.18em]"
        >
          {isSubmitting ? "Sending Request..." : "Send Custom Request"}
        </Button>

        <p className="text-[11px] text-muted-foreground font-sans max-w-md leading-relaxed">
          No payment is taken at this stage. Fatima will review your concept and reach out directly to confirm design details and sizing.
        </p>
      </div>
    </form>
  );
}
