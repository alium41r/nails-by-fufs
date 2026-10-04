import Link from "next/link";
import { notFound } from "next/navigation";

import { updateCustomOrderStatusAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import {
  CUSTOM_ORDER_STATUS_LABELS,
  customOrderNextStatuses,
  isCustomOrderStatus,
} from "@/lib/admin/lifecycle";
import { getPrisma } from "@/lib/prisma/db";

export const dynamic = "force-dynamic";

const fieldClass = "h-10 px-3 bg-background border border-border text-sm text-foreground w-full rounded-xs";
const labelClass = "text-[11px] uppercase tracking-wider font-mono text-muted-foreground";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={labelClass}>{label}</span>
      <span className="text-sm text-foreground break-words">{value && value.length > 0 ? value : "—"}</span>
    </div>
  );
}

export default async function AdminCustomOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin("/admin/custom-orders");
  const { id } = await params;
  const { saved, error } = await searchParams;

  const prisma = getPrisma();
  const request = await prisma.custom_order_requests.findUnique({ where: { id } });
  if (!request) notFound();

  const attachments = await prisma.custom_order_attachments.findMany({
    where: { request_id: request.id },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    select: { id: true, original_filename: true, content_type: true, size_bytes: true, sort_order: true },
  });

  const nextStatuses = customOrderNextStatuses(request.status);
  const statusLabel = isCustomOrderStatus(request.status)
    ? CUSTOM_ORDER_STATUS_LABELS[request.status]
    : request.status;

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex flex-col gap-2">
        <Link href="/admin/custom-orders" className="text-[11px] text-muted-foreground hover:text-accent">
          ← Custom Orders
        </Link>
        <h1 className="font-display font-light text-3xl text-foreground">{request.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
          <span className="px-2 py-0.5 border border-accent/40 text-accent">{statusLabel}</span>
          <span className="text-muted-foreground">
            submitted {request.created_at.toISOString().slice(0, 16).replace("T", " ")}
          </span>
          {request.status_updated_at && (
            <span className="text-muted-foreground">
              status changed {request.status_updated_at.toISOString().slice(0, 16).replace("T", " ")}
            </span>
          )}
        </div>
      </div>

      {(saved || error) && (
        <p
          role="status"
          className={
            error
              ? "text-xs border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 p-3"
              : "text-xs border border-accent/30 bg-accent-subtle text-accent p-3"
          }
        >
          {error ?? "Saved."}
        </p>
      )}

      <section className="border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="eyebrow text-accent">Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" value={request.name} />
          <Field label="Email" value={request.email} />
          <Field label="Instagram" value={request.instagram ? `@${request.instagram}` : null} />
        </div>
      </section>

      <section className="border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="eyebrow text-accent">Design</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Shape" value={request.shape} />
          <Field label="Length" value={request.length} />
          <Field label="Sizing preference" value={request.sizing_preference} />
          <Field label="Standard size" value={request.standard_size} />
          <Field label="Custom measurements" value={request.custom_measurements} />
          <Field label="Event date" value={request.event_date} />
        </div>
        <Field label="Colour palette" value={request.color_palette} />
        <Field label="Concept" value={request.concept_description} />
        <Field label="Budget guidance" value={request.budget_guidance} />
        <Field label="Additional notes" value={request.additional_notes} />
      </section>

      <section className="border border-border bg-surface p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="eyebrow text-accent">Reference Files</h2>
          <span className="text-[10px] font-mono text-muted-foreground">{attachments.length} file(s)</span>
        </div>
        {attachments.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No reference files were submitted.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60 border-t border-border">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm text-foreground truncate">{attachment.original_filename}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {attachment.content_type} · {(Number(attachment.size_bytes) / 1024).toFixed(0)} KB
                  </span>
                </div>
                {/* Private bucket: opened through an authorising route that mints a
                    60-second signed URL, so no public link exists in this HTML. */}
                <a
                  href={`/admin/attachments/${attachment.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 inline-flex items-center px-3 border border-border text-[11px] hover:border-accent/50 hover:text-accent transition-colors"
                >
                  View File
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Files live in the private custom-order bucket. Viewing authorises you and mints a signed URL valid
          for 60 seconds — nothing is public and this page contains no direct link to storage.
        </p>
      </section>

      <section className="border border-border bg-surface p-5 flex flex-col gap-4">
        <h2 className="eyebrow text-accent">Review</h2>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Changing the state records the studio&apos;s decision. The customer&apos;s submitted details above are
          never altered, and no email, SMS or WhatsApp message is sent by the system.
        </p>
        <form action={updateCustomOrderStatusAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={request.id} />
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Move to</span>
            <select name="status" className={fieldClass} defaultValue={nextStatuses[0] ?? ""}>
              {nextStatuses.map((value) => (
                <option key={value} value={value}>
                  {CUSTOM_ORDER_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Internal note (never shown to the customer)</span>
            <textarea
              name="admin_note"
              defaultValue={request.admin_note ?? ""}
              rows={3}
              className="p-3 bg-background border border-border text-sm text-foreground w-full rounded-xs"
            />
          </label>
          <button type="submit" className="h-10 px-4 bg-foreground text-background text-[11px] uppercase tracking-[0.16em] self-start">
            Save Review State
          </button>
        </form>
      </section>
    </div>
  );
}
