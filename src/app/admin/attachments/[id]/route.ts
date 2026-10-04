import { NextResponse, type NextRequest } from "next/server";

import { getAdminUser } from "@/lib/admin/auth";
import { requireAdmin } from "@/lib/admin/auth";
import { getPrisma } from "@/lib/prisma/db";
import { getReferenceStorage } from "@/lib/supabase/admin";

/**
 * Private custom-order reference files.
 *
 * The bucket stays private and no object is ever exposed by a public URL. This
 * route authorises the admin, confirms the object belongs to the attachment row,
 * then mints a short-lived signed URL and redirects to it — so the file is
 * reachable only through an authorised, logged-in session and the signed link
 * expires within a minute.
 *
 * It is deliberately not a Server Action: a redirect keeps the signed URL out of
 * page HTML entirely.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Authorise first: an anonymous or non-admin caller must not learn anything.
  const user = await getAdminUser();
  if (!user) {
    await requireAdmin("/admin/custom-orders"); // redirects
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const { id } = await params;
  const attachment = await getPrisma().custom_order_attachments.findUnique({
    where: { id },
    select: { storage_path: true },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data, error } = await getReferenceStorage()
    .from("custom-order-references")
    .createSignedUrl(attachment.storage_path, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "The file could not be opened." }, { status: 502 });
  }

  // Short-lived (60s) signed URL, never cached.
  return NextResponse.redirect(data.signedUrl, {
    status: 302,
    headers: { "cache-control": "no-store, private" },
  });
}
