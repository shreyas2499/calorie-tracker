import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

/** Shown when the API reports that no profile exists yet. */
export function MissingProfileNotice() {
  return (
    <EmptyState
      title="No profile yet"
      description="Create your profile to calculate maintenance calories and start tracking."
      action={
        <Link
          href="/profile"
          className="mt-2 inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Set up profile
        </Link>
      }
    />
  );
}
