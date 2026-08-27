import { redirect } from "next/navigation";

export default function MarketplaceFeesRedirect() {
  redirect("/admin/marketplace?tab=fees");
}
