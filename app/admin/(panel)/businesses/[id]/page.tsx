import { notFound } from "next/navigation";
import { BusinessEditor } from "@/components/business-editor";
import { requireAdminPage } from "@/lib/auth";
import { getBusiness } from "@/lib/db";
import { baseUrl } from "@/lib/format";

export default async function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const business = await getBusiness((await params).id);
  if (!business) notFound();
  return <BusinessEditor initial={business} baseUrl={baseUrl()} />;
}
