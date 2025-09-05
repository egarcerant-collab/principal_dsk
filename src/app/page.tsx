import PgPsearchForm from "@/components/pgp-search/PgPsearchForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-6xl space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-foreground sm:text-5xl">
            Buscador PGP
          </h1>
          <p className="text-lg text-muted-foreground">
            Carga la base de datos y busca por CUP/CUM o descripción.
          </p>
        </header>

        <PgPsearchForm />
        
      </div>
    </main>
  );
}
