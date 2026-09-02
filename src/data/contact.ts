export interface ContactFormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const contactHero = {
  eyebrow: "Get in Touch",
  title: "Contact the Studio",
  description:
    "Have a question about a set, sizing, or general inquiries? Send a note below and Fatima will respond directly.",
};

export const contactInquiryReasons = [
  "General Inquiry",
  "Sizing & Fit Question",
  "Custom Commission Question",
  "Order Assistance",
  "Collaboration / Press",
];

export const INITIAL_CONTACT_STATE: ContactFormState = {
  name: "",
  email: "",
  subject: "General Inquiry",
  message: "",
};
