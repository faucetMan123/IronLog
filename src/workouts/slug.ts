/** Deterministic, collision-tolerant slug used for generated custom-exercise
 *  ids. Same input always produces the same slug — this is what makes
 *  custom-exercise resolution idempotent without a persisted lookup table. */
export function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "exercise";
}
