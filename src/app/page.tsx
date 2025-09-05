
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JsonAnalyzerPage from "@/components/app/JsonAnalyzerPage";
import PgpSearchPage from "@/components/app/PgpSearchPage";
import { Microscope, FileJson } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-6xl space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-foreground sm:text-5xl">
            Herramientas de Análisis de Datos
          </h1>
          <p className="text-lg text-muted-foreground">
            Utiliza las pestañas para cambiar entre el Analizador de Archivos JSON y el Buscador PGP.
          </p>
        </header>

        <Tabs defaultValue="json-analyzer" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="json-analyzer">
                <FileJson className="w-4 h-4 mr-2" />
                Analizador JSON
            </TabsTrigger>
            <TabsTrigger value="pgp-search">
                <Microscope className="w-4 h-4 mr-2" />
                Buscador PGP (Google Sheets)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="json-analyzer">
            <JsonAnalyzerPage />
          </TabsContent>
          <TabsContent value="pgp-search">
            <PgpSearchPage />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
