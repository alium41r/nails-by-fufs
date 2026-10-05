import { getAdminUser } from "@/lib/admin/auth";

/**
 * The hover-group class an image slot needs while Studio Mode is showing its
 * upload control.
 *
 * Resolved on the server, so the class is absent from a customer's markup
 * entirely. It is inert CSS either way — a `group/name` variant with nothing
 * referencing it changes nothing — but a customer's DOM should not carry the
 * names of an editor they cannot see, and computing it here also keeps that
 * property from depending on remembering to strip the class later.
 *
 * Safe to call from any server component: `getAdminUser` returns null for
 * everyone except a signed-in admin.
 */
export async function studioImageGroupClass(): Promise<string> {
  return (await getAdminUser()) ? "group/studio-image" : "";
}
