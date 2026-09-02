export interface NavItem {
  label: string;
  href: string;
}

export interface SiteConfig {
  name: string;
  shortName: string;
  description: string;
  announcement: {
    enabled: boolean;
    text: string;
    href?: string;
  };
  mainNav: NavItem[];
  footerNav: {
    title: string;
    items: NavItem[];
  }[];
  socials: {
    label: string;
    href: string;
  }[];
}

export const siteConfig: SiteConfig = {
  name: "Nails by Fufs",
  shortName: "Fufs",
  description: "Handcrafted, reusable press-on nails and custom nail artistry by Fufs.",
  announcement: {
    enabled: true,
    text: "Complimentary bespoke sizing kit included with your first order",
    href: "/size-guide",
  },
  mainNav: [
    { label: "Shop", href: "/shop" },
    { label: "Collections", href: "/collections" },
    { label: "Custom", href: "/custom" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Size Guide", href: "/size-guide" },
  ],
  footerNav: [
    {
      title: "Shop",
      items: [
        { label: "All Press-Ons", href: "/shop" },
        { label: "Collections", href: "/collections" },
        { label: "Custom Orders", href: "/custom" },
      ],
    },
    {
      title: "Care & Sizing",
      items: [
        { label: "How It Works", href: "/how-it-works" },
        { label: "Size Guide", href: "/size-guide" },
      ],
    },
    {
      title: "Information",
      items: [
        { label: "About Fufs", href: "/about" },
        { label: "FAQ", href: "/faq" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ],
  socials: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "TikTok", href: "https://tiktok.com" },
    { label: "Pinterest", href: "https://pinterest.com" },
  ],
};
