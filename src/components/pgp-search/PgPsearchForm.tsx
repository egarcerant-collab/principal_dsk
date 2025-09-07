
"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, TrendingDown, Target, FileText, Calendar, ChevronDown, Building, BrainCircuit, AlertCircle, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { analyzePgpData } from '@/ai/flows/analyze-pgp-flow';
import { Separator } from "@/components/ui/separator";
import { fetchSheetData, type PrestadorInfo } from '@/lib/sheets';
import { ExecutionDataByMonth } from '@/app/page';
import InformePGP, { type ComparisonSummary, type DeviatedCupInfo } from './InformePGP';
import QuarterlyFinancialReport, { type ReportData as FinancialReportData } from './QuarterlyFinancialReport';


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

const calculateComparison = (pgpData: PgpRow[], executionDataByMonth: ExecutionDataByMonth): ComparisonSummary => {
  const overExecutedCups: DeviatedCupInfo[] = [];
  const underExecutedCups: DeviatedCupInfo[] = [];
  const missingCups: DeviatedCupInfo[] = [];
  const unexpectedCups: { cup: string, realFrequency: number }[] = [];

  const pgpCups = new Set(pgpData.map(row => findColumnValue(row, ['cup/cum', 'cups'])).filter(Boolean));
  const executedCups = new Set<string>();
  executionDataByMonth.forEach(monthData => {
    monthData.cupCounts.forEach((_, cup) => executedCups.add(cup));
  });

  const allRelevantCups = new Set([...pgpCups, ...executedCups]);

  allRelevantCups.forEach(cup => {
    const pgpRow = pgpData.find(row => findColumnValue(row, ['cup/cum', 'cups']) === cup);
    let totalRealFrequency = 0;
    executionDataByMonth.forEach(monthData => {
      totalRealFrequency += monthData.cupCounts.get(cup) || 0;
    });

    if (pgpRow) {
      const expectedFrequency = getNumericValue(findColumnValue(pgpRow, ['frecuencia eventos mes']));
      const totalExpectedFrequency = expectedFrequency * executionDataByMonth.size;

      if (totalRealFrequency > 0) {
        const cupInfo: DeviatedCupInfo = {
          cup,
          description: findColumnValue(pgpRow, ['descripcion cups', 'descripcion']),
          activityDescription: findColumnValue(pgpRow, ['descripcion id resolucion']),
          expectedFrequency: totalExpectedFrequency,
          realFrequency: totalRealFrequency,
          deviation: totalRealFrequency - totalExpectedFrequency,
        };
        
        // **Filtro de >111% aplicado aquí**
        if (totalExpectedFrequency > 0 && (totalRealFrequency / totalExpectedFrequency) > 1.11) {
            overExecutedCups.push(cupInfo);
        } else if (totalRealFrequency < totalExpectedFrequency) {
            underExecutedCups.push(cupInfo);
        }
      } else {
        // CUPS en nota técnica pero no ejecutados
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
      // CUPS ejecutados pero no en nota técnica
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
  };
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

  const comparisonSummary = useMemo(() => {
    if (!isDataLoaded || executionDataByMonth.size === 0) {
      return null;
    }
    return calculateComparison(pgpData, executionDataByMonth);
  }, [pgpData, executionDataByMonth, isDataLoaded]);

  const financialReportData: FinancialReportData | null = useMemo(() => {
    if (!isDataLoaded || executionDataByMonth.size === 0 || !globalSummary || !selectedPrestador) {
        return null;
    }

    const months = Array.from(executionDataByMonth.entries()).map(([month, data]) => {
        const totalValue = Object.entries(data.summary).reduce((acc, [key, value]) => {
            if (key.toLowerCase().includes('valor') || key.toLowerCase().includes('costo')) {
                return acc + getNumericValue(value);
            }
            return acc;
        }, 0);
        
        // This is a guess, needs refinement based on actual JSON structure.
        const executedValue = getNumericValue(data.summary?.vrTotalFactura) || totalValue || 0;

        return {
            monthName: new Date(2024, parseInt(month) - 1).toLocaleString('es-CO', { month: 'long' }),
            summary: data.summary,
            executedValue: executedValue,
        };
    });

    return {
        header: {
            empresa: selectedPrestador.PRESTADOR,
            nit: selectedPrestador.NIT,
            municipio: 'N/A', // This should be available in prestador data
            departamento: 'N/A', // This should be available in prestador data
            contrato: 'N/A', // Not available
            vigencia: 'N/A', // Not available
            periodo: 'N/A' // Could be constructed from months
        },
        months: months,
    };
  }, [isDataLoaded, executionDataByMonth, globalSummary, selectedPrestador]);

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
            
            {financialReportData && <QuarterlyFinancialReport header={financialReportData.header} months={financialReportData.months} />}

            {showComparison && (
                <InformePGP 
                    comparisonSummary={comparisonSummary}
                    pgpData={pgpData}
                />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PgPsearchForm;

    