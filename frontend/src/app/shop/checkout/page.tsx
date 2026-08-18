import { CheckoutClient } from "./CheckoutClient";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ package_id?: string }>;
}) {
  const resolvedParams = await searchParams;
  const packageId = Number(resolvedParams.package_id || "1");

  return <CheckoutClient packageId={packageId} />;
}