import { redirect } from "next/navigation";

/**
 * The home page is the Daily Dashboard. Links to `/` that carry Classifier filters
 * (old bookmarks such as `/?condition=…&well=…`) still open the Dynocard Classifier.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams))
    for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v])
      q.append(k, x);
  redirect(q.size ? `/dynocard-classifier?${q.toString()}` : "/daily-dashboard");
}
