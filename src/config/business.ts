import { siteConfig } from "@/config/site";

/**
 * Central business details — the single source of truth for the public
 * policy pages, the contact page and the legal blocks.
 *
 * Fill a value here once and it appears everywhere it is used.
 *
 * All values below are confirmed by the owner. Two deliberate omissions:
 *
 *   • No registered legal entity, registration number or VAT number. "Nails by
 *     Fufs" is a brand name only, so those fields do not exist here rather than
 *     being modelled and left blank.
 *   • The address is a locality only ("Sector M, DHA Phase 5, Lahore"). No house
 *     number is stored or published.
 */

export interface BusinessDetails {
  /** Brand name shown across the site. */
  brandName: string;
  /** Public business email address. */
  email: string;
  /** Public business contact number, as published. */
  phone: string;
  /** Local business/office address, one line per row. Locality only. */
  addressLines: string[];
  /** Country of operation. */
  country: string;
  /** Country whose law governs the Terms & Conditions. */
  jurisdiction: string;
}

export const businessDetails: BusinessDetails = {
  brandName: siteConfig.name,
  email: "sorry360.you@gmail.com",
  phone: "03081364285",
  addressLines: ["Sector M, DHA Phase 5, Lahore"],
  country: "Pakistan",
  jurisdiction: "Pakistan",
};

/** Date the policy pages were last prepared. Update when their content changes. */
export const POLICY_LAST_UPDATED = "4 October 2026";

/** Where customers are pointed for anything policy-related. */
export const POLICY_CONTACT_HREF = "/contact";

/** Clickable forms of the confirmed contact details. */
export const BUSINESS_EMAIL_HREF = `mailto:${businessDetails.email}`;
export const BUSINESS_PHONE_HREF = `tel:${businessDetails.phone.replace(/[^\d+]/g, "")}`;

export function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * The business contact rows, in the order they should be displayed. Used by the
 * policy pages' business block and the contact page.
 */
export function businessContactRows(): { label: string; value: string }[] {
  return [
    { label: "Email", value: businessDetails.email },
    { label: "Phone", value: businessDetails.phone },
    { label: "Address", value: businessDetails.addressLines.join(", ") },
    { label: "Country", value: businessDetails.country },
  ];
}
