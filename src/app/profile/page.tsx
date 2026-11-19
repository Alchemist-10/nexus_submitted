import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
export default async function MyProfile({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab } = await searchParams;
  redirect(
    `/profile/${user.id}?tab=${tab === "answers" ? "answers" : "posts"}`,
  );
}
