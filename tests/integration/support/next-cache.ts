/** Records revalidation calls instead of touching a Next.js cache. */
const paths: string[] = [];

export function revalidatePath(path: string) {
  paths.push(path);
}
export function revalidateTag(tag: string) {
  paths.push(`tag:${tag}`);
}
export function clearRevalidated() {
  paths.length = 0;
}
export function revalidatedPaths() {
  return [...paths];
}
