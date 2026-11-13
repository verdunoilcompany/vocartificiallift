import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="mx-auto grid w-full max-w-xl justify-items-start gap-4 p-6">
      <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden />
      <h1 className="text-3xl">Page not found</h1>
      <p className="text-muted-foreground">That page doesn&apos;t exist in this app.</p>
      <Button asChild>
        <Link href="/">Back to the card review</Link>
      </Button>
    </div>
  );
}
