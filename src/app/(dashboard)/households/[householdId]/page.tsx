import { HouseholdDetailWorkspace } from '../../../../features/households/household-detail-workspace';

export default async function HouseholdDetailPage({ params }: { params: Promise<{ householdId: string }> }) {
  const { householdId } = await params;
  return <HouseholdDetailWorkspace householdId={householdId} />;
}
