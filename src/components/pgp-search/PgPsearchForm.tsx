
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, TrendingDown, Target, FileText, Calendar, ChevronDown, Building, BrainCircuit, TableIcon, Hash, BarChart, Users, Stethoscope, Microscope, Pill, Syringe, AlertCircle, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { analyzePgpData } from '@/ai/flows/analyze-pgp-flow';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchSheetData, type PrestadorInfo } from '@/lib/sheets';
import StatCard from '@/components/shared/StatCard';
import { CupCountsMap } from '@/app/page';
import ValueComparisonCard from './ValueComparisonCard'; 
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Types moved from the server file to the client component
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

interface SummaryData {
  totalCostoMes: number;
  upperBound: number;
  lowerBound: number;
  totalAnual: number;
  totalMinimoAnual: number;
  totalMaximoAnual: number;
}

interface ComparisonData {
    cup: string;
    description: string;
    expectedFrequency: number;
    realFrequency: number;
    difference: number;
}

export interface ValueComparisonItem {
    cup: string;
    description: string;
    unitValue: number;
    expectedValue: number;
    executedValue: number;
    difference: number;
}

interface PgPsearchFormProps {
  unifiedSummary: any | null;
  cupCounts: CupCountsMap;
  jsonPrestadorCode: string | null;
}


const PRESTADORES_SHEET_URL = "https://docs.google.com/spreadsheets/d/10Icu1DO4llbolO60VsdFcN5vxuYap1vBZs6foZ-XD04/gviz/tq?tqx=out:csv&sheet=Hoja1";

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

export const getNumericValue = (value: any): number => {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value !== 'string') {
      value = String(value ?? '0');
    }
    // First, remove currency symbols and thousands separators (dots in COP)
    const cleanValue = value.replace(/[$.]/g, '').replace(/,/g, '.').trim();
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                        <p className="text-sm text-muted-foreground">Costo Mínimo Anual</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-500">{formatCurrency(summary.totalMinimoAnual)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700">
                        <p className="text-sm text-muted-foreground">Valor Total Anual (Estimado)</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{formatCurrency(summary.totalAnual)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <p className="text-sm text-muted-foreground">Costo Máximo Anual</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-500">{formatCurrency(summary.totalMaximoAnual)}</p>
                    </div>
                </div>
            </div>
             <Separator />
            <div>
                <h3 className="text-lg font-medium mb-2 flex items-center"><FileText className="mr-2 h-5 w-5 text-muted-foreground" />Detalle Mensual</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                        <TrendingDown className="h-6 w-6 mx-auto text-red-500 mb-1"/>
                        <p className="text-sm text-muted-foreground">Rango Inferior (90%)</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-500">{formatCurrency(summary.lowerBound)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <Target className="h-6 w-6 mx-auto text-blue-500 mb-1"/>
                        <p className="text-sm text-muted-foreground">Costo Total por Mes</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-500">{formatCurrency(summary.totalCostoMes)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <TrendingUp className="h-6 w-6 mx-auto text-green-500 mb-1"/>
                        <p className="text-sm text-muted-foreground">Rango Superior (110%)</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-500">{formatCurrency(summary.upperBound)}</p>
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


const ComparisonTable = ({ pgpData, cupCounts }: { pgpData: PgpRow[], cupCounts: CupCountsMap }) => {
    const comparisonData: ComparisonData[] = pgpData.map(row => {
        const findColumn = (possibleNames: string[]) => {
            for (const name of possibleNames) {
                const key = Object.keys(row).find(k => k.toLowerCase().trim() === name.toLowerCase());
                if (key) return row[key];
            }
            return '';
        };

        const cup = findColumn(['cup/cum', 'cups']);
        const expectedFrequency = getNumericValue(findColumn(['frecuencia eventos mes']));
        const realFrequency = cup ? cupCounts.get(cup) || 0 : 0;
        const difference = realFrequency - expectedFrequency;
        const description = findColumn(['descripcion cups', 'descripcion']);

        return {
            cup,
            description,
            expectedFrequency,
            realFrequency,
            difference,
        };
    }).filter(item => item.cup && item.realFrequency > 0); // Filter out rows with 0 real frequency

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
                                <TableHead className="text-center">Frec. Real (JSON)</TableHead>
                                <TableHead className="text-center">Diferencia</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {comparisonData.map((item, index) => (
                                <TableRow key={`${item.cup}-${index}`}>
                                    <TableCell className="font-mono">{item.cup}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-center">{item.expectedFrequency.toLocaleString()}</TableCell>
                                    <TableCell className="text-center font-semibold">{item.realFrequency.toLocaleString()}</TableCell>
                                    <TableCell className={`text-center font-bold ${item.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {item.difference > 0 ? `+${item.difference.toLocaleString()}` : item.difference.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};


const PgPsearchForm: React.FC<PgPsearchFormProps> = ({ unifiedSummary, cupCounts, jsonPrestadorCode }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
    const [loadingPrestadores, setLoadingPrestadores] = useState<boolean>(true);
    const [pgpData, setPgpData] = useState<PgpRow[]>([]);
    const [prestadores, setPrestadores] = useState<Prestador[]>([]);
    const [selectedPrestador, setSelectedPrestador] = useState<Prestador | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
    const [globalSummary, setGlobalSummary] = useState<SummaryData | null>(null);
    const [analysis, setAnalysis] = useState<AnalyzePgpDataOutput | null>(null);
    const [valueComparison, setValueComparison] = useState<ValueComparisonItem[]>([]);
    const [totalExpectedValue, setTotalExpectedValue] = useState(0);
    const [totalExecutedValue, setTotalExecutedValue] = useState(0);
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    const [isAiEnabled, setIsAiEnabled] = useState(false);
    const [mismatchError, setMismatchError] = useState<string | null>(null);


    useEffect(() => {
        setIsClient(true);
        fetch('/api/check-env').then(res => res.json()).then(data => {
            setIsAiEnabled(data.isAiEnabled);
        });
    }, []);

    useEffect(() => {
        if (!isClient) return;
        
        const fetchPrestadores = async () => {
            setLoadingPrestadores(true);
            toast({ title: "Cargando lista de prestadores..." });
            try {
                const data = await fetchSheetData<Prestador>(PRESTADORES_SHEET_URL);
                const typedData = data.filter(p => p.PRESTADOR && String(p.PRESTADOR).trim() !== '');
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
    
    const calculateSummary = useCallback((data: PgpRow[]): SummaryData | null => {
        if (data.length === 0) return null;
        
        const findColumnValue = (row: PgpRow, possibleNames: string[]): number => {
            for (const name of possibleNames) {
                const key = Object.keys(row).find(k => k.toLowerCase().trim() === name.toLowerCase());
                if (key) return getNumericValue(row[key]);
            }
            return 0;
        };

        const totalCostoMes = data.reduce((acc, row) => acc + findColumnValue(row, ['costo evento mes (valor mes)', 'costo evento mes']), 0);
        const totalMinimoMes = data.reduce((acc, row) => acc + findColumnValue(row, ['valor minimo mes']), 0);
        const totalMaximoMes = data.reduce((acc, row) => acc + findColumnValue(row, ['valor maximo mes']), 0);

        return {
            totalCostoMes,
            lowerBound: totalCostoMes * 0.9,
            upperBound: totalCostoMes * 1.1,
            totalAnual: totalCostoMes * 12,
            totalMinimoAnual: totalMinimoMes * 12,
            totalMaximoAnual: totalMaximoMes * 12,
        };
    }, []);

    const calculateValueComparison = useCallback((pgpData: PgpRow[], cupCounts: CupCountsMap) => {
        let totalExpected = 0;
        let totalExecuted = 0;
        
        const comparisonData = pgpData.map(row => {
            const findColumn = (possibleNames: string[]) => {
                for (const name of possibleNames) {
                    const key = Object.keys(row).find(k => k.toLowerCase().trim() === name.toLowerCase());
                    if (key) return row[key];
                }
                return '';
            };

            const cup = findColumn(['cup/cum', 'cups']);
            const description = findColumn(['descripcion cups', 'descripcion']);
            const unitValue = getNumericValue(findColumn(['valor unitario']));
            const expectedFrequency = getNumericValue(findColumn(['frecuencia eventos mes']));
            const realFrequency = cup ? cupCounts.get(cup) || 0 : 0;

            const expectedValue = unitValue * expectedFrequency;
            const executedValue = unitValue * realFrequency;

            totalExpected += expectedValue;
            totalExecuted += executedValue;

            return {
                cup,
                description,
                unitValue,
                expectedValue,
                executedValue,
                difference: executedValue - expectedValue,
            };
        }).filter(item => item.cup && item.executedValue > 0);

        setValueComparison(comparisonData);
        setTotalExpectedValue(totalExpected);
        setTotalExecutedValue(totalExecuted);

    }, []);

    useEffect(() => {
        if (isDataLoaded && pgpData.length > 0 && cupCounts && cupCounts.size > 0) {
            calculateValueComparison(pgpData, cupCounts);
        } else {
            setValueComparison([]);
            setTotalExpectedValue(0);
            setTotalExecutedValue(0);
        }
    }, [isDataLoaded, pgpData, cupCounts, calculateValueComparison]);

    const handleSelectPrestador = async (prestador: Prestador) => {
        setMismatchError(null);
        setSelectedPrestador(prestador);

        const pgpZoneId = prestador['ID DE ZONA'] ? String(prestador['ID DE ZONA']).trim() : null;
        
        if (jsonPrestadorCode && pgpZoneId && jsonPrestadorCode !== pgpZoneId) {
            const errorMsg = `El código del prestador del JSON (${jsonPrestadorCode}) no coincide con el ID DE ZONA de la nota técnica (${pgpZoneId}).`;
            setMismatchError(errorMsg);
            toast({
                title: "Error de Coincidencia de Prestador",
                description: errorMsg,
                variant: "destructive",
                duration: 5000,
            });
            setIsDataLoaded(false);
            setPgpData([]);
            setGlobalSummary(null);
            setAnalysis(null);
            return;
        }

        setLoading(true);
        if (isAiEnabled) {
          setLoadingAnalysis(true);
        }
        setIsDataLoaded(false);
        setGlobalSummary(null);
        setAnalysis(null);
        toast({ title: `Cargando Nota Técnica: ${prestador.PRESTADOR}...`, description: "Espere un momento, por favor." });
        
        try {
            if (!prestador.WEB || prestador.WEB.trim() === '') {
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
                 const cupKey = Object.keys(item).find(k => k.toLowerCase() === 'cup/cum' || k.toLowerCase() === 'cups');
                 return !!(cupKey && item[cupKey]);
            });

            setPgpData(pgpRows);
            setGlobalSummary(calculateSummary(pgpRows));
            setIsDataLoaded(true);
            toast({ title: "Datos PGP Cargados", description: `Se cargaron ${pgpRows.length} registros para ${prestador.PRESTADOR}.` });

            if (isAiEnabled && pgpRows.length > 0) {
                try {
                    const analysisInput = pgpRows.slice(0, 50).map(row => {
                        const findColumn = (possibleNames: string[]) => {
                             for (const name of possibleNames) {
                                const key = Object.keys(row).find(k => k.toLowerCase() === name.toLowerCase());
                                if (key) return row[key];
                            }
                            return undefined;
                        };
                        return {
                            'SUBCATEGORIA': findColumn(['subcategoria']),
                            'AMBITO': findColumn(['ambito']),
                            'ID RESOLUCION 3100': findColumn(['id resolucion 3100']),
                            'DESCRIPCION ID RESOLUCION': findColumn(['descripcion id resolucion']),
                            'CUP/CUM': findColumn(['cup/cum', 'cups']),
                            'DESCRIPCION CUPS': findColumn(['descripcion cups', 'descripcion']),
                            'FRECUENCIA AÑO SERVICIO': getNumericValue(findColumn(['frecuencia año servicio'])),
                            'FRECUENCIA USO': getNumericValue(findColumn(['frecuencia uso'])),
                            'FRECUENCIA EVENTOS MES': getNumericValue(findColumn(['frecuencia eventos mes'])),
                            'FRECUENCIA EVENTO DIA': getNumericValue(findColumn(['frecuencia evento dia'])),
                            'COSTO EVENTO MES': getNumericValue(findColumn(['costo evento mes'])),
                            'COSTO EVENTO DIA': getNumericValue(findColumn(['costo evento dia'])),
                            'FRECUENCIA MINIMA MES': getNumericValue(findColumn(['frecuencia minima mes'])),
                            'FRECUENCIA MAXIMA MES': getNumericValue(findColumn(['frecuencia maxima mes'])),
                            'VALOR UNITARIO': getNumericValue(findColumn(['valor unitario'])),
                            'VALOR MINIMO MES': getNumericValue(findColumn(['valor minimo mes'])),
                            'VALOR MAXIMO MES': getNumericValue(findColumn(['valor maximo mes'])),
                            'COSTO EVENTO MES (VALOR MES)': getNumericValue(findColumn(['costo evento mes (valor mes)', 'costo evento mes'])),
                            'OBSERVACIONES': findColumn(['observaciones'])
                        }
                    })
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
            setSelectedPrestador(null);
            setIsDataLoaded(false);
        } finally {
            setLoading(false);
        }
    };
    
    if (!isClient) {
        return (
            <div className="flex items-center justify-center py-6">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                <p>Cargando analizador...</p>
            </div>
        );
    }

    const showComparison = isDataLoaded && cupCounts && cupCounts.size > 0;

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
                           <DropdownMenuItem key={`${p.NIT}-${index}`} onSelect={() => handleSelectPrestador(p)}>
                               {p.PRESTADOR}
                           </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                 {mismatchError && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error de Coincidencia</AlertTitle>
                        <AlertDescription>{mismatchError}</AlertDescription>
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
                            title={`Resumen Teórico: Nota Técnica de ${selectedPrestador?.PRESTADOR}`}
                            description="Cálculos basados en la totalidad de los datos cargados desde la nota técnica."
                        />
                        { isAiEnabled && <AnalysisCard analysis={analysis} isLoading={loadingAnalysis} /> }
                        
                        { showComparison && (
                            <>
                                <ComparisonTable pgpData={pgpData} cupCounts={cupCounts} />
                                <ValueComparisonCard 
                                    expectedValue={totalExpectedValue}
                                    executedValue={totalExecutedValue}
                                    comparisonData={valueComparison}
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

    