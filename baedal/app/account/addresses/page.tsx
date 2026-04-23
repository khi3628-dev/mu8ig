import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AddressesClient } from "./AddressesClient";

export default async function AddressesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account/addresses");

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });

  return (
    <AddressesClient
      initial={addresses.map((a) => ({
        id: a.id,
        label: a.label,
        roadAddress: a.roadAddress,
        detail: a.detail,
        isDefault: a.isDefault,
      }))}
    />
  );
}
