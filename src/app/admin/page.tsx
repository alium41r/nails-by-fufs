import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, ImagePlus, Package, Sparkles, TrendingUp } from "lucide-react";

import { requireAdmin } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/prisma/db";
import { isPriced } from "@/lib/currency";
import { getSiteBasics } from "@/lib/site-content";
import { AdminPageHeader, AdminSection, AdminEmptyState, StatusPill } from "@/components/admin/ui/primitives";
import { AdminButton } from "@/components/admin/ui/controls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview — Studio Control Center",
  robots: { index: false, follow: false },
};

const shortDate = (value: Date) =>
  value.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const money = (minor: number, currency: string) => `${currency} ${(minor / 100).toFixed(2)}`;

/**
 * The Control Center overview.
 *
 * ## What this page is for, and what it deliberately is not
 *
 * Previously `/admin` *was* the catalogue: every product and every collection,
 * plus four counters and a Studio Mode banner, on the landing page. Opening the
 * admin meant being handed the entire inventory before being told what needed
 * doing — the opposite of a control center.
 *
 * This page answers three questions and then stops:
 *
 *   1. **Is anything waiting on me?** Only conditions that actually block a sale
 *      or need a reply, as compact cards. Nothing appears here when there is
 *      nothing to do.
 *   2. **What happened recently?** The latest requests and orders, as a short list.
 *   3. **What do I want to do next?** Three quick actions.
 *
 * The catalogue itself lives at `/admin/catalogue`. Nothing on this page is a
 * duplicate of a control that exists there.
 *
 * ## Why "needs attention" is a query, not a stored flag
 *
 * Each count is derived from the same facts the storefront and checkout enforce —
 * a product without a price is not sellable, a product without a photo renders a
 * placeholder — so the list cannot drift from reality and cannot be dismissed.
 * Every card links to a pre-filtered list, so a number is always one click from
 * the rows behind it.
 */
export default async function AdminOverviewPage() {
  await requireAdmin();
  const prisma = getPrisma();

  const [{ identity }, products, productImages, customPending, customInReview, apptPending, orders] =
    await Promise.all([
      getSiteBasics(),
      prisma.products.findMany({
        where: { archived_at: null },
        select: {
          id: true,
          name: true,
          is_active: true,
          price_minor: true,
          currency: true,
          collection_id: true,
          collections: { select: { is_active: true, archived_at: true } },
        },
      }),
      prisma.product_images.findMany({ select: { product_id: true } }),
      prisma.custom_order_requests.count({ where: { status: "pending_review" } }),
      prisma.custom_order_requests.count({ where: { status: "in_review" } }),
      prisma.appointment_requests.count({ where: { status: "pending_review" } }),
      prisma.orders.findMany({
        orderBy: [{ created_at: "desc" }],
        take: 5,
        select: {
          id: true,
          currency: true,
          total_minor: true,
          status: true,
          created_at: true,
          order_items: { select: { id: true } },
        },
      }),
    ]);

  const withImage = new Set(productImages.map((row) => row.product_id));

  // The two conditions that actually prevent a sale, counted separately so each
  // card can name its own fix.
  const missingPrice = products.filter((row) => !isPriced(row.price_minor, row.currency));
  const missingPhoto = products.filter((row) => !withImage.has(row.id));
  const hiddenCollection = products.filter(
    (row) =>
      row.collection_id !== null &&
      row.collections !== null &&
      (!row.collections.is_active || row.collections.archived_at !== null),
  );

  const attention = [
    {
      key: "price",
      count: missingPrice.length,
      title: "Missing a price",
      description: "These sets cannot be bought until a price is set.",
      href: "/admin/catalogue?filter=attention",
      tone: "critical" as const,
    },
    {
      key: "photo",
      count: missingPhoto.length,
      title: "Missing a photo",
      description: "The storefront shows an empty frame until one is uploaded.",
      href: "/admin/catalogue?tab=media",
      tone: "attention" as const,
    },
    {
      key: "collection",
      count: hiddenCollection.length,
      title: "In a hidden collection",
      description: "Their collection is not published, so they are invisible.",
      href: "/admin/catalogue?filter=attention",
      tone: "attention" as const,
    },
  ].filter((entry) => entry.count > 0);

  const queue = [
    {
      key: "custom",
      count: customPending,
      title: "Custom orders to review",
      description: "New requests waiting for your first reply.",
      href: "/admin/custom-orders?status=pending_review",
    },
    {
      key: "custom-progress",
      count: customInReview,
      title: "Custom orders in progress",
      description: "Already opened and being worked on.",
      href: "/admin/custom-orders?status=in_review",
    },
    {
      key: "appointments",
      count: apptPending,
      title: "Appointments to review",
      description: "Booking requests waiting to be confirmed.",
      href: "/admin/appointments?status=pending_review",
    },
  ].filter((entry) => entry.count > 0);

  const recent = await prisma.custom_order_requests.findMany({
    orderBy: [{ created_at: "desc" }],
    take: 4,
    select: { id: true, name: true, shape: true, status: true, created_at: true },
  });

  const totalWaiting = attention.reduce((sum, entry) => sum + entry.count, 0);
  const totalQueue = queue.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="flex flex-col gap-10">
      <AdminPageHeader
        title="Studio Control Center"
        description={
          totalWaiting === 0 && totalQueue === 0
            ? `Everything is up to date at ${identity.name}.`
            : `Here is what needs you at ${identity.name} today.`
        }
        actions={
          <>
            <Link href="/admin/products/new">
              <AdminButton variant="primary">Add product</AdminButton>
            </Link>
            <Link href="/?studio=1">
              <AdminButton>
                <Sparkles className="h-4 w-4" />
                Open Studio Mode
              </AdminButton>
            </Link>
          </>
        }
      />

      {/* ── Needs attention ─────────────────────────────────────────────── */}
      <AdminSection
        title="Needs attention"
        description="Only things that are actually blocking a sale or waiting on you."
      >
        {attention.length === 0 && queue.length === 0 ? (
          <div className="rounded-lg border border-border/70 bg-surface px-5 py-6">
            <p className="text-sm text-foreground">Nothing needs your attention right now.</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Every published product has a price and a photo, and there are no requests waiting.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...attention, ...queue].map((entry) => (
              <Link
                key={entry.key}
                href={entry.href}
                className="group flex flex-col gap-2 rounded-lg border border-border/70 bg-surface p-5 transition-colors hover:border-foreground/20 hover:bg-surface-subtle/40"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-3xl leading-none text-foreground">
                    {entry.count}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
                <span className="text-sm font-medium text-foreground">{entry.title}</span>
                <span className="text-[13px] leading-relaxed text-muted-foreground">
                  {entry.description}
                </span>
              </Link>
            ))}
          </div>
        )}
      </AdminSection>

      {/* ── Quick actions ───────────────────────────────────────────────── */}
      <AdminSection title="Quick actions">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickAction
            href="/admin/products/new"
            icon={<Package className="h-4 w-4" />}
            title="Add a product"
            description="Start a new set as an unpublished draft."
          />
          <QuickAction
            href="/admin/catalogue?tab=media"
            icon={<ImagePlus className="h-4 w-4" />}
            title="Upload photos"
            description="Find sets the storefront is showing a placeholder for."
          />
          <QuickAction
            href="/?studio=1"
            icon={<Sparkles className="h-4 w-4" />}
            title="Edit the storefront"
            description="Change wording and imagery directly on the page."
          />
        </div>
      </AdminSection>

      {/* ── Recent activity ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AdminSection
          title="Recent custom orders"
          actions={
            <Link
              href="/admin/custom-orders"
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </Link>
          }
        >
          {recent.length === 0 ? (
            <AdminEmptyState
              title="No custom orders yet"
              description="Requests submitted through the storefront appear here."
            />
          ) : (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-surface">
              {recent.map((request) => (
                <li key={request.id}>
                  <Link
                    href={`/admin/custom-orders/${request.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-subtle/50"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {request.name}
                      </span>
                      <span className="truncate text-[13px] text-muted-foreground">
                        {request.shape} · {shortDate(request.created_at)}
                      </span>
                    </span>
                    <StatusPill tone={request.status === "pending_review" ? "attention" : "neutral"}>
                      {request.status.replace(/_/g, " ")}
                    </StatusPill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection
          title="Recent orders"
          actions={
            <Link
              href="/admin/orders"
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </Link>
          }
        >
          {orders.length === 0 ? (
            <AdminEmptyState
              title="No orders yet"
              description="Orders appear here once checkout can complete."
            />
          ) : (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-surface">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {money(order.total_minor, order.currency)}
                      </span>
                      <span className="truncate text-[13px] text-muted-foreground">
                        {order.order_items.length} item
                        {order.order_items.length === 1 ? "" : "s"} · {shortDate(order.created_at)}
                      </span>
                    </span>
                  </span>
                  <StatusPill tone="neutral">{order.status.replace(/_/g, " ")}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>

      {apptPending > 0 && (
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {apptPending} appointment {apptPending === 1 ? "request is" : "requests are"} waiting —
          <Link href="/admin/appointments?status=pending_review" className="text-accent hover:underline">
            review now
          </Link>
        </p>
      )}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border border-border/70 bg-surface p-4 transition-colors hover:border-foreground/20 hover:bg-surface-subtle/40"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-accent">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-[13px] leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}
