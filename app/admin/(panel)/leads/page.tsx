import { PageHeader } from "@/components/admin-shell";
import { FilterBar } from "@/components/filter-bar";
import { LeadsTable } from "@/components/leads-table";
import { requireAdminPage } from "@/lib/auth";
import { listBusinesses, listLeads } from "@/lib/db";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

export default async function LeadsPage({
  searchParams,
}: { searchParams: Promise<{ business?: string; status?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const status = (LEAD_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as LeadStatus) : undefined;
  const [businesses, leads] = await Promise.all([
    listBusinesses(),
    listLeads({ businessId: sp.business || undefined, status }),
  ]);

  return (
    <>
      <PageHeader
        title="Booking inquiries"
        description="Guests the AI captured. Confirm availability with them directly, then update the status."
      />
      <FilterBar
        businesses={businesses.map((b) => ({ id: b.id, name: b.profile.name }))}
        statuses={[...LEAD_STATUSES]}
      />
      <LeadsTable leads={leads} />
    </>
  );
}
