






"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, TrendingDown, Target, FileText, Calendar, ChevronDown, Building, BrainCircuit, AlertTriangle, TableIcon, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { analyzePgpData } from '@/ai/flows/analyze-pgp-flow';
import { Separator } from "@/components/ui/separator";
import { fetchSheetData, type PrestadorInfo } from '@/lib/sheets';
import { ExecutionDataByMonth } from '@/app/page';
import InformePGP from './InformePGP';
import FinancialMatrix, { type MonthlyFinancialSummary } from './FinancialMatrix';
import { buildMatrizEjecucion, type MatrizRow as MatrizEjecucionRow } from '@/lib/matriz-helpers';
import Papa from 'papaparse';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import Report, { type ReportData } from '@/components/report/InformePGP';


interface PgpRowBE { // Para el backend de IA
  SUBCATEGORIA?: string;
  AMBITO?: string;
  'ID RESOLUCION 3100'?: string;
  'DESCRIPCION ID RESOLUCION'?: string;
  'CUP/CUM'?: string;
  'DESCRIPCION CUPS'?: string;
  'FRECUENCIA AÑO SERVICIO'?: number;
  'FRECUENCIA USO'?: number;
  'FRECUENCIA EVENTOS MES'?: number;
  'FRECUENCIA EVENTO DIA'?: number;
  'COSTO EVENTO MES'?: number;
  'COSTO EVENTO DIA'?: number;
  'FRECUENCIA MINIMA MES'?: number;
  'FRECUENCIA MAXIMA MES'?: number;
  'VALOR UNITARIO'?: number;
  'VALOR MINIMO MES'?: number;
  'VALOR MAXIMO MES'?: number;
  'COSTO EVENTO MES (VALOR MES)'?: number;
  OBSERVACIONES?: string;
  [key: string]: any;
}

interface AnalyzePgpDataOutput {
  keyObservations: string[];
  potentialRisks: string[];
  strategicRecommendations: string[];
}

type Prestador = PrestadorInfo;

export interface SummaryData {
  totalCostoMes: number;
  totalAnual: number;
  costoMinimoMes: number;
  costoMaximoMes: number;
}

interface PgpRow {
  [key: string]: any;
}

export interface DeviatedCupInfo {
    cup: string;
    description?: string;
    activityDescription?: string;
    expectedFrequency: number;
    realFrequency: number;
    deviation: number;
}

export interface MatrixRow {
    Mes: string;
    CUPS: string;
    Cantidad_Esperada: number;
    Cantidad_Ejecutada: number;
    Diferencia: number;
    '%_Ejecucion': string;
    Clasificacion: string;
    Valor_Unitario: number;
    Valor_Esperado: number;
    Valor_Ejecutado: number;
    percentage_numeric: number;
}

export interface ComparisonSummary {
    overExecutedCups: DeviatedCupInfo[];
    underExecutedCups: DeviatedCupInfo[];
    missingCups: DeviatedCupInfo[];
    unexpectedCups: { cup: string, realFrequency: number }[];
    Matriz_Ejecucion_vs_Esperado: MatrixRow[];
    monthlyFinancials: MonthlyFinancialSummary[];
}


interface PgPsearchFormProps {
  executionDataByMonth: ExecutionDataByMonth;
  jsonPrestadorCode: string | null;
}

const PRESTADORES_SHEET_URL = "https://docs.google.com/spreadsheets/d/10Icu1DO4llbolO60VsdFcN5vxuYap1vBZs6foZ-XD04/gviz/tq?tqx=out:csv&sheet=Hoja1";

/** =====================  HELPERS DE NORMALIZACIÓN  ===================== **/
const normalizeString = (v: unknown): string => String(v ?? "").trim();
const normalizeDigits = (v: unknown): string => {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/\D/g, ""); // deja solo dígitos
};

/** Parser numérico robusto para formatos es-CO y en-US */
export const getNumericValue = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    let v = String(value).trim();
    if (!v) return 0;

    v = v.replace(/\s+/g, '').replace(/\$/g, '');

    const hasComma = v.includes(',');
    const hasDot = v.includes('.');
    
    if (hasComma && hasDot) {
      const lastComma = v.lastIndexOf(',');
      const lastDot = v.lastIndexOf('.');
      if (lastComma > lastDot) {
        v = v.replace(/\./g, '').replace(',', '.');
      } else {
        v = v.replace(/,/g, '');
      }
    } else if (hasComma && !v.match(/^\d{1,3}(,\d{3})*$/)) {
      v = v.replace(',', '.');
    } else if (hasComma) {
        v = v.replace(/,/g, '');
    }

    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

export const findColumnValue = (row: PgpRow, possibleNames: string[]): any => {
  const keys = Object.keys(row);
  for (const name of possibleNames) {
    const key = keys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
    if (key) return row[key];
  }
  return undefined;
};

/** =====================  RESUMEN GLOBAL  ===================== **/
const calculateSummary = (data: PgpRow[]): SummaryData | null => {
  if (data.length === 0) return null;

  const totalCostoMes = data.reduce((acc, row) => {
    const costo = getNumericValue(
      findColumnValue(row, ['costo evento mes (valor mes)', 'costo evento mes'])
    );
    return acc + costo;
  }, 0);

  return {
    totalCostoMes,
    totalAnual: totalCostoMes * 12,
    costoMinimoMes: totalCostoMes * 0.9,
    costoMaximoMes: totalCostoMes * 1.1,
  };
};

/** =====================  UI CARDS  ===================== **/
const SummaryCard = ({ summary, title, description }: { summary: SummaryData | null, title: string, description: string }) => {
  if (!summary) return null;

  return (
    <Card className="mb-6 shadow-lg border-primary/20">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2 flex items-center"><Calendar className="mr-2 h-5 w-5 text-muted-foreground" />Proyección Anual del Contrato</h3>
          <div className="grid grid-cols-1 gap-4 text-center">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700">
              <p className="text-sm text-muted-foreground">Valor Total Anual (Estimado)</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{formatCurrency(summary.totalAnual)}</p>
            </div>
          </div>
        </div>
        <Separator />
        <div>
          <h3 className="text-lg font-medium mb-2 flex items-center"><FileText className="mr-2 h-5 w-5 text-muted-foreground" />Detalle Mensual</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
              <TrendingDown className="h-6 w-6 mx-auto text-red-500 mb-1" />
              <p className="text-sm text-muted-foreground">Costo Mínimo Aceptable (-10%)</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-500">{formatCurrency(summary.costoMinimoMes)}</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Target className="h-6 w-6 mx-auto text-blue-500 mb-1" />
              <p className="text-sm text-muted-foreground">Costo Total por Mes</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-500">{formatCurrency(summary.totalCostoMes)}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <TrendingUp className="h-6 w-6 mx-auto text-green-500 mb-1" />
              <p className="text-sm text-muted-foreground">Costo Máximo Aceptable (+10%)</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-500">{formatCurrency(summary.costoMaximoMes)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
};

const AnalysisCard = ({ analysis, isLoading }: { analysis: AnalyzePgpDataOutput | null, isLoading: boolean }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary animate-pulse" />
            Analizando Nota Técnica...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-center text-muted-foreground">La IA está generando un análisis profesional de los datos.</p>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) return null;

  return (
    <Card className="bg-blue-50/50 dark:bg-blue-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-blue-600" />
          Análisis Profesional de la Nota Técnica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-2">Observaciones Clave</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            {analysis.keyObservations.map((obs, i) => <li key={i}>{obs}</li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">Potenciales Riesgos</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            {analysis.potentialRisks.map((risk, i) => <li key={i}>{risk}</li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">Recomendaciones Estratégicas</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            {analysis.strategicRecommendations.map((rec, i) => <li key={i}>{rec}</li>)}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
};


/** =====================  MONEDA  ===================== **/
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

const getMonthName = (monthNumber: string) => {
    const date = new Date();
    date.setMonth(parseInt(monthNumber) - 1);
    const name = date.toLocaleString('es-CO', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
};


const calculateComparison = (pgpData: PgpRow[], executionDataByMonth: ExecutionDataByMonth): ComparisonSummary => {
  const overExecutedCups: DeviatedCupInfo[] = [];
  const underExecutedCups: DeviatedCupInfo[] = [];
  const missingCups: DeviatedCupInfo[] = [];
  const unexpectedCups: { cup: string, realFrequency: number }[] = [];
  const executionMatrix: MatrixRow[] = [];
  const monthlyFinancialsMap = new Map<string, { totalValorEsperado: number, totalValorEjecutado: number, percentage: number }>();


  const pgpCupsMap = new Map<string, PgpRow>();
  pgpData.forEach(row => {
      const cup = findColumnValue(row, ['cup/cum', 'cups']);
      if(cup) pgpCupsMap.set(cup, row);
  });

  const executedCupsSet = new Set<string>();
  executionDataByMonth.forEach(monthData => {
    monthData.cupCounts.forEach((_, cup) => executedCupsSet.add(cup));
  });

  const allRelevantCups = new Set([...pgpCupsMap.keys(), ...executedCupsSet]);
  
  // Populate Execution Matrix first, month by month
  executionDataByMonth.forEach((monthData, monthKey) => {
    const monthName = getMonthName(monthKey);
    const relevantCupsForMonth = new Set([...pgpCupsMap.keys(), ...monthData.cupCounts.keys()]);
    
    let monthTotalExpected = 0;
    let monthTotalExecuted = 0;

    relevantCupsForMonth.forEach(cup => {
        const pgpRow = pgpCupsMap.get(cup);
        const expectedFrequency = pgpRow ? getNumericValue(findColumnValue(pgpRow, ['frecuencia eventos mes'])) : 0;
        const realFrequency = monthData.cupCounts.get(cup) || 0;
        const difference = realFrequency - expectedFrequency;
        const percentage = expectedFrequency > 0 ? (realFrequency / expectedFrequency) * 100 : (realFrequency > 0 ? Infinity : 0);
        const unitValue = pgpRow ? getNumericValue(findColumnValue(pgpRow, ['valor unitario'])) : 0;
        const valorEsperado = expectedFrequency * unitValue;
        const valorEjecutado = realFrequency * unitValue;

        monthTotalExpected += valorEsperado;
        monthTotalExecuted += valorEjecutado;

        let classification = "Ejecución Normal";
        if (!pgpRow && realFrequency > 0) {
            classification = "Inesperado";
        } else if (realFrequency === 0 && expectedFrequency > 0) {
            classification = "Faltante";
        } else if (percentage > 111) {
            classification = "Sobre-ejecutado";
        } else if (percentage < 90 && expectedFrequency > 0) {
            classification = "Sub-ejecutado";
        }

        executionMatrix.push({
            Mes: monthName,
            CUPS: cup,
            Cantidad_Esperada: expectedFrequency,
            Cantidad_Ejecutada: realFrequency,
            Diferencia: difference,
            '%_Ejecucion': expectedFrequency > 0 ? `${percentage.toFixed(0)}%` : 'N/A',
            Clasificacion: classification,
            Valor_Unitario: unitValue,
            Valor_Esperado: valorEsperado,
            Valor_Ejecutado: valorEjecutado,
            percentage_numeric: percentage,
        });
    });
    const executionPercentage = monthTotalExpected > 0 ? (monthTotalExecuted / monthTotalExpected) * 100 : 0;
    monthlyFinancialsMap.set(monthName, { 
        totalValorEsperado: monthTotalExpected, 
        totalValorEjecutado: monthTotalExecuted,
        percentage: executionPercentage,
    });
  });
  
  // Sort the matrix by over-execution percentage, descending
  executionMatrix.sort((a, b) => b.percentage_numeric - a.percentage_numeric);

  const monthlyFinancials = Array.from(monthlyFinancialsMap, ([month, data]) => ({ month, ...data }));

  // Calculate summaries (over, under, etc.) based on totals
  allRelevantCups.forEach(cup => {
    const pgpRow = pgpCupsMap.get(cup);
    let totalRealFrequency = 0;
    executionDataByMonth.forEach(monthData => {
      totalRealFrequency += monthData.cupCounts.get(cup) || 0;
    });

    if (pgpRow) {
      const expectedFrequencyPerMonth = getNumericValue(findColumnValue(pgpRow, ['frecuencia eventos mes']));
      const totalExpectedFrequency = expectedFrequencyPerMonth * executionDataByMonth.size;

      if (totalRealFrequency > 0) {
        const deviation = totalRealFrequency - totalExpectedFrequency;
        const percentage = totalExpectedFrequency > 0 ? (totalRealFrequency / totalExpectedFrequency) : Infinity;
        
        const cupInfo: DeviatedCupInfo = {
          cup,
          description: findColumnValue(pgpRow, ['descripcion cups', 'descripcion']),
          activityDescription: findColumnValue(pgpRow, ['descripcion id resolucion']),
          expectedFrequency: totalExpectedFrequency,
          realFrequency: totalRealFrequency,
          deviation: deviation,
        };
        
        if (percentage > 1.11) {
            overExecutedCups.push(cupInfo);
        } else if (totalRealFrequency < totalExpectedFrequency * 0.90) { 
            underExecutedCups.push(cupInfo);
        }
      } else if (totalExpectedFrequency > 0) {
        missingCups.push({
          cup,
          description: findColumnValue(pgpRow, ['descripcion cups', 'descripcion']),
          activityDescription: findColumnValue(pgpRow, ['descripcion id resolucion']),
          expectedFrequency: totalExpectedFrequency,
          realFrequency: 0,
          deviation: -totalExpectedFrequency,
        });
      }
    } else if (totalRealFrequency > 0) {
      unexpectedCups.push({
        cup,
        realFrequency: totalRealFrequency,
      });
    }
  });
  
  overExecutedCups.sort((a, b) => b.deviation - a.deviation);
  underExecutedCups.sort((a, b) => a.deviation - b.deviation);


  return {
    overExecutedCups,
    underExecutedCups,
    missingCups,
    unexpectedCups,
    Matriz_Ejecucion_vs_Esperado: executionMatrix,
    monthlyFinancials,
  };
};

const handleDownloadXls = (data: any[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const MatrizEjecucionCard = ({ matrizData }: { matrizData: MatrizEjecucionRow[] }) => {
  const getRowClass = (classification: string) => {
      switch (classification) {
          case "Sobre-ejecutado": return "text-red-600";
          case "Sub-ejecutado": return "text-blue-600";
          case "Faltante": return "text-yellow-600";
          default: return "";
      }
  };

  return (
    <Accordion type="single" collapsible className="w-full border rounded-lg" defaultValue='item-1'>
      <AccordionItem value="item-1" className="border-0">
        <div className="flex items-center justify-between p-4">
          <AccordionTrigger className="p-0 flex-1 hover:no-underline">
            <div className="flex items-center">
              <TableIcon className="h-6 w-6 mr-3 text-purple-600" />
              <h3 className="text-base font-medium text-left">Matriz Ejecución vs Esperado (mensual)</h3>
            </div>
          </AccordionTrigger>
          <div className='flex items-center gap-4 pl-4'>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadXls(matrizData, `matriz_ejecucion_mensual.xls`);
              }}
              className="h-7 w-7"
              aria-label="Descargar Matriz Mensual"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <AccordionContent className="px-4 pb-4">
          <ScrollArea className="h-96">
            <Table>
              <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead>CUPS</TableHead>
                  <TableHead className="text-center">Cant. Esperada</TableHead>
                  <TableHead className="text-center">Cant. Ejecutada</TableHead>
                  <TableHead className="text-center">Diferencia</TableHead>
                  <TableHead className="text-center">% Ejecución</TableHead>
                  <TableHead>Clasificación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrizData.map((row, index) => (
                  <TableRow key={index} className={getRowClass(row.Clasificacion)}>
                    <TableCell className="text-xs">{row.Mes}</TableCell>
                    <TableCell className="font-mono text-xs">{row.CUPS}</TableCell>
                    <TableCell className="text-center">{row.Cantidad_Esperada.toFixed(0)}</TableCell>
                    <TableCell className="text-center">{row.Cantidad_Ejecutada}</TableCell>
                    <TableCell className="text-center font-semibold">{row.Diferencia.toFixed(0)}</TableCell>
                    <TableCell className="text-center">{row['%_Ejecucion']}</TableCell>
                    <TableCell className="font-medium">{row.Clasificacion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};


/** =====================  COMPONENTE PRINCIPAL  ===================== **/
const PgPsearchForm: React.FC<PgPsearchFormProps> = ({ executionDataByMonth, jsonPrestadorCode }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
  const [loadingPrestadores, setLoadingPrestadores] = useState<boolean>(true);
  const [pgpData, setPgpData] = useState<PgpRow[]>([]);
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [selectedPrestador, setSelectedPrestador] = useState<Prestador | null>(null);
  const [prestadorToLoad, setPrestadorToLoad] = useState<Prestador | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [globalSummary, setGlobalSummary] = useState<SummaryData | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzePgpDataOutput | null>(null);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const comparisonSummary = useMemo(() => {
    if (!isDataLoaded || executionDataByMonth.size === 0) {
      return null;
    }
    return calculateComparison(pgpData, executionDataByMonth);
  }, [pgpData, executionDataByMonth, isDataLoaded]);

  const matrizEjecucionMensual = useMemo(() => {
    if (!isDataLoaded || executionDataByMonth.size === 0) {
        return [];
    }
    return buildMatrizEjecucion({ executionDataByMonth, pgpData });
  }, [pgpData, executionDataByMonth, isDataLoaded]);

  useEffect(() => {
    setIsClient(true);
    fetch('/api/check-env').then(res => res.json()).then(data => {
      setIsAiEnabled(data.isAiEnabled);
    });
  }, []);

  const performLoadPrestador = useCallback(async (prestador: Prestador) => {
    setLoading(true);
    if (isAiEnabled) {
      setLoadingAnalysis(true);
    }
    setIsDataLoaded(false);
    setGlobalSummary(null);
    setAnalysis(null);
    setMismatchWarning(null);
    toast({ title: `Cargando Nota Técnica: ${prestador.PRESTADOR}...`, description: "Espere un momento, por favor." });

    try {
      if (!prestador.WEB || String(prestador.WEB).trim() === '') {
        throw new Error("La URL de la nota técnica no está definida para este prestador.");
      }

      const data = await fetchSheetData<PgpRow>(prestador.WEB);

      const pgpRows: PgpRow[] = data.map(row => {
        const newRow: Partial<PgpRow> = {};
        for (const key in row) {
          const trimmedKey = key.trim();
          if (!trimmedKey) continue;
          newRow[trimmedKey as keyof PgpRow] = row[key];
        }
        return newRow as PgpRow;
      }).filter(item => {
        const cupKey = Object.keys(item).find(k => {
          const kk = k.toLowerCase().trim();
          return kk === 'cup/cum' || kk === 'cups';
        });
        return !!(cupKey && item[cupKey!]);
      });

      setPgpData(pgpRows);
      const summary = calculateSummary(pgpRows)
      setGlobalSummary(summary);
      setIsDataLoaded(true);
      setSelectedPrestador(prestador);
      toast({ title: "Datos PGP Cargados", description: `Se cargaron ${pgpRows.length} registros para ${prestador.PRESTADOR}.` });

      if (isAiEnabled && pgpRows.length > 0) {
        try {
          const analysisInput = pgpRows.slice(0, 50).map(row => ({
            'SUBCATEGORIA': findColumnValue(row, ['subcategoria']),
            'AMBITO': findColumnValue(row, ['ambito']),
            'ID RESOLUCION 3100': findColumnValue(row, ['id resolucion 3100']),
            'DESCRIPCION ID RESOLUCION': findColumnValue(row, ['descripcion id resolucion']),
            'CUP/CUM': findColumnValue(row, ['cup/cum', 'cups']),
            'DESCRIPCION CUPS': findColumnValue(row, ['descripcion cups', 'descripcion']),
            'FRECUENCIA AÑO SERVICIO': getNumericValue(findColumnValue(row, ['frecuencia año servicio'])),
            'FRECUENCIA USO': getNumericValue(findColumnValue(row, ['frecuencia uso'])),
            'FRECUENCIA EVENTOS MES': getNumericValue(findColumnValue(row, ['frecuencia eventos mes'])),
            'FRECUENCIA EVENTO DIA': getNumericValue(findColumnValue(row, ['frecuencia evento dia'])),
            'COSTO EVENTO MES': getNumericValue(findColumnValue(row, ['costo evento mes'])),
            'COSTO EVENTO DIA': getNumericValue(findColumnValue(row, ['costo evento dia'])),
            'FRECUENCIA MINIMA MES': getNumericValue(findColumnValue(row, ['frecuencia minima mes'])),
            'FRECUENCIA MAXIMA MES': getNumericValue(findColumnValue(row, ['frecuencia maxima mes'])),
            'VALOR UNITARIO': getNumericValue(findColumnValue(row, ['valor unitario'])),
            'VALOR MINIMO MES': getNumericValue(findColumnValue(row, ['valor minimo mes'])),
            'VALOR MAXIMO MES': getNumericValue(findColumnValue(row, ['valor maximo mes'])),
            'COSTO EVENTO MES (VALOR MES)': getNumericValue(findColumnValue(row, ['costo evento mes (valor mes)', 'costo evento mes'])),
            'OBSERVACIONES': findColumnValue(row, ['observaciones'])
          }));

          const analysisResult = await analyzePgpData(analysisInput as PgpRowBE[]);
          setAnalysis(analysisResult);
        } catch (aiError: any) {
          toast({ title: "Error en el Análisis de IA", description: aiError.message, variant: "destructive" });
          setAnalysis(null);
        } finally {
          setLoadingAnalysis(false);
        }
      } else {
        setLoadingAnalysis(false);
      }

    } catch (error: any) {
      toast({ title: "Error al Cargar Datos de la Nota Técnica", description: error.message, variant: "destructive" });
      setIsDataLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [isAiEnabled, toast]);

  useEffect(() => {
    if (isDataLoaded && executionDataByMonth.size > 0 && selectedPrestador && globalSummary && comparisonSummary) {
      const monthExecutions = Array.from(executionDataByMonth.entries()).map(([monthKey, monthData]) => {
        const totalValue = comparisonSummary.monthlyFinancials.find(mf => mf.month === getMonthName(monthKey))?.totalValorEjecutado ?? 0;
        let totalCups = 0;
        monthData.cupCounts.forEach(count => totalCups += count);
        return {
          month: getMonthName(monthKey),
          cups: totalCups,
          valueCOP: totalValue,
        };
      });

      const totalEjecutado = monthExecutions.reduce((sum, m) => sum + m.valueCOP, 0);
      const valor3m = globalSummary.totalCostoMes * monthExecutions.length; // Asumimos que la nota técnica es mensual

      const newReportData: ReportData = {
        header: {
          empresa: "DUSAKAWI EPSI",
          nit: selectedPrestador.NIT,
          municipio: 'URIBIA',
          contrato: '44847_04_PGP',
          vigencia: '01/01/2025–01/12/2025',
          ciudad: "Uribia",
          fecha: new Date().toLocaleDateString('es-CO'),
        },
        months: monthExecutions,
        notaTecnica: {
          min90: valor3m * 0.9,
          valor3m: valor3m,
          max110: valor3m * 1.1,
          anticipos: totalEjecutado * 0.8, // Ejemplo, podría ser otro cálculo
          totalPagar: totalEjecutado * 0.2, // Ejemplo
          totalFinal: totalEjecutado,
        },
      };
      setReportData(newReportData);
    } else {
      setReportData(null);
    }
  }, [isDataLoaded, executionDataByMonth, selectedPrestador, globalSummary, comparisonSummary]);

  const handleSelectPrestador = useCallback((prestador: Prestador) => {
    setMismatchWarning(null);
    setIsDataLoaded(false);
    setPrestadorToLoad(prestador);

    const pgpZoneId = prestador['ID DE ZONA'] ? normalizeDigits(prestador['ID DE ZONA']) : null;
    const jsonId = jsonPrestadorCode ? normalizeDigits(jsonPrestadorCode) : null;

    if (jsonId && pgpZoneId && jsonId !== pgpZoneId) {
      const warningMsg = `¡Advertencia! El código del JSON (${jsonId}) no coincide con el ID de la nota técnica (${pgpZoneId}). Los datos podrían no ser comparables.`;
      setMismatchWarning(warningMsg);
    } else {
      performLoadPrestador(prestador);
    }
  }, [jsonPrestadorCode, performLoadPrestador]);

  const handleForceLoad = () => {
    if (prestadorToLoad) {
      performLoadPrestador(prestadorToLoad);
    }
  };

  useEffect(() => {
    if (!isClient) return;

    const fetchPrestadores = async () => {
      setLoadingPrestadores(true);
      toast({ title: "Cargando lista de prestadores..." });
      try {
        const data = await fetchSheetData<Prestador>(PRESTADORES_SHEET_URL);
        const typedData = data
            .map(p => {
                const cleaned: Prestador = {
                    'NIT': normalizeString(p.NIT),
                    'PRESTADOR': normalizeString(p.PRESTADOR),
                    'ID DE ZONA': normalizeString(p['ID DE ZONA']),
                    'WEB': normalizeString(p.WEB)
                };
                return cleaned;
            })
            .filter(p => p.PRESTADOR && p['ID DE ZONA']);

        setPrestadores(typedData);
        if (typedData.length > 0) {
          toast({ title: "Lista de prestadores cargada.", description: `Se encontraron ${typedData.length} prestadores.` });
        } else {
          toast({ title: "Atención: No se encontraron prestadores.", description: "Verifique la hoja de cálculo o la conexión.", variant: "destructive" });
        }
      } catch (error: any) {
        toast({ title: "Error al Cargar la Lista de Prestadores", description: error.message, variant: "destructive" });
        console.error("Error fetching providers:", error);
      } finally {
        setLoadingPrestadores(false);
      }
    };
    fetchPrestadores();
  }, [isClient, toast]);

  useEffect(() => {
    if (!jsonPrestadorCode || prestadores.length === 0 || loading || selectedPrestador) return;

    const normalizedJsonCode = normalizeDigits(jsonPrestadorCode);
    const matchById = prestadores.find(p => normalizeDigits(p['ID DE ZONA']) === normalizedJsonCode);
    
    if (matchById) {
      toast({
        title: "Prestador Sugerido Encontrado",
        description: `Cargando automáticamente la nota técnica para ${matchById.PRESTADOR}.`
      });
      handleSelectPrestador(matchById);
    }
  }, [jsonPrestadorCode, prestadores, loading, selectedPrestador, handleSelectPrestador, toast]);


  if (!isClient) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <p>Cargando analizador...</p>
      </div>
    );
  }

  const showComparison = isDataLoaded && executionDataByMonth.size > 0 && comparisonSummary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis de Notas Técnicas PGP</CardTitle>
        <CardDescription>Selecciona un prestador para cargar su nota técnica, analizarla con IA y visualizar los datos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto" disabled={loadingPrestadores}>
              {loadingPrestadores ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building className="mr-2 h-4 w-4" />}
              {selectedPrestador ? selectedPrestador.PRESTADOR : "Seleccionar un Prestador"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full md:w-[300px] max-h-72 overflow-y-auto">
            {prestadores.map((p, index) => (
              <DropdownMenuItem key={`${p['ID DE ZONA']}-${index}`} onSelect={() => handleSelectPrestador(p)}>
                {p.PRESTADOR} ({p['ID DE ZONA']})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {mismatchWarning && (
          <Alert variant="destructive">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <div>
                  <AlertTitle>Advertencia de Coincidencia</AlertTitle>
                  <AlertDescription>{mismatchWarning}</AlertDescription>
                </div>
              </div>
              <Button onClick={handleForceLoad} variant="secondary" className="mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">
                Cargar de todos modos
              </Button>
            </div>
          </Alert>
        )}

        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <p>Cargando datos de la nota técnica...</p>
          </div>
        )}

        {isDataLoaded && !loading && (
          <div className="space-y-6">
            <SummaryCard
              summary={globalSummary}
              title={`Resumen Teórico: Nota Técnica de ${selectedPrestador?.PRESTADOR ?? '—'}`}
              description="Cálculos basados en la totalidad de los datos cargados desde la nota técnica."
            />

            {isAiEnabled && <AnalysisCard analysis={analysis} isLoading={loadingAnalysis} />}
            
            {showComparison && (
              <>
                <InformePGP 
                    comparisonSummary={comparisonSummary}
                    pgpData={pgpData}
                />
                <FinancialMatrix 
                    matrixData={comparisonSummary.Matriz_Ejecucion_vs_Esperado}
                    monthlyFinancials={comparisonSummary.monthlyFinancials}
                />
                <MatrizEjecucionCard matrizData={matrizEjecucionMensual} />

                {reportData && <Report data={reportData} />}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PgPsearchForm;
