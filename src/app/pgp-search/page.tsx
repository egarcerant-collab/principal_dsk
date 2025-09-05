
import PgPsearchForm from '@/components/pgp-search/PgPsearchForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PgpSearchPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-6xl space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-foreground sm:text-5xl">
            Buscador PGP desde Google Sheets
          </h1>
          <p className="text-lg text-muted-foreground">
            Busca en la base de datos PGP cargada directamente desde Google Sheets.
          </p>
           <Button asChild variant="outline">
            <Link href="/">Ir al Analizador JSON</Link>
          </Button>
        </header>
        <PgPsearchForm />
      </div>
    </main>
  );
}
