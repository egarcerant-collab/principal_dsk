
"use client";

import { useState } from "react";
import type { MonthlyExecutionData } from "@/components/app/JsonAnalyzerPage";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const JsonAnalyzerPage = dynamic(
  () => import("@/components/app/JsonAnalyzerPage"),
  { 
    loading: () => <div className="flex items-center justify-center p-4"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando Analizador JSON...</div>,
    ssr: false 
  }
);

const PgpSearchPage = dynamic(
  () => import("@/components/app/PgpSearchPage"),
  { 
    loading: () => <div className="flex items-center justify-center p-4"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando Analizador PGP...</div>,
    ssr: false
  }
);


export type CupCountInfo = {
  total: number;
  diagnoses: Map<string, number>; // Map<diagnosisCode, count>
  totalValue: number;
};

export type CupCountsMap = Map<string, CupCountInfo>;
export type ExecutionDataByMonth = Map<string, MonthlyExecutionData>;


export default function Home() {
  const [executionData, setExecutionData] = useState<ExecutionDataByMonth>(new Map());
  const [jsonPrestadorCode, setJsonPrestadorCode] = useState<string | null>(null);
  const [uniqueUserCount, setUniqueUserCount] = useState<number>(0);


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

        <div className="grid grid-cols-1 gap-8 items-start">
          {/* Columna Izquierda: Analizador JSON */}
          <div className="space-y-6">
             <h2 className="text-2xl font-semibold text-center">Análisis de Datos Reales (JSON)</h2>
             <JsonAnalyzerPage 
                setExecutionData={setExecutionData} 
                setJsonPrestadorCode={setJsonPrestadorCode}
                setUniqueUserCount={setUniqueUserCount}
              />
          </div>

          {/* Columna Derecha: Buscador PGP */}
          <div className="space-y-6">
             <h2 className="text-2xl font-semibold text-center">Análisis de Nota Técnica (PGP)</h2>
             <PgpSearchPage 
                executionDataByMonth={executionData}
                jsonPrestadorCode={jsonPrestadorCode}
                uniqueUserCount={uniqueUserCount}
              />
          </div>
        </div>
      </div>
    </main>
  );
}
