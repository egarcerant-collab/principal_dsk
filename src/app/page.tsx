
"use client";

import { useState } from "react";
import JsonAnalyzerPage, { type MonthlyExecutionData } from "@/components/app/JsonAnalyzerPage";
import PgpSearchPage from "@/components/app/PgpSearchPage";

export type CupCountsMap = Map<string, number>;
export type ExecutionDataByMonth = Map<string, MonthlyExecutionData>;


export default function Home() {
  const [executionData, setExecutionData] = useState<ExecutionDataByMonth>(new Map());
  const [jsonPrestadorCode, setJsonPrestadorCode] = useState<string | null>(null);


  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-foreground sm:text-5xl">
            Herramientas de Análisis PGP
          </h1>
          <p className="text-lg text-muted-foreground">
            Compare los datos reales de los archivos JSON con las proyecciones de las notas técnicas de Google Sheets.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Columna Izquierda: Analizador JSON */}
          <div className="space-y-6">
             <h2 className="text-2xl font-semibold text-center">Análisis de Datos Reales (JSON)</h2>
             <JsonAnalyzerPage 
                setExecutionData={setExecutionData} 
                setJsonPrestadorCode={setJsonPrestadorCode}
              />
          </div>

          {/* Columna Derecha: Buscador PGP */}
          <div className="space-y-6">
             <h2 className="text-2xl font-semibold text-center">Análisis de Nota Técnica (PGP)</h2>
             <PgpSearchPage 
                executionDataByMonth={executionData}
                jsonPrestadorCode={jsonPrestadorCode}
              />
          </div>
        </div>
      </div>
    </main>
  );
}
