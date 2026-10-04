/**
 * Contact page copy.
 *
 * The previous version of this page also carried a contact *form* whose submit
 * handler was a timer that showed a success state without sending anything. That
 * flow has been removed: until a real contact backend exists, the page publishes
 * the studio's direct contact details instead of pretending to deliver a message.
 *
 * The form state/validation helpers that only that form used (ContactFormState,
 * contactInquiryReasons, INITIAL_CONTACT_STATE) were removed with it.
 */

export const contactHero = {
  eyebrow: "Get in Touch",
  title: "Contact the Studio",
  description:
    "Questions about a set, sizing, an order or a commission? Reach Fatima directly by email or phone — the studio replies from there.",
};
