import { describe, expect, it } from "vitest";

import {
  ALLOWED_REFERENCE_TYPES,
  MAX_REFERENCE_FILES,
  MAX_REFERENCE_BYTES,
  buildReferencePath,
  isReferencePathInScope,
  isValidSubmissionToken,
  sanitizeFilename,
  validateCustomOrderInput,
  validateReferenceFiles,
} from "@/lib/custom-order-validation";

const TOKEN = "0f8fad5b-d9cb-469f-a165-70867728950e";

const validOrder = {
  name: "  Fatima Noor  ",
  email: "fatima@example.com",
  instagram: "@fufs",
  shape: "almond",
  length: "medium",
  sizingPreference: "kit_first",
  standardSize: "M",
  customMeasurements: "",
  colorPalette: "Deep cherry",
  conceptDescription: "Cherry velvet set for a wedding.",
  eventDate: "Oct 24 / Wedding weekend",
  budgetGuidance: "Standard custom tier / Open",
  additionalNotes: "Please keep the chrome subtle.",
};

/* -------------------------------------------------------------------------- */
/* Form validation (server authority)                                          */
/* -------------------------------------------------------------------------- */

describe("validateCustomOrderInput", () => {
  it("accepts the UI's happy path and trims text", () => {
    const result = validateCustomOrderInput(validOrder);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.name).toBe("Fatima Noor");
    expect(result.data.email).toBe("fatima@example.com");
    expect(result.data.conceptDescription).toBe("Cherry velvet set for a wedding.");
    // Empty optional strings become NULL rather than empty strings.
    expect(result.data.customMeasurements).toBeNull();
  });

  it("requires exactly the fields the form marks required", () => {
    const result = validateCustomOrderInput({ ...validOrder, name: " ", email: "", conceptDescription: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(Object.keys(result.errors).sort()).toEqual(["conceptDescription", "email", "name"]);
  });

  it("rejects malformed email addresses", () => {
    for (const email of ["nope", "a@b", "a b@example.com", "@example.com"]) {
      const result = validateCustomOrderInput({ ...validOrder, email });
      expect(result.ok, `${email} should be rejected`).toBe(false);
    }
    expect(validateCustomOrderInput({ ...validOrder, email: "a@b.co" }).ok).toBe(true);
  });

  it("only accepts option ids the UI actually offers", () => {
    expect(validateCustomOrderInput({ ...validOrder, shape: "squoval" }).ok).toBe(false);
    expect(validateCustomOrderInput({ ...validOrder, length: "xl" }).ok).toBe(false);
    expect(validateCustomOrderInput({ ...validOrder, sizingPreference: "whatever" }).ok).toBe(false);
  });

  it("normalises the conditional sizing fields to the chosen preference", () => {
    // The form always holds a default standardSize of "M"; it must not leak into
    // a submission that asks for a sizing kit or custom measurements.
    const kit = validateCustomOrderInput({ ...validOrder, sizingPreference: "kit_first" });
    expect(kit.ok && kit.data.standardSize).toBeNull();
    expect(kit.ok && kit.data.customMeasurements).toBeNull();

    const standard = validateCustomOrderInput({
      ...validOrder,
      sizingPreference: "standard",
      standardSize: "L",
      customMeasurements: "15/11/12/11/9 mm",
    });
    expect(standard.ok && standard.data.standardSize).toBe("L");
    expect(standard.ok && standard.data.customMeasurements).toBeNull();

    const custom = validateCustomOrderInput({
      ...validOrder,
      sizingPreference: "custom_measurements",
      standardSize: "M",
      customMeasurements: " 15/11/12/11/9 mm ",
    });
    expect(custom.ok && custom.data.standardSize).toBeNull();
    expect(custom.ok && custom.data.customMeasurements).toBe("15/11/12/11/9 mm");
  });

  it("rejects a preset size that is not offered", () => {
    const result = validateCustomOrderInput({ ...validOrder, sizingPreference: "standard", standardSize: "XXL" });
    expect(result.ok).toBe(false);
  });

  it("enforces the field caps that the database also enforces", () => {
    expect(validateCustomOrderInput({ ...validOrder, name: "n".repeat(121) }).ok).toBe(false);
    expect(validateCustomOrderInput({ ...validOrder, conceptDescription: "c".repeat(4001) }).ok).toBe(false);
    expect(validateCustomOrderInput({ ...validOrder, additionalNotes: "n".repeat(2001) }).ok).toBe(false);
    expect(validateCustomOrderInput({ ...validOrder, conceptDescription: "c".repeat(4000) }).ok).toBe(true);
  });

  it("ignores unknown and non-string fields instead of trusting them", () => {
    const result = validateCustomOrderInput({
      ...validOrder,
      id: "attacker-controlled",
      created_at: "1970-01-01",
      submissionToken: "not-a-uuid",
      name: 42,
    });
    expect(result.ok).toBe(false); // name must be a string
    const ok = validateCustomOrderInput({ ...validOrder, shape_filter: "drop table" });
    expect(ok.ok).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Reference upload validation                                                */
/* -------------------------------------------------------------------------- */

describe("validateReferenceFiles", () => {
  const png = { filename: "mood.png", contentType: "image/png", sizeBytes: 2048 };

  it("treats a missing file list as no references", () => {
    expect(validateReferenceFiles(undefined)).toEqual({ ok: true, data: [] });
    expect(validateReferenceFiles([])).toEqual({ ok: true, data: [] });
  });

  it("accepts the types the uploader advertises", () => {
    for (const contentType of ALLOWED_REFERENCE_TYPES) {
      const result = validateReferenceFiles([{ ...png, contentType }]);
      expect(result.ok, contentType).toBe(true);
    }
  });

  it("rejects unsupported types, including non-images", () => {
    for (const contentType of ["image/svg+xml", "application/pdf", "text/html", ""]) {
      expect(validateReferenceFiles([{ ...png, contentType }]).ok, contentType).toBe(false);
    }
  });

  it("enforces the 6-file and 10 MB limits the uploader advertises", () => {
    const many = Array.from({ length: MAX_REFERENCE_FILES + 1 }, (_, i) => ({ ...png, filename: `f${i}.png` }));
    expect(validateReferenceFiles(many).ok).toBe(false);
    expect(validateReferenceFiles(many.slice(0, MAX_REFERENCE_FILES)).ok).toBe(true);

    expect(validateReferenceFiles([{ ...png, sizeBytes: MAX_REFERENCE_BYTES + 1 }]).ok).toBe(false);
    expect(validateReferenceFiles([{ ...png, sizeBytes: MAX_REFERENCE_BYTES }]).ok).toBe(true);
    expect(validateReferenceFiles([{ ...png, sizeBytes: 0 }]).ok).toBe(false);
    expect(validateReferenceFiles([{ ...png, sizeBytes: Number.NaN }]).ok).toBe(false);
  });

  it("sanitises filenames so a crafted name cannot influence the object path", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("C:\\windows\\system32\\evil.png")).toBe("evil.png");
    expect(sanitizeFilename("bad\u0000name.png")).toBe("badname.png");
    expect(sanitizeFilename("")).toBe("reference");
    expect(sanitizeFilename("x".repeat(400))).toHaveLength(255);

    const result = validateReferenceFiles([{ ...png, filename: "../../escape.png" }]);
    expect(result.ok && result.data[0].filename).toBe("escape.png");
  });
});

/* -------------------------------------------------------------------------- */
/* Object path authorization                                                   */
/* -------------------------------------------------------------------------- */

describe("reference object paths", () => {
  it("builds unpredictable, submission-scoped paths", () => {
    const objectId = "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
    const path = buildReferencePath(TOKEN, objectId, "image/png");

    expect(path).toBe(`custom-order-references/${TOKEN}/${objectId}.png`);
    expect(path).not.toContain("..");
    expect(isReferencePathInScope(path, TOKEN)).toBe(true);
  });

  it("maps each allowed type to a safe extension", () => {
    const objectId = "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
    expect(buildReferencePath(TOKEN, objectId, "image/jpeg")).toMatch(/\.jpg$/);
    expect(buildReferencePath(TOKEN, objectId, "image/webp")).toMatch(/\.webp$/);
    expect(buildReferencePath(TOKEN, objectId, "image/heic")).toMatch(/\.heic$/);
    expect(buildReferencePath(TOKEN, objectId, "image/gif")).toMatch(/\.gif$/);
  });

  it("refuses to build a path from malformed identifiers", () => {
    expect(() => buildReferencePath("not-a-uuid", "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "image/png")).toThrow();
    expect(() => buildReferencePath(TOKEN, "../../../etc/passwd", "image/png")).toThrow();
  });

  it("authorizes only paths inside the submission's own folder", () => {
    const other = "11111111-2222-4333-8444-555555555555";
    const objectId = "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
    const mine = `custom-order-references/${TOKEN}/${objectId}.png`;

    expect(isReferencePathInScope(mine, TOKEN)).toBe(true);
    // Another submission's folder.
    expect(isReferencePathInScope(`custom-order-references/${other}/${objectId}.png`, TOKEN)).toBe(false);
    // Traversal and absolute paths.
    expect(isReferencePathInScope(`custom-order-references/${TOKEN}/../${other}/${objectId}.png`, TOKEN)).toBe(false);
    expect(isReferencePathInScope(`/${mine}`, TOKEN)).toBe(false);
    // Wrong prefix, wrong extension, nested folders, empty.
    expect(isReferencePathInScope(`${objectId}.png`, TOKEN)).toBe(false);
    expect(isReferencePathInScope(`custom-order-references/${TOKEN}/${objectId}.svg`, TOKEN)).toBe(false);
    expect(isReferencePathInScope(`custom-order-references/${TOKEN}/nested/${objectId}.png`, TOKEN)).toBe(false);
    expect(isReferencePathInScope("", TOKEN)).toBe(false);
    expect(isReferencePathInScope(mine, "not-a-uuid")).toBe(false);
    expect(isReferencePathInScope(null, TOKEN)).toBe(false);
    expect(isReferencePathInScope(42, TOKEN)).toBe(false);
  });

  it("recognises well-formed submission tokens only", () => {
    expect(isValidSubmissionToken(TOKEN)).toBe(true);
    expect(isValidSubmissionToken("0f8fad5bd9cb469fa16570867728950e")).toBe(false);
    expect(isValidSubmissionToken("")).toBe(false);
    expect(isValidSubmissionToken(undefined)).toBe(false);
    expect(isValidSubmissionToken({ toString: () => TOKEN })).toBe(false);
  });
});
