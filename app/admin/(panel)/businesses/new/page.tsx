import { PageHeader } from "@/components/admin-shell";
import { NewBusinessForm } from "@/components/new-business-form";
import { requireAdminPage } from "@/lib/auth";
import { listBusinesses } from "@/lib/db";

export default async function NewBusinessPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requireAdminPage();
  const { from } = await searchParams;
  const businesses = await listBusinesses();
  return (
    <>
      <PageHeader
        title="New business"
        description="Start blank or clone an existing business. Cloning copies rooms, policies, FAQs and branding, and clears contact details."
      />
      <NewBusinessForm
        templates={businesses.map((b) => ({ id: b.id, name: b.profile.name }))}
        defaultFrom={businesses.some((b) => b.id === from) ? from : ""}
      />
    </>
  );
}
