import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";
import { StudioBoundary } from "@/components/studio/StudioBoundary";
import { getPolicyPage } from "@/lib/site-content";

/**
 * returns-refunds
 *
 * Copy is owner-managed: this page renders the `page.policy.returns-refunds`
 * content document, and the wording it originally shipped with is the code
 * default for that document (see `DEFAULT_POLICIES` in
 * `@/lib/site-content-schema`). Nothing about the layout, the section index, the
 * anchors or the business-details block is editable from the admin — only the
 * words.
 *
 * `{{email}}`, `{{phone}}`, `{{address}}`, `{{country}}` and
 * `{{jurisdiction}}` in the stored prose are resolved against the current
 * contact settings at render time, so changing the studio's email updates every
 * page that mentions it.
 */
export async function generateMetadata(): Promise<Metadata> {
  const policy = await getPolicyPage("returns-refunds");
  return {
    title: policy.metaTitle,
    description: policy.metaDescription,
  };
}

export default async function ReturnsRefundsPage() {
  const policy = await getPolicyPage("returns-refunds");

  return (
    <StudioBoundary>
      <LegalPage
        contentKey="page.policy.returns-refunds"
        eyebrow={policy.eyebrow}
        title={policy.title}
        description={policy.description}
        intro={policy.intro}
        sections={policy.sections}
        lastUpdated={policy.lastUpdated}
      />
    </StudioBoundary>
  );
}
