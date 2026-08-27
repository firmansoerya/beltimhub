import { redirect } from "next/navigation";

export default async function AdminVerifikasiRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || "PENDING";
  redirect(`/admin/users?tab=${tab}`);
}
