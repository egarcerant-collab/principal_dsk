"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, TrendingDown, Target, FileText, Calendar, ChevronDown, Building, BrainCircuit, AlertTriangle, TableIcon, Download, Filter, Search, Users, Wallet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { analyzePgpData } from '@/ai/flows/analyze-pgp-flow';
import { Separator } from "@/components/ui/separator";
import { fetchSheetData, type PrestadorInfo } from '@/lib/sheets';
import { type ExecutionDataByMonth, type CupCountsMap } from '@/app/page';
import InformeDesviaciones, { LookedUpCupModal } from '../report/InformeDesviaciones';
import FinancialMatrix, { type MonthlyFinancialSummary } from './FinancialMatrix';
import { buildMatrizEjecucion, type MatrizRow as MatrizEjecucionRow } from '@/lib/matriz-helpers';
import Papa from 'papaparse';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { describeCup, type CupDescription } from '@/ai/flows/describe-cup-flow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import InformePGP from '../report/InformePGP';
import StatCard from '../shared/StatCard';
import { describeCie10, Cie10Description } from '@/ai/flows/describe-cie10-flow';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


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
    deviationValue: number;
}

export interface UnexpectedCupInfo {
    cup: string;
    realFrequency: number;
    totalValue: number;
}


export interface MatrixRow {
    Mes: string;
    CUPS: string;
    Descripcion?: string;
    Diagnostico_Principal?: string;
    Cantidad_Esperada: number;
    Cantidad_Ejecutada: number;
    Diferencia: number;
    percentage_ejecucion: number; 
    '%_Ejecucion': string;
    Clasificacion: string;
    Valor_Unitario: number;
    Valor_Esperado: number;
    Valor_Ejecutado: number;
}

export interface ComparisonSummary {
    overExecutedCups: DeviatedCupInfo[];
    underExecutedCups: DeviatedCupInfo[];
    missingCups: DeviatedCupInfo[];
    unexpectedCups: UnexpectedCupInfo[];
    Matriz_Ejecucion_vs_Esperado: MatrizEjecucionRow[];
    monthlyFinancials: MonthlyFinancialSummary[];
}

export interface ReportData {
  header: {
    empresa: string;
    nit: string;
    ipsNombre: string;
    ipsNit: string;
    municipio: string;
    contrato: string;
    vigencia: string;
    ciudad?: string;
    fecha?: string;
  };
  months: { month: string; cups: number; valueCOP: number; }[];
  notaTecnica: {
    min90: number;
    valor3m: number;
    max110: number;
    anticipos: number;
    totalPagar: number;
    totalFinal: number;
  };
  overExecutedCups: DeviatedCupInfo[];
  underExecutedCups: DeviatedCupInfo[];
  missingCups: DeviatedCupInfo[];
  unexpectedCups: UnexpectedCupInfo[];
}



interface PgPsearchFormProps {
  executionDataByMonth: ExecutionDataByMonth;
  jsonPrestadorCode: string | null;
  uniqueUserCount: number;
}

const PRESTADORES_SHEET_URL = "https://docs.google.com/spreadsheets/d/10Icu1DO4llbolO60VsdFcN5vxuYap1vBZs6foZ-XD04/edit?gid=0#gid=0";

const normalizeString = (v: unknown): string => String(v ?? "").trim();
const normalizeDigits = (v: unknown): string => String(v ?? "").trim().replace(/\s+/g, "").replace(/\D/g, "");


export const getNumericValue = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const v = String(value).trim().replace(/\$/g, '').replace(/,/g, '');
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
};

export const findColumnValue = (row: PgpRow, possibleNames: string[]): any => {
  if (!row) return undefined;
  const keys = Object.keys(row);
  for (const name of possibleNames) {
    const key = keys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
    if (key && row[key] !== undefined) return row[key];
  }
  return undefined;
};

const calculateSummary = (data: PgpRow[]): SummaryData | null => {
  if (data.length === 0) return null;
  const totalCostoMes = data.reduce((acc, row) => {
    const costo = getNumericValue(findColumnValue(row, ['costo evento mes (valor mes)', 'costo evento mes']));
    return acc + costo;
  }, 0);
  return {
    totalCostoMes,
    totalAnual: totalCostoMes * 12,
    costoMinimoMes: totalCostoMes * 0.9,
    costoMaximoMes: totalCostoMes * 1.1,
  };
};

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

const AnalysisModal = ({ analysis, isLoading, open, onOpenChange }: { analysis: AnalyzePgpDataOutput | null, isLoading: boolean, open: boolean, onOpenChange: (open: boolean) => void }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-blue-600" />
            Análisis Profesional de la Nota Técnica
          </DialogTitle>
          <DialogDescription>
            La IA ha generado las siguientes observaciones y recomendaciones basadas en los datos.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Analizando Nota Técnica...</p>
          </div>
        ) : analysis ? (
          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <h3 className="font-semibold text-lg mb-2">Observaciones Clave</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                {analysis.keyObservations.map((obs, i) => <li key={i}>{obs}</li>)}
              </ul>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg mb-2">Potenciales Riesgos</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                {analysis.potentialRisks.map((risk, i) => <li key={i}>{risk}</li>)}
              </ul>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold text-lg mb-2">Recomendaciones Estratégicas</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                {analysis.strategicRecommendations.map((rec, i) => <li key={i}>{rec}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
            <p>No se pudo generar el análisis.</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
};

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
  const unexpectedCups: UnexpectedCupInfo[] = [];
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
  
  const matrizData = buildMatrizEjecucion({ executionDataByMonth, pgpData });

  matrizData.forEach(row => {
      const monthName = row.Mes;
      let monthFinance = monthlyFinancialsMap.get(monthName);
      if (!monthFinance) {
          monthFinance = { totalValorEsperado: 0, totalValorEjecutado: 0, percentage: 0 };
          monthlyFinancialsMap.set(monthName, monthFinance);
      }
      monthFinance.totalValorEsperado += row.Valor_Esperado;
      monthFinance.totalValorEjecutado += row.Valor_Ejecutado;
  });

  monthlyFinancialsMap.forEach((finance, month) => {
    finance.percentage = finance.totalValorEsperado > 0 ? (finance.totalValorEjecutado / finance.totalValorEsperado) * 100 : 0;
  });

  const monthlyFinancials = Array.from(monthlyFinancialsMap, ([month, data]) => ({ month, ...data }));

  allRelevantCups.forEach(cup => {
    const pgpRow = pgpCupsMap.get(cup);
    let totalRealFrequency = 0;
    let totalRealValue = 0;
    executionDataByMonth.forEach(monthData => {
      const cupData = monthData.cupCounts.get(cup);
      totalRealFrequency += cupData?.total || 0;
      totalRealValue += cupData?.totalValue || 0;
    });

    if (pgpRow) {
      const expectedFrequencyPerMonth = getNumericValue(findColumnValue(pgpRow, ['frecuencia eventos mes']));
      const totalExpectedFrequency = expectedFrequencyPerMonth * executionDataByMonth.size;
      const unitValue = getNumericValue(findColumnValue(pgpRow, ['valor unitario']));

      if (totalRealFrequency > 0 || totalExpectedFrequency > 0) {
        const deviation = totalRealFrequency - totalExpectedFrequency;
        const percentage = totalExpectedFrequency > 0 ? (totalRealFrequency / totalExpectedFrequency) : Infinity;
        
        const cupInfo: DeviatedCupInfo = {
          cup,
          description: findColumnValue(pgpRow, ['descripcion cups', 'descripcion']),
          activityDescription: findColumnValue(pgpRow, ['descripcion id resolucion']),
          expectedFrequency: totalExpectedFrequency,
          realFrequency: totalRealFrequency,
          deviation: deviation,
          deviationValue: deviation * unitValue,
        };
        
        if (percentage > 1.11) {
            overExecutedCups.push(cupInfo);
        } else if (percentage < 0.90 && totalExpectedFrequency > 0) {
            underExecutedCups.push(cupInfo);
        }
        
        if (totalRealFrequency === 0 && totalExpectedFrequency > 0) {
            missingCups.push(cupInfo);
        }
      }
    } else if (totalRealFrequency > 0) {
      unexpectedCups.push({
        cup,
        realFrequency: totalRealFrequency,
        totalValue: totalRealValue,
      });
    }
  });
  
  overExecutedCups.sort((a, b) => b.deviationValue - a.deviationValue);
  underExecutedCups.sort((a, b) => a.deviationValue - b.deviationValue);


  return {
    overExecutedCups,
    underExecutedCups,
    missingCups,
    unexpectedCups,
    Matriz_Ejecucion_vs_Esperado: matrizData,
    monthlyFinancials,
  };
};

const handleDownloadXls = (data: any[], filename: string) => {
    // Deep copy to avoid modifying the original data
    const dataToExport = JSON.parse(JSON.stringify(data));

    // Iterate over the data and format numbers for Latin American Excel
    const formattedData = dataToExport.map((row: any) => {
        for (const key in row) {
            if (typeof row[key] === 'number') {
                // Convert number to string with comma as decimal separator
                row[key] = row[key].toString().replace('.', ',');
            }
        }
        return row;
    });

    const csv = Papa.unparse(formattedData, { delimiter: ";" });
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const MatrizEjecucionCard = ({ matrizData, onCupClick, onCie10Click }: { matrizData: MatrizEjecucionRow[], onCupClick: (cup: string) => void, onCie10Click: (cie10: string) => void }) => {
    const [classificationFilter, setClassificationFilter] = useState('all');

    const classifications = useMemo(() => {
        const unique = new Set(matrizData.map(d => d.Clasificacion));
        return ['all', ...Array.from(unique)];
    }, [matrizData]);

    const filteredData = useMemo(() => {
        if (classificationFilter === 'all') {
            return matrizData;
        }
        return matrizData.filter(d => d.Clasificacion === classificationFilter);
    }, [matrizData, classificationFilter]);

    const getRowClass = (classification: string) => {
        switch (classification) {
            case "Sobre-ejecutado": return "text-red-600";
            case "Sub-ejecutado": return "text-blue-600";
            case "Faltante": return "text-yellow-600";
            case "Inesperado": return "text-purple-600";
            default: return "";
        }
    };

    return (
        <Accordion type="single" collapsible className="w-full border rounded-lg" defaultValue='item-1'>
            <AccordionItem value="item-1" className="border-0">
                <div className="flex flex-wrap items-center justify-between p-4 gap-4">
                    <AccordionTrigger className="p-0 flex-1 hover:no-underline">
                        <div className="flex items-center">
                            <TableIcon className="h-6 w-6 mr-3 text-purple-600" />
                            <h3 className="text-base font-medium text-left">Matriz Ejecución vs Esperado (mensual)</h3>
                        </div>
                    </AccordionTrigger>
                    <div className='flex items-center gap-2 pl-4'>
                        <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                            <SelectTrigger className="w-[200px] h-8 text-xs">
                                <Filter className="h-3 w-3 mr-2" />
                                <SelectValue placeholder="Filtrar por clasificación..." />
                            </SelectTrigger>
                            <SelectContent>
                                {classifications.map(c => (
                                    <SelectItem key={c} value={c} className="text-xs">
                                        {c === 'all' ? 'Ver Todos' : c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadXls(filteredData, `matriz_ejecucion_mensual_${classificationFilter}.xls`);
                            }}
                            className="h-8 w-8"
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
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Diagnóstico Principal (CIE-10)</TableHead>
                                    <TableHead className="text-center">Cant. Esperada</TableHead>
                                    <TableHead className="text-center">Cant. Ejecutada</TableHead>
                                    <TableHead className="text-center">Diferencia</TableHead>
                                    <TableHead className="text-center">% Ejecución</TableHead>
                                    <TableHead>Clasificación</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.map((row, index) => (
                                    <TableRow key={index} className={getRowClass(row.Clasificacion)}>
                                        <TableCell className="text-xs">{row.Mes}</TableCell>
                                        <TableCell>
                                            <Button variant="link" className="p-0 h-auto font-mono text-xs" onClick={() => onCupClick(row.CUPS)}>
                                                {row.CUPS}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-xs">{row.Descripcion}</TableCell>
                                        <TableCell>
                                            {row.Diagnostico_Principal && (
                                                <Button variant="link" className="p-0 h-auto font-mono text-xs" onClick={() => onCie10Click(row.Diagnostico_Principal!)}>
                                                   <Search className="h-3 w-3 mr-1" /> {row.Diagnostico_Principal}
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">{row.Cantidad_Esperada.toFixed(0)}</TableCell>
                                        <TableCell className="text-center">{row.Cantidad_Ejecutada}</TableCell>
                                        <TableCell className="text-center font-semibold">{row.Diferencia.toFixed(0)}</TableCell>
                                        <TableCell className="text-center font-mono text-xs">{row['%_Ejecucion']}</TableCell>
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


const PgPsearchForm: React.FC<PgPsearchFormProps> = ({ executionDataByMonth, jsonPrestadorCode, uniqueUserCount }) => {
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
  const [lookedUpCupInfo, setLookedUpCupInfo] = useState<CupDescription | null>(null);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [cie10Info, setCie10Info] = useState<Cie10Description | null>(null);
  const [isCie10ModalOpen, setIsCie10ModalOpen] = useState(false);
  const [isCie10Loading, setIsCie10Loading] = useState(false);

  const showComparison = isDataLoaded && executionDataByMonth.size > 0;

  useEffect(() => {
    setIsClient(true);
    fetch('/api/check-env').then(res => res.json()).then(data => setIsAiEnabled(data.isAiEnabled));
  }, []);

  const comparisonSummary = useMemo(() => {
    if (!showComparison) return null;
    return calculateComparison(pgpData, executionDataByMonth);
  }, [pgpData, executionDataByMonth, showComparison]);

  const totalEjecutado = useMemo(() => {
    if (!comparisonSummary) return 0;
    return comparisonSummary.monthlyFinancials.reduce((sum, month) => sum + month.totalValorEjecutado, 0);
  }, [comparisonSummary]);

  const reportData = useMemo((): ReportData | null => {
    if (!showComparison || !selectedPrestador || !globalSummary || !comparisonSummary) return null;
    const monthsData = Array.from(executionDataByMonth.entries()).map(([month, data]) => ({
      month: getMonthName(month),
      cups: data.summary.numConsultas + data.summary.numProcedimientos,
      valueCOP: comparisonSummary.monthlyFinancials.find(m => m.month === getMonthName(month))?.totalValorEjecutado ?? 0,
    }));
    const totalExecution = monthsData.reduce((acc, m) => acc + m.valueCOP, 0);
    return {
      header: {
        empresa: "Dusakawi EPSI", nit: "8240001398",
        ipsNombre: selectedPrestador.PRESTADOR, ipsNit: selectedPrestador.NIT,
        municipio: "Uribia", contrato: "CW-052-2024-P", vigencia: "2024",
        ciudad: "Uribia", fecha: new Date().toLocaleDateString('es-CO'),
      },
      months: monthsData,
      notaTecnica: {
        min90: globalSummary.totalCostoMes * 0.9, valor3m: globalSummary.totalCostoMes, max110: globalSummary.totalCostoMes * 1.1,
        anticipos: totalExecution * 0.8, totalPagar: totalExecution * 0.2, totalFinal: totalExecution,
      },
      overExecutedCups: comparisonSummary.overExecutedCups,
      underExecutedCups: comparisonSummary.underExecutedCups,
      missingCups: comparisonSummary.missingCups,
      unexpectedCups: comparisonSummary.unexpectedCups,
    };
  }, [showComparison, selectedPrestador, executionDataByMonth, globalSummary, comparisonSummary]);

  const handleLookupClick = async (cup: string) => {
    setIsLookupLoading(true);
    setIsLookupModalOpen(true);
    try {
      const result = await describeCup(cup);
      setLookedUpCupInfo(result);
    } catch (error) {
      setLookedUpCupInfo({ cup, description: "Error al buscar la descripción." });
    } finally {
      setIsLookupLoading(false);
    }
  };

  const handleCie10Lookup = async (code: string) => {
    if (!code) return;
    setIsCie10Loading(true);
    setIsCie10ModalOpen(true);
    try {
        const result = await describeCie10(code);
        setCie10Info(result);
    } catch (error) {
        setCie10Info({ code, description: "Error al buscar la descripción." });
    } finally {
        setIsCie10Loading(false);
    }
  }

  

  const performLoadPrestador = useCallback(async (prestador: Prestador) => {
    setLoading(true); setIsDataLoaded(false); setGlobalSummary(null); setAnalysis(null); setMismatchWarning(null);
    toast({ title: `Cargando Nota Técnica: ${prestador.PRESTADOR}...` });

    try {
      if (!prestador.WEB || String(prestador.WEB).trim() === '') throw new Error("URL de nota técnica no definida.");
      const data = await fetchSheetData<PgpRow>(prestador.WEB);
      const pgpRows = data.map(row => {
        const newRow: Partial<PgpRow> = {};
        for (const key in row) {
          const trimmedKey = key.trim();
          if (Object.prototype.hasOwnProperty.call(row, key) && trimmedKey) newRow[trimmedKey] = row[key];
        }
        return newRow as PgpRow;
      }).filter(item => !!findColumnValue(item, ['cup/cum', 'cups']));

      if (pgpRows.length === 0) toast({ title: "Atención: No se cargaron registros", description: "La nota técnica parece vacía o en un formato no reconocido.", variant: "destructive"});
      
      setPgpData(pgpRows);
      setGlobalSummary(calculateSummary(pgpRows));
      setIsDataLoaded(true);
      setSelectedPrestador(prestador);
      toast({ title: "Datos PGP Cargados", description: `Se cargaron ${pgpRows.length} registros para ${prestador.PRESTADOR}.` });

    } catch (error: any) {
      toast({ title: "Error al Cargar Datos de la Nota Técnica", description: error.message, variant: "destructive" });
      setIsDataLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleSelectPrestador = useCallback((prestador: Prestador) => {
    setMismatchWarning(null);
    setIsDataLoaded(false);
    setPrestadorToLoad(prestador);
    const pgpZoneId = prestador['ID DE ZONA'] ? normalizeDigits(prestador['ID DE ZONA']) : null;
    const jsonId = jsonPrestadorCode ? normalizeDigits(jsonPrestadorCode) : null;
    if (jsonId && pgpZoneId && jsonId !== pgpZoneId) {
      setMismatchWarning(`¡Advertencia! El código del JSON (${jsonId}) no coincide con el ID de la nota técnica (${pgpZoneId}). Los datos podrían no ser comparables.`);
    } else {
      performLoadPrestador(prestador);
    }
  }, [jsonPrestadorCode, performLoadPrestador]);

  const handleForceLoad = () => {
    if (prestadorToLoad) performLoadPrestador(prestadorToLoad);
  };

  useEffect(() => {
    if (!isClient) return;
    const fetchPrestadores = async () => {
      setLoadingPrestadores(true);
      toast({ title: "Cargando lista de prestadores..." });
      try {
        const data = await fetchSheetData<Prestador>(PRESTADORES_SHEET_URL);
        const typedData = data.map(p => ({
          'NIT': normalizeString(p.NIT), 'PRESTADOR': normalizeString(p.PRESTADOR),
          'ID DE ZONA': normalizeString(p['ID DE ZONA']), 'WEB': normalizeString(p.WEB),
          'POBLACION': getNumericValue(p.POBLACION)
        })).filter(p => p.PRESTADOR && p['ID DE ZONA']);
        setPrestadores(typedData);
        toast({ title: "Lista de prestadores cargada.", description: `Se encontraron ${typedData.length} prestadores.` });
      } catch (error: any) {
        toast({ title: "Error al Cargar la Lista de Prestadores", description: error.message, variant: "destructive" });
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
      toast({ title: "Prestador Sugerido Encontrado", description: `Cargando automáticamente la nota técnica para ${matchById.PRESTADOR}.` });
      handleSelectPrestador(matchById);
    }
  }, [jsonPrestadorCode, prestadores, loading, selectedPrestador, handleSelectPrestador, toast]);

  const population = selectedPrestador?.POBLACION ?? 0;
  const coveragePercentage = population > 0 ? (uniqueUserCount / population) * 100 : 0;
  
  if (!isClient) {
    return <div className="flex items-center justify-center py-6"><Loader2 className="mr-2 h-6 w-6 animate-spin" /> <p>Cargando analizador...</p></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis de Notas Técnicas PGP</CardTitle>
        <CardDescription>Selecciona un prestador para cargar su nota técnica y visualizar los datos.</CardDescription>
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
              <DropdownMenuItem key={`${p['ID DE ZONA']}-${index}`} onSelect={() => handleSelectPrestador(p)} className="flex flex-col items-start p-2">
                 <span className="font-medium block">{p.PRESTADOR}</span>
                 <span className="text-xs text-muted-foreground block">({p['ID DE ZONA']})</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {mismatchWarning && (
          <Alert variant="destructive">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-center"><AlertTriangle className="h-4 w-4 mr-2" />
                <div>
                  <AlertTitle>Advertencia de Coincidencia</AlertTitle>
                  <AlertDescription>{mismatchWarning}</AlertDescription>
                </div>
              </div>
              <Button onClick={handleForceLoad} variant="secondary" className="mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">Cargar de todos modos</Button>
            </div>
          </Alert>
        )}

        {loading && <div className="flex items-center justify-center py-6"><Loader2 className="mr-2 h-6 w-6 animate-spin" /><p>Cargando datos de la nota técnica...</p></div>}

        {isDataLoaded && !loading && (
          <div className="space-y-6">
             {showComparison && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <StatCard title="Cobertura Poblacional" value={`${coveragePercentage.toFixed(1)}%`} icon={Users} footer={`Atendidos: ${uniqueUserCount.toLocaleString()} de ${population.toLocaleString()}`} />
                    <StatCard title="Valor Total Ejecutado" value={formatCurrency(totalEjecutado)} icon={Wallet} footer={`Correspondiente a ${executionDataByMonth.size} mes(es) analizados`} />
                </div>
            )}
            <SummaryCard summary={globalSummary} title={`Resumen Teórico: Nota Técnica de ${selectedPrestador?.PRESTADOR ?? '—'}`} description="Cálculos basados en la totalidad de los datos cargados desde la nota técnica." />
            
            {showComparison && comparisonSummary && (
              <>
                <FinancialMatrix monthlyFinancials={comparisonSummary.monthlyFinancials} />
                <InformeDesviaciones comparisonSummary={comparisonSummary} pgpData={pgpData} />
                <MatrizEjecucionCard matrizData={comparisonSummary.Matriz_Ejecucion_vs_Esperado} onCupClick={handleLookupClick} onCie10Click={handleCie10Lookup} />
                <InformePGP data={reportData} />
              </>
            )}
          </div>
        )}

        <LookedUpCupModal cupInfo={lookedUpCupInfo} open={isLookupModalOpen} onOpenChange={setIsLookupModalOpen} isLoading={isLookupLoading} />
        <AlertDialog open={isCie10ModalOpen} onOpenChange={setIsCie10ModalOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{isCie10Loading ? "Buscando diagnóstico..." : `Resultado para: ${cie10Info?.code}`}</AlertDialogTitle>
                </AlertDialogHeader>
                {isCie10Loading ? (
                    <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <AlertDialogDescription>{cie10Info?.description || "No se encontró una descripción."}</AlertDialogDescription>
                )}
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setIsCie10ModalOpen(false)}>Cerrar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AnalysisModal analysis={analysis} isLoading={loadingAnalysis} open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen} />
      </CardContent>
    </Card>
  );
};

export default PgPsearchForm;




