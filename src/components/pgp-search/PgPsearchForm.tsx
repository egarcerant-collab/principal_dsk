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
import QuarterlyFinancialReport, { type MonthInput, type ReportHeader } from './QuarterlyFinancialReport';

interface PgpRow {
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

/** Parser numérico robusto para formatos es-CO y en-US */
export const getNumericValue = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    let v = String(value).trim();
    if (!v) return 0;
  
    // 1. Quitar símbolo de moneda y espacios
    v = v.replace(/\s+/g, '').replace(/\$/g, '');
  
    // 2. Determinar si el formato es US (1,234.56) o EU (1.234,56)
    const hasComma = v.includes(',');
    const hasDot = v.includes('.');
    
    // Si tiene ambos, el último es el separador decimal
    if (hasComma && hasDot) {
      const lastComma = v.lastIndexOf(',');
      const lastDot = v.lastIndexOf('.');
      // Formato EU: el punto es de miles, la coma es decimal. "1.234,56" -> "1234.56"
      if (lastComma > lastDot) {
        v = v.replace(/\./g, '').replace(',', '.');
      } else {
        // Formato US: la coma es de miles, el punto es decimal. "1,234.56" -> "1234.56"
        v = v.replace(/,/g, '');
      }
    } else if (hasComma) {
      // Solo coma: es decimal en formato EU. "1234,56" -> "1234.56"
      v = v.replace(',', '.');
    }
    // Si solo tiene puntos (1.234) o no tiene separadores (1234), no se hace nada
  
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

  useEffect(() => {
    setIsClient(true);
    fetch('/api/check-env').then(res => res.json()).then(data => {
      setIsAiEnabled(data.isAiEnabled);
    });
  }, []);

  /** Cargar Nota Técnica del prestador (marca seleccionado SOLO cuando carga OK) */
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
      setGlobalSummary(calculateSummary(pgpRows));
      setIsDataLoaded(true);
      setSelectedPrestador(prestador); // ✅ sólo ahora marcamos como seleccionado
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

          const analysisResult = await analyzePgpData(analysisInput);
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
      // No tocar selectedPrestador: así el header no se desincroniza con un intento fallido
    } finally {
      setLoading(false);
    }
  }, [isAiEnabled, toast]);

  /** Selección desde el dropdown: validar ID vs JSON antes de cargar */
  const handleSelectPrestador = useCallback((prestador: Prestador) => {
    setMismatchWarning(null);
    setIsDataLoaded(false); // Reset data loaded state on new selection

    setPrestadorToLoad(prestador);

    const pgpZoneId = normalizeString(prestador['ID DE ZONA']);
    const jsonId = normalizeString(jsonPrestadorCode);

    if (jsonId && pgpZoneId && jsonId !== pgpZoneId) {
      const warningMsg = `¡Advertencia! El código del JSON (${jsonId}) no coincide con el ID de la nota técnica (${pgpZoneId}). Los datos podrían no ser comparables.`;
      setMismatchWarning(warningMsg);
      // Stop here and wait for user to force load
    } else {
      // Coinciden o no hay JSON cargado → cargamos directo
      performLoadPrestador(prestador);
    }
  }, [jsonPrestadorCode, performLoadPrestador]);

  const handleForceLoad = () => {
    if (prestadorToLoad) {
      performLoadPrestador(prestadorToLoad);
    }
  };

  /** Cargar lista de prestadores */
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

  /** Autocarga por código JSON si coincide con algún ID de zona */
  useEffect(() => {
    if (!jsonPrestadorCode || prestadores.length === 0 || loading || selectedPrestador) return;

    const normalizedJsonCode = normalizeString(jsonPrestadorCode);
    const matchById = prestadores.find(p => normalizeString(p['ID DE ZONA']) === normalizedJsonCode);
    
    if (matchById) {
      toast({
        title: "Prestador Sugerido Encontrado",
        description: `Cargando automáticamente la nota técnica para ${matchById.PRESTADOR}.`
      });
      handleSelectPrestador(matchById);
    }
  }, [jsonPrestadorCode, prestadores, loading, selectedPrestador, handleSelectPrestador, toast]);

  /** Cálculo de comparación de valores */
  const calculateValueComparison = useCallback((pgpData: PgpRow[], executionDataByMonth: ExecutionDataByMonth) => {
    let totalExpected = 0;
    const totalExecutedByMonth = new Map<string, number>();

    executionDataByMonth.forEach((_, month) => {
      totalExecutedByMonth.set(month, 0);
    });

    const comparisonData = pgpData.map(row => {
      const cup = findColumnValue(row, ['cup/cum', 'cups']) ?? '';
      const description = findColumnValue(row, ['descripcion cups', 'descripcion']) ?? '';
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

      return {
        cup,
        description,
        unitValue,
        expectedValue,
        executedValues,
        totalExecutedValue
      };
    }).filter(item => item.cup && (item.totalExecutedValue > 0 || item.expectedValue > 0));

    setValueComparison(comparisonData);
    setTotalExpectedValue(totalExpected);
    setTotalExecutedValueByMonth(totalExecutedByMonth);

  }, []);

  useEffect(() => {
    if (isDataLoaded && pgpData.length > 0 && executionDataByMonth.size > 0) {
      calculateValueComparison(pgpData, executionDataByMonth);
    } else {
      setValueComparison([]);
      setTotalExpectedValue(0);
      setTotalExecutedValueByMonth(new Map());
    }
  }, [isDataLoaded, pgpData, executionDataByMonth, calculateValueComparison]);

  const getMonthName = (monthNumber: string) => {
    const date = new Date();
    date.setMonth(parseInt(monthNumber) - 1);
    const name = date.toLocaleString('es-CO', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <p>Cargando analizador...</p>
      </div>
    );
  }

  const showComparison = isDataLoaded && executionDataByMonth.size > 0;
  
  const reportMonths: MonthInput[] = [...executionDataByMonth.entries()].map(([month, data]) => ({
    monthName: getMonthName(month),
    summary: globalSummary, // El PGP mensual es el mismo para todos los meses del mismo contrato
    executedValue: totalExecutedValueByMonth.get(month) || 0
  }));
  
  const monthNames = reportMonths.map(m => m.monthName);


  const reportHeader: ReportHeader = {
    empresa: selectedPrestador?.PRESTADOR ?? "—",
    nit: selectedPrestador?.NIT ?? "—",
    contrato: selectedPrestador?.['ID DE ZONA']
      ? `PGP-${normalizeString(selectedPrestador['ID DE ZONA'])}`
      : "PGP-—",
    periodo: monthNames.length ? monthNames.join(' - ') : "—"
  };

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
                <ComparisonTable
                  pgpData={pgpData}
                  executionDataByMonth={executionDataByMonth}
                  monthNames={monthNames}
                />
                <ValueComparisonCard
                  expectedValue={totalExpectedValue}
                  executedValueByMonth={totalExecutedValueByMonth}
                  comparisonData={valueComparison}
                  executionDataByMonth={executionDataByMonth}
                  monthNames={monthNames}
                />
                <QuarterlyFinancialReport
                  header={reportHeader}
                  months={reportMonths}
                />
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PgPsearchForm;
