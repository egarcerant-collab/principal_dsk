
import PgPsearchForm from '@/components/pgp-search/PgPsearchForm';
import { CupCountsMap } from '@/app/page';

interface PgpSearchPageProps {
  unifiedSummary: any | null;
  cupCounts: CupCountsMap;
}

export default function PgpSearchPage({ unifiedSummary, cupCounts }: PgpSearchPageProps) {
  return (
    <div className="w-full space-y-8 mt-4">
      <PgPsearchForm unifiedSummary={unifiedSummary} cupCounts={cupCounts} />
    </div>
  );
}
