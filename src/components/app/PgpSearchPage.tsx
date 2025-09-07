
import PgPsearchForm from '@/components/pgp-search/PgPsearchForm';
import { ExecutionDataByMonth } from '@/app/page';

interface PgpSearchPageProps {
  executionDataByMonth: ExecutionDataByMonth;
  jsonPrestadorCode: string | null;
}

export default function PgpSearchPage({ executionDataByMonth, jsonPrestadorCode }: PgpSearchPageProps) {
  return (
    <div className="w-full space-y-8 mt-4">
      <PgPsearchForm 
        executionDataByMonth={executionDataByMonth}
        jsonPrestadorCode={jsonPrestadorCode} 
      />
    </div>
  );
}
