
import PgPsearchForm from '@/components/pgp-search/PgPsearchForm';

interface PgpSearchPageProps {
  unifiedSummary: any | null;
}

export default function PgpSearchPage({ unifiedSummary }: PgpSearchPageProps) {
  return (
    <div className="w-full space-y-8 mt-4">
      <PgPsearchForm unifiedSummary={unifiedSummary} />
    </div>
  );
}
