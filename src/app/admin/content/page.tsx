import Link from "next/link";
import { Sparkles } from "lucide-react";

import { requireAdmin } from "@/lib/admin/auth";
import { getSiteContent } from "@/lib/site-content";
import { POLICY_SLUGS } from "@/lib/site-content-schema";
import { AdminPageHeader, AdminSection } from "@/components/admin/ui/primitives";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Content & Settings — Studio Control Center",
  robots: { index: false, follow: false },
};

/**
 * Content and settings.
 *
 * ## The division of labour, made explicit
 *
 * B8D gave the admin two ways to change storefront content: this page's forms, and
 * Studio Mode editing directly on the page. Rather than presenting both as equally
 * valid for everything (which is how the same field ends up maintained in two
 * places), the page now says which is which:
 *
 *   - **Settings** — scalars with no position on a page (a phone number, a
 *     currency, a business name). Edited here, in a form.
 *   - **Page copy and imagery** — anything that *appears* somewhere. Edited in
 *     Studio Mode, next to the thing itself, because that is faster and because the
 *     words stay in view with the layout they sit in.
 *
 * The policy pages, the FAQ and the homepage are therefore linked into Studio Mode
 * rather than duplicated as second forms here. Nothing became unreachable: it moved
 * to the surface where it is actually edited.
 */
export default async function AdminContentPage() {
  await requireAdmin("/admin/content");
  const content = await getSiteContent();

  return (
    <div className="flex flex-col gap-10">
      <AdminPageHeader
        title="Content & Settings"
        description="Your business details and the words customers read. Changes here go live immediately."
        actions={
          <Link
            href="/?studio=1"
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" />
            Open Studio Mode
          </Link>
        }
      />

      <StoreSettingsForm
        values={{
          ...content.identity,
          ...content.contact,
          addressLines: content.contact.addressLines.join("\n"),
          defaultCurrency: content.currency.default,
          socials: content.socials.map((social) => ({ label: social.label, href: social.href })),
        }}
      />

      <AdminSection
        title="Page wording and imagery"
        description="The homepage, the FAQ and the policy pages are edited in place — open the page, and change the words and photos where they appear. These are not duplicated here, so there is only ever one copy of each."
        divided
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StudioLink
            href="/?studio=1"
            title="Homepage"
            detail="Hero, featured collection, shop preview, gallery and closing section"
          />
          <StudioLink
            href="/faq?studio=1"
            title="FAQ"
            detail="Questions, answers and categories"
          />
          {POLICY_SLUGS.map((slug) => (
            <StudioLink
              key={slug}
              href={`/${slug}?studio=1`}
              title={content.policies[slug]?.title ?? slug}
              detail="Section headings, paragraphs and bullet points"
            />
          ))}
        </div>

        <p className="text-[13px] text-muted-foreground">
          The announcement bar and the navigation appear on every page, so they can be edited from any
          Studio Mode screen.
        </p>
      </AdminSection>
    </div>
  );
}

function StudioLink({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-surface p-4 transition-colors hover:border-foreground/20 hover:bg-surface-subtle/40"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-[13px] leading-relaxed text-muted-foreground">{detail}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[13px] text-accent">
        Edit
        <span
          aria-hidden="true"
          className="transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </Link>
  );
}
