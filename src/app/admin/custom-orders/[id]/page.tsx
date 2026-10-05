import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { updateCustomOrderStatusAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import {
  CUSTOM_ORDER_STATUS_LABELS,
  customOrderNextStatuses,
  isCustomOrderStatus,
} from "@/lib/admin/lifecycle";
import { getPrisma } from "@/lib/prisma/db";
import {
  AdminFieldList,
  AdminPageHeader,
  AdminSection,
  StatusPill,
} from "@/components/admin/ui/primitives";
import { AdminButton, Field, Select, TextArea } from "@/components/admin/ui/controls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Custom order — Studio Control Center",
  robots: { index: false, follow: false },
};

const readable = (value: Date) =>
  value.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * One custom-order request.
 *
 * Every submitted field is shown exactly as the customer sent it — nothing here
 * is editable except the studio's own review state and internal note, because the
 * brief is the customer's words. What changed is presentation: the fields read as
 * labelled prose in a document rather than as small-caps monospace key/value
 * pairs, dates are formatted for a person, and the review form is grouped with the
 * decision it makes rather than floating at the bottom of the page.
 */
export default async function AdminCustomOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/custom-orders");
  const { id } = await params;

  const prisma = getPrisma();
  const request = await prisma.custom_order_requests.findUnique({ where: { id } });
  if (!request) notFound();

  const attachments = await prisma.custom_order_attachments.findMany({
    where: { request_id: request.id },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    select: { id: true, original_filename: true, content_type: true, size_bytes: true },
  });

  const nextStatuses = customOrderNextStatuses(request.status);
  const statusLabel = isCustomOrderStatus(request.status)
    ? CUSTOM_ORDER_STATUS_LABELS[request.status]
    : request.status;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <AdminPageHeader
        back={{ href: "/admin/custom-orders", label: "Custom Orders" }}
        title={request.name}
        count={`Submitted ${readable(request.created_at)}${
          request.status_updated_at ? ` · last updated ${readable(request.status_updated_at)}` : ""
        }`}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusPill tone={request.status === "pending_review" ? "attention" : "neutral"}>
          {statusLabel}
        </StatusPill>
        <p className="text-[13px] text-muted-foreground">
          {request.email}
          {request.instagram ? ` · @${request.instagram}` : ""}
        </p>
      </div>

      <AdminSection title="The brief">
        <AdminFieldList
          fields={[
            { label: "Shape", value: request.shape },
            { label: "Length", value: request.length },
            { label: "Sizing", value: request.sizing_preference },
            { label: "Standard size", value: request.standard_size },
            { label: "Custom measurements", value: request.custom_measurements },
            { label: "Needed by", value: request.event_date },
            { label: "Colour palette", value: request.color_palette },
            { label: "Budget guidance", value: request.budget_guidance },
            { label: "Concept", value: request.concept_description, wide: true },
            { label: "Additional notes", value: request.additional_notes, wide: true },
          ]}
        />
      </AdminSection>

      <AdminSection
        title="Reference files"
        description="Held in private storage. Opening one authorises you and creates a link valid for 60 seconds."
        divided
      >
        {attachments.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No reference files were submitted.</p>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm text-foreground">
                      {attachment.original_filename}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(Number(attachment.size_bytes) / 1024).toFixed(0)} KB
                    </span>
                  </span>
                </span>
                <a
                  href={`/admin/attachments/${attachment.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[13px] text-accent hover:underline"
                >
                  Open
                </a>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection
        title="Your review"
        description="This records your decision only. The customer's brief above is never altered, and nothing is emailed, texted or sent on your behalf."
        divided
      >
        <form action={updateCustomOrderStatusAction} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={request.id} />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Move to" htmlFor="co-status">
              <Select id="co-status" name="status" defaultValue={nextStatuses[0] ?? ""}>
                {nextStatuses.map((value) => (
                  <option key={value} value={value}>
                    {CUSTOM_ORDER_STATUS_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Internal note"
              htmlFor="co-note"
              optional
              hint="Only visible to you."
              className="sm:col-span-1"
            >
              <TextArea
                id="co-note"
                name="admin_note"
                defaultValue={request.admin_note ?? ""}
                rows={3}
              />
            </Field>
          </div>

          <div>
            <AdminButton type="submit" variant="primary">
              Save review
            </AdminButton>
          </div>
        </form>
      </AdminSection>
    </div>
  );
}
