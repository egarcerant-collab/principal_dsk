
import PgPsearchForm from '@/components/pgp-search/PgPsearchForm';
import { CupCountsMap } from '@/app/page';

interface PgpSearchPageProps {
  unifiedSummary: any | null;
  cupCounts: CupCountsMap;
  jsonPrestadorCode: string | null;
}

export default function PgpSearchPage({ unifiedSummary, cupCounts, jsonPrestadorCode }: PgpSearchPageProps) {
  return (
    <div className="w-full space-y-8 mt-4">
      <PgPsearchForm 
        unifiedSummary={unifiedSummary} 
        cupCounts={cupCounts} 
        jsonPrestadorCode={jsonPrestadorCode} 
      />
    </div>
  );
}
