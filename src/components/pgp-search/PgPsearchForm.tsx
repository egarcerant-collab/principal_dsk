"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, TrendingDown, Target, FileText, Calendar, ChevronDown, Building, BrainCircuit, AlertCircle, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { analyzePgpData } from '@/ai/flows/analyze-pgp-flow';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchSheetData, type PrestadorInfo } from '@/lib/sheets';
import { ExecutionDataByMonth } from '@/app/page';
import ValueComparisonCard from './ValueComparisonCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import InformePGP, { type ReportData, type MonthKey, type MonthExecution, type ComparisonSummary, type FinancialMatrixRow, type DeviatedCupInfo, type PgpRow } from './InformePGP';


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

interface MonthlyComparisonData {
  cup: string;
  description: string;
  expectedFrequency: number;
  realFrequencies: Map<string, number>; // month -> frequency
  totalRealFrequency: number;
}

export interface ValueComparisonItem {
  cup: string;
  description: string;
  unitValue: number;
  expectedValue: number;
  executedValues: Map<string, number>; // month -> value
  totalExecutedValue: number;
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

const findColumnValue = (row: PgpRow, possibleNames: string[]): any => {
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

/** =====================  TABLA COMPARATIVA  ===================== **/
const ComparisonTable = ({ pgpData, executionDataByMonth, monthNames }: { pgpData: PgpRow[], executionDataByMonth: ExecutionDataByMonth, monthNames: string[] }) => {
  const comparisonData: MonthlyComparisonData[] = pgpData.map(row => {
    const cup = findColumnValue(row, ['cup/cum', 'cups']) ?? '';
    const expectedFrequency = getNumericValue(findColumnValue(row, ['frecuencia eventos mes']));
    const description = findColumnValue(row, ['descripcion cups', 'descripcion']) ?? '';

    const realFrequencies = new Map<string, number>();
    let totalRealFrequency = 0;

    executionDataByMonth.forEach((data, month) => {
      const realFrequency = cup ? data.cupCounts.get(cup) || 0 : 0;
      realFrequencies.set(month, realFrequency);
      totalRealFrequency += realFrequency;
    });

    return {
      cup,
      description,
      expectedFrequency,
      realFrequencies,
      totalRealFrequency,
    };
  }).filter(item => item.cup && (item.totalRealFrequency > 0 || item.expectedFrequency > 0));

  if (comparisonData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertCircle className="h-6 w-6 text-yellow-500" />Análisis Comparativo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">No hay datos de ejecución (JSON) para los CUPS de esta nota técnica, o no se ha cargado una nota técnica que coincida.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis Comparativo de Frecuencias (Esperado vs. Real)</CardTitle>
        <CardDescription>Comparación entre la frecuencia mensual esperada en la nota técnica y la frecuencia real observada en los archivos JSON.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>CUPS / CUM</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-center">Frec. Esperada (Mes)</TableHead>
                {monthNames.map(month => (
                  <TableHead key={month} className="text-center">Frec. Real ({month})</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonData.map((item, index) => (
                <TableRow key={`${item.cup}-${index}`}>
                  <TableCell className="font-mono">{item.cup}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-center">{item.expectedFrequency.toLocaleString()}</TableCell>
                  {[...executionDataByMonth.keys()].map(monthKey => {
                    const realFrequency = item.realFrequencies.get(monthKey) || 0;
                    const difference = realFrequency - item.expectedFrequency;
                    return (
                      <TableCell key={monthKey} className={`text-center font-semibold ${difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {realFrequency.toLocaleString()}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

/** =====================  MONEDA  ===================== **/
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
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
  const [valueComparison, setValueComparison] = useState<ValueComparisonItem[]>([]);
  const [totalExpectedValue, setTotalExpectedValue] = useState(0);
  const [totalExecutedValueByMonth, setTotalExecutedValueByMonth] = useState<Map<string, number>>(new Map());
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

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

  const getMonthName = (monthNumber: string): MonthKey => {
    const date = new Date();
    date.setMonth(parseInt(monthNumber, 10) - 1);
    const name = date.toLocaleString('es-CO', { month: 'long' });
    return name.toUpperCase() as MonthKey;
  };

  useEffect(() => {
    if (!isDataLoaded || !selectedPrestador || executionDataByMonth.size === 0 || !globalSummary) {
      setReportData(null);
      return;
    }
    
    const pgpDataMap = new Map<string, PgpRow>(pgpData.map(row => [findColumnValue(row, ['cup/cum', 'cups']), row]));
    const pgpCups = new Set(pgpDataMap.keys());
    const jsonCups = new Set<string>();
    executionDataByMonth.forEach(monthData => {
        monthData.cupCounts.forEach((_, cup) => jsonCups.add(cup));
    });

    const matchingCups = new Set([...pgpCups].filter(cup => jsonCups.has(cup)));
    const missingCups = [...pgpCups].filter(cup => !jsonCups.has(cup));
    const unexpectedCups = [...jsonCups].filter(cup => !pgpCups.has(cup));

    const underExecutedCups: DeviatedCupInfo[] = [];
    const overExecutedCups: DeviatedCupInfo[] = [];

    matchingCups.forEach(cup => {
      const pgpRow = pgpDataMap.get(cup)!;
      const expected = getNumericValue(findColumnValue(pgpRow, ['frecuencia eventos mes']));

      executionDataByMonth.forEach((monthData, month) => {
        const real = monthData.cupCounts.get(cup) || 0;
        const diff = real - expected;

        if (diff !== 0) {
            const cupInfo: DeviatedCupInfo = {
                cup,
                description: findColumnValue(pgpRow, ['descripcion cups', 'descripcion']) ?? '',
                activityDescription: findColumnValue(pgpRow, ['descripcion id resolucion']) ?? '',
                month: getMonthName(month),
                expected,
                real,
                diff,
            };

            if (diff < 0) {
                underExecutedCups.push(cupInfo);
            } else if (real / expected > 1.11) { // Filter for > 111%
                overExecutedCups.push(cupInfo);
            }
        }
      });
    });

    const comparisonSummary: ComparisonSummary = {
        totalPgpCups: pgpCups.size,
        matchingCups: matchingCups.size,
        missingCups,
        unexpectedCups,
        underExecutedCups,
        overExecutedCups
    };
    
    let totalExpected = 0;
    const totalExecutedByMonth = new Map<string, number>();

    executionDataByMonth.forEach((_, month) => {
      totalExecutedByMonth.set(month, 0);
    });
    
    const totalExpectedFrequency = pgpData.reduce((acc, row) => {
      const freq = getNumericValue(findColumnValue(row, ['frecuencia eventos mes']));
      return acc + freq;
    }, 0) * executionDataByMonth.size;
    
    let totalRealFrequency = 0;
    executionDataByMonth.forEach(data => {
        data.cupCounts.forEach(count => totalRealFrequency += count);
    });


    const comparisonData = pgpData.map(row => {
      const cup = findColumnValue(row, ['cup/cum', 'cups']) ?? '';
      const unitValue = getNumericValue(findColumnValue(row, ['valor unitario']));
      const expectedFrequency = getNumericValue(findColumnValue(row, ['frecuencia eventos mes']));
      const expectedValue = unitValue * expectedFrequency;
      totalExpected += expectedValue;

      const executedValues = new Map<string, number>();
      let totalExecutedValue = 0;

      executionDataByMonth.forEach((data, month) => {
        const realFrequency = cup ? data.cupCounts.get(cup) || 0 : 0;
        const executedValue = unitValue * realFrequency;
        executedValues.set(month, executedValue);
        totalExecutedValue += executedValue;
        totalExecutedByMonth.set(month, (totalExecutedByMonth.get(month) || 0) + executedValue);
      });
      
      return { cup, unitValue, expectedValue, executedValues, totalExecutedValue };
    }).filter(item => item.cup);
    
    const months: MonthExecution[] = Array.from(executionDataByMonth.entries()).map(([monthNum, monthData]) => {
      let totalCups = 0;
      monthData.cupCounts.forEach(count => totalCups += count);
      return {
        month: getMonthName(monthNum),
        cups: totalCups,
        valueCOP: totalExecutedByMonth.get(monthNum) ?? 0,
      };
    });

    if (months.length === 0) {
      setReportData(null);
      return;
    }
    
    const totalAutorizadoPeriodo = globalSummary.totalCostoMes * months.length;
    const totalEjecutadoPeriodo = months.reduce((acc, m) => acc + m.valueCOP, 0);
    const diferenciaPeriodo = totalEjecutadoPeriodo - totalAutorizadoPeriodo;
    const cumplimientoPeriodo = totalAutorizadoPeriodo > 0 ? totalEjecutadoPeriodo / totalAutorizadoPeriodo : 0;

    const financialMatrix: FinancialMatrixRow[] = [
        {
          concepto: `Valor Total del Periodo (${months.length > 1 ? `${months.length} meses` : '1 mes'})`,
          autorizado: totalAutorizadoPeriodo,
          ejecutado: totalEjecutadoPeriodo,
          diferencia: diferenciaPeriodo,
          cumplimiento: cumplimientoPeriodo
        },
    ];


    const monthKeys = [...executionDataByMonth.keys()].sort();
    const periodo = monthKeys.length > 0 ? `${getMonthName(monthKeys[0])} - ${getMonthName(monthKeys[monthKeys.length-1])}` : 'N/A';

    const pgpMensual = globalSummary.totalCostoMes;
    const estimacionTrimestral = pgpMensual * months.length;

    const anticipos = {
      mes1_80COP: months.length > 0 ? pgpMensual * 0.8 : 0,
      mes2_80COP: months.length > 1 ? pgpMensual * 0.8 : 0,
      mes3_100COP: months.length > 2 ? pgpMensual : 0,
    };
    anticipos.anticipado80COP = anticipos.mes1_80COP + anticipos.mes2_80COP;

    const dataForReport: ReportData = {
      header: {
        empresa: 'DUSAKAWI EPSI',
        nit: selectedPrestador.NIT,
        municipio: 'N/A',
        departamento: 'N/A',
        contrato: `PGP-${normalizeDigits(selectedPrestador['ID DE ZONA'])}`,
        vigencia: `01/01/${new Date().getFullYear()} - 31/12/${new Date().getFullYear()}`,
        periodo: periodo,
        responsable: 'Dirección Nacional del Riesgo en Salud',
      },
      pgpData,
      months: months,
      band: {
        estimateCOP: estimacionTrimestral,
        minPct: 0.9,
        maxPct: 1.1,
      },
      anticipos: anticipos,
      comparisonSummary,
      financialMatrix,
      totalExpectedFrequency,
      totalRealFrequency,
      expectedMonthlyValue: globalSummary.totalCostoMes,
    };
    
    setReportData(dataForReport);
    setValueComparison(comparisonData as any[]);
    setTotalExpectedValue(totalExpected);
    setTotalExecutedValueByMonth(totalExecutedByMonth);

  }, [isDataLoaded, pgpData, executionDataByMonth, globalSummary, selectedPrestador]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <p>Cargando analizador...</p>
      </div>
    );
  }

  const showComparison = isDataLoaded && executionDataByMonth.size > 0;
  
  const monthNames = [...executionDataByMonth.keys()].map(m => getMonthName(m));

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
            
            {showComparison && reportData && (
              <InformePGP data={reportData} />
            )}

            {showComparison && !reportData && (
               <Card>
                <CardHeader><CardTitle>Esperando datos completos...</CardTitle></CardHeader>
                <CardContent><p>El informe se generará en cuanto se disponga de todos los datos necesarios (JSON y Nota Técnica).</p></CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PgPsearchForm;
