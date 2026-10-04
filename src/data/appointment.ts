/**
 * Appointment booking — form contract (UI only).
 *
 * The field names on `AppointmentFormState` are the payload the backend should
 * accept. Nothing here is pricing, duration, opening hours or availability:
 * those are not defined yet, so the page never states them.
 */

export type AppointmentServiceId = "own_set" | "fufs_set" | "undecided";

export interface AppointmentServiceOption {
  id: AppointmentServiceId;
  name: string;
  description: string;
}

/**
 * Appointment types. Populate / extend from the backend later. Descriptions
 * deliberately contain no price or duration.
 */
export const APPOINTMENT_SERVICES: AppointmentServiceOption[] = [
  {
    id: "fufs_set",
    name: "A set from Nails by Fufs",
    description: "A ready-to-wear or custom set from the studio, applied in person.",
  },
  {
    id: "own_set",
    name: "A set I already own",
    description: "Bring your own press-ons to have them applied.",
  },
  {
    id: "undecided",
    name: "Not sure yet",
    description: "Tell us what you have in mind and we'll talk it through.",
  },
];

export interface AppointmentFormState {
  name: string;
  phone: string;
  email: string;
  serviceType: AppointmentServiceId;
  /** ISO date, YYYY-MM-DD. */
  preferredDate: string;
  /** 24h HH:mm. */
  preferredTime: string;
  /** Optional backup date, YYYY-MM-DD. */
  alternateDate: string;
  /** Which set / design they want, if known. */
  setDetails: string;
  notes: string;
}

export const INITIAL_APPOINTMENT_STATE: AppointmentFormState = {
  name: "",
  phone: "",
  email: "",
  serviceType: "fufs_set",
  preferredDate: "",
  preferredTime: "",
  alternateDate: "",
  setDetails: "",
  notes: "",
};

export type AppointmentResult =
  | { ok: true }
  | { ok: false; errors: Partial<Record<keyof AppointmentFormState | "form", string>> };

/**
 * Submission adapter. The backend agent should replace the body of this
 * function (server action / fetch) and keep the signature.
 */
export async function submitAppointmentRequest(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _data: AppointmentFormState,
): Promise<AppointmentResult> {
  // TODO(backend): send `_data` to the booking endpoint.
  if (process.env.NODE_ENV !== "production") {
    // Preview only, so the request-received state can be reviewed locally.
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { ok: true };
  }
  return {
    ok: false,
    errors: { form: "Online booking requests aren't connected yet. Please contact the studio directly." },
  };
}
