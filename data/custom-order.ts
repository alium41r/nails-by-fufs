export interface ShapeOption {
  id: string;
  name: string;
  description: string;
}

export interface LengthOption {
  id: string;
  name: string;
  description: string;
}

export interface SizingOption {
  id: string;
  name: string;
  description: string;
}

export interface UploadedReferenceImage {
  id: string;
  file?: File;
  previewUrl: string;
  name: string;
  sizeFormatted: string;
}

export interface CustomOrderFormState {
  name: string;
  email: string;
  instagram: string;
  shape: string;
  length: string;
  sizingPreference: "kit_first" | "standard" | "custom_measurements";
  standardSize: string;
  customMeasurements: string;
  colorPalette: string;
  conceptDescription: string;
  eventDate: string;
  budgetGuidance: string;
  additionalNotes: string;
}

export const AVAILABLE_SHAPES: ShapeOption[] = [
  { id: "almond", name: "Almond", description: "Soft tapered point, versatile" },
  { id: "short-square", name: "Short Square", description: "Clean modern flat edge" },
  { id: "oval", name: "Oval", description: "Natural curved elongation" },
  { id: "stiletto", name: "Stiletto", description: "Dramatic sculpted tip" },
  { id: "coffin", name: "Coffin", description: "Tapered with squared tip" },
];

export const AVAILABLE_LENGTHS: LengthOption[] = [
  { id: "short", name: "Short", description: "Comfortable daily length" },
  { id: "medium", name: "Medium", description: "Balanced extension" },
  { id: "long", name: "Long", description: "Sculpted statement look" },
];

export const AVAILABLE_SIZING_OPTIONS: SizingOption[] = [
  {
    id: "kit_first",
    name: "Send Sizing Kit First",
    description: "Complimentary sizing sample card sent before creating your set (Recommended for guaranteed fit).",
  },
  {
    id: "standard",
    name: "Standard Preset Size",
    description: "Select from XS, S, M, or L preset widths.",
  },
  {
    id: "custom_measurements",
    name: "Custom Millimeter Widths",
    description: "Enter your exact thumb-to-pinky millimeter measurements.",
  },
];

export const INITIAL_CUSTOM_ORDER_STATE: CustomOrderFormState = {
  name: "",
  email: "",
  instagram: "",
  shape: "almond",
  length: "medium",
  sizingPreference: "kit_first",
  standardSize: "M",
  customMeasurements: "",
  colorPalette: "",
  conceptDescription: "",
  eventDate: "",
  budgetGuidance: "",
  additionalNotes: "",
};
