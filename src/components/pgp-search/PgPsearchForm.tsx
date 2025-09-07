"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, Info, CheckCircle, DatabaseZap, Loader2, TrendingUp, TrendingDown, Target, FileText, Calendar, ChevronDown, Building, BrainCircuit, TableIcon } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import Papa, { type ParseResult } from 'papaparse';
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { analyzePgpData } from '@/ai/flows/analyze-pgp-flow';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface Prestador {
    NIT: string;
    PRESTADOR: string;
    'ID DE ZONA': string;
    WEB: string;
}

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
}

interface AnalyzePgpDataOutput {
    keyObservations: string[];
    potentialRisks: string[];
    strategicRecommendations: string[];
}


interface SummaryData {
  totalCostoMes: number;
  upperBound: number;
  lowerBound: number;
  totalAnual: number;
  totalMinimoAnual: number;
  totalMaximoAnual: number;
}

const PRESTADORES_SHEET_URL = "https://docs.google.com/spreadsheets/d/10Icu1DO4llbolO60VsdFcN5vxuYap1vBZs6foZ-XD04/edit?usp=sharing";

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);
};

const SummaryCard = ({ summary, title, description }: { summary: SummaryData, title: string, description: string }) => (
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
);

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
}

const PgPsearchForm: React.FC = () => {
    const [searchValue, setSearchValue] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
    const [loadingPrestadores, setLoadingPrestadores] = useState<boolean>(true);
    const [results, setResults] = useState<PgpRow[]>([]);
    const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
    const [pgpData, setPgpData] = useState<PgpRow[]>([]);
    const [prestadores, setPrestadores] = useState<Prestador[]>([]);
    const [selectedPrestador, setSelectedPrestador] = useState<Prestador | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
    const [globalSummary, setGlobalSummary] = useState<SummaryData | null>(null);
    const [analysis, setAnalysis] = useState<AnalyzePgpDataOutput | null>(null);
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const fetchAndParseSheetData = useCallback(async (url: string): Promise<any[]> => {
        const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!idMatch) throw new Error("URL de Google Sheets inválida.");
        const sheetId = idMatch[1];
        const gidMatch = url.match(/gid=(\d+)/);
        const gid = gidMatch ? gidMatch[1] : '0';
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
        
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error(`Error obteniendo Google Sheet: ${response.statusText}`);
        const csvText = await response.text();

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: 'greedy',
                complete: (results: ParseResult<any>) => {
                    if (results.errors.length) {
                        const errorMsg = results.errors.map(e => e.message).join(', ');
                        console.error("Error de parseo Papaparse:", errorMsg);
                        return reject(new Error(errorMsg));
                    }
                     const cleanedData = results.data.map(row => {
                        const cleanedRow: { [key: string]: any } = {};
                        for (const key in row) {
                            if (Object.prototype.hasOwnProperty.call(row, key)) {
                                cleanedRow[key.trim()] = row[key];
                            }
                        }
                        return cleanedRow;
                    });
                    resolve(cleanedData);
                },
                error: (error: Error) => {
                    console.error("Error en Papaparse:", error.message);
                    reject(new Error(`Error parseando CSV: ${error.message}`))
                }
            });
        });
    }, []);

    useEffect(() => {
        if (!isClient) return;
        
        const fetchPrestadores = async () => {
            setLoadingPrestadores(true);
            toast({ title: "Cargando lista de prestadores..." });
            try {
                const data = await fetchAndParseSheetData(PRESTADORES_SHEET_URL);
                const typedData = data.map(item => item as Prestador).filter(p => p.PRESTADOR && p.PRESTADOR.trim() !== '');
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
    }, [isClient, toast, fetchAndParseSheetData]);
    
    const calculateSummary = useCallback((data: PgpRow[]): SummaryData | null => {
        if (data.length === 0) return null;
        const totalCostoMes = data.reduce((acc, row) => acc + (Number(row['COSTO EVENTO MES (VALOR MES)']) || 0), 0);
        const totalMinimoMes = data.reduce((acc, row) => acc + (Number(row['VALOR MINIMO MES']) || 0), 0);
        const totalMaximoMes = data.reduce((acc, row) => acc + (Number(row['VALOR MAXIMO MES']) || 0), 0);
        return {
            totalCostoMes,
            lowerBound: totalCostoMes * 0.9,
            upperBound: totalCostoMes * 1.1,
            totalAnual: totalCostoMes * 12,
            totalMinimoAnual: totalMinimoMes * 12,
            totalMaximoAnual: totalMaximoMes * 12,
        };
    }, []);

    const handleSelectPrestador = async (prestador: Prestador) => {
        setSelectedPrestador(prestador);
        setLoading(true);
        setLoadingAnalysis(true);
        setIsDataLoaded(false);
        setSearchValue('');
        setSearchPerformed(false);
        setResults([]);
        setGlobalSummary(null);
        setAnalysis(null);
        toast({ title: `Cargando Nota Técnica: ${prestador.PRESTADOR}...`, description: "Espere un momento, por favor." });
        
        try {
            if (!prestador.WEB || prestador.WEB.trim() === '') {
                throw new Error("La URL de la nota técnica no está definida para este prestador.");
            }
            const data = await fetchAndParseSheetData(prestador.WEB);
            const numericKeys: (keyof PgpRow)[] = [
                'FRECUENCIA AÑO SERVICIO', 'FRECUENCIA USO', 'FRECUENCIA EVENTOS MES',
                'COSTO EVENTO MES', 'FRECUENCIA EVENTO DIA', 'FRECUENCIA MINIMA MES',
                'FRECUENCIA MAXIMA MES', 'VALOR UNITARIO', 'COSTO EVENTO DIA',
                'VALOR MINIMO MES', 'VALOR MAXIMO MES', 'COSTO EVENTO MES (VALOR MES)'
            ];

            const pgpRows = data.map(row => {
                const newRow: Partial<PgpRow> = {};
                 for (const key in row) {
                    const trimmedKey = key.trim() as keyof PgpRow;
                    const value = (row[key] || '').trim();
                    if (trimmedKey) {
                        // Use a flexible check for numeric keys
                        if (numericKeys.some(nk => (nk as string).toUpperCase() === trimmedKey.toUpperCase())) {
                           (newRow as any)[trimmedKey] = parseFloat(value.replace(/[$\s,]/g, '')) || 0;
                        } else {
                            (newRow as any)[trimmedKey] = value;
                        }
                    }
                }
                // Rename CUPS column for consistency
                if (newRow['CUPS']) {
                    newRow['CUP/CUM'] = newRow['CUPS'];
                }
                return newRow as PgpRow;
            }).filter(item => item['CUP/CUM']);

            setPgpData(pgpRows);
            setGlobalSummary(calculateSummary(pgpRows));
            setIsDataLoaded(true);
            toast({ title: "Datos PGP Cargados", description: `Se cargaron ${pgpRows.length} registros para ${prestador.PRESTADOR}.` });

            // Fire off AI analysis
            try {
                const analysisResult = await analyzePgpData(pgpRows.slice(0, 20)); // Analyze first 20 rows
                setAnalysis(analysisResult);
            } catch (aiError: any) {
                 toast({ title: "Error en el Análisis de IA", description: aiError.message, variant: "destructive" });
                 setAnalysis(null);
            }


        } catch (error: any) {
            toast({ title: "Error al Cargar Datos de la Nota Técnica", description: error.message, variant: "destructive" });
            setSelectedPrestador(null);
        } finally {
            setLoading(false);
            setLoadingAnalysis(false);
        }
    };

    const handleSearch = () => {
        if (!isDataLoaded) {
            toast({ title: "Datos no Cargados", description: "Seleccione un prestador para cargar su nota técnica primero.", variant: "default" });
            return;
        }
        if (!searchValue.trim()) {
            setSearchPerformed(false);
            setResults([]);
            toast({ title: "Búsqueda Borrada", description: "Mostrando todos los datos." });
            return;
        }
        setLoading(true);
        setSearchPerformed(true);

        const searchTerm = searchValue.toLowerCase().trim();
        const filteredResults = pgpData.filter(item => {
            const cups = String(item['CUP/CUM'] || '').toLowerCase();
            const descripcion = String(item['DESCRIPCION CUPS'] || '').toLowerCase();
            return cups.includes(searchTerm) || descripcion.includes(searchTerm);
        });

        setResults(filteredResults);
        setLoading(false);
        toast({ title: "Búsqueda Realizada", description: `Se encontraron ${filteredResults.length} resultados.` });
    };

    const searchSummaryData: SummaryData | null = useMemo(() => {
        if (!searchPerformed) return null;
        return calculateSummary(results);
    }, [results, searchPerformed, calculateSummary]);
    
    const renderDetailCard = (row: PgpRow) => (
        <Card className="my-4 shadow-md">
            <CardHeader>
                <CardTitle className="text-lg text-primary">{row['DESCRIPCION CUPS']}</CardTitle>
                <CardDescription>CUP/CUM: {row['CUP/CUM']}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                    <div className="space-y-1"><Label>Subcategoría</Label><p className="text-muted-foreground">{row.SUBCATEGORIA}</p></div>
                    <div className="space-y-1"><Label>Ámbito</Label><p className="text-muted-foreground">{row.AMBITO}</p></div>
                    <div className="space-y-1"><Label>ID Resolución 3100</Label><p className="text-muted-foreground">{row['ID RESOLUCION 3100']}</p></div>
                    <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-3"><Label>Desc. Resolución</Label><p className="text-muted-foreground">{row['DESCRIPCION ID RESOLUCION']}</p></div>
                    <Separator className="col-span-1 md:col-span-2 lg:col-span-3" />
                     <div className="space-y-1"><Label>Frecuencia Año</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA AÑO SERVICIO'])}</p></div>
                    <div className="space-y-1"><Label>Frec. Uso</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA USO'])}</p></div>
                    <div className="space-y-1"><Label>Frec. Eventos Mes</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA EVENTOS MES'])}</p></div>
                    <div className="space-y-1"><Label>Frec. Mínima Mes</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA MINIMA MES'])}</p></div>
                    <div className="space-y-1"><Label>Frec. Máxima Mes</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA MAXIMA MES'])}</p></div>
                    <div className="space-y-1"><Label>Frec. Evento Día</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA EVENTO DIA'])}</p></div>
                    <Separator className="col-span-1 md:col-span-2 lg:col-span-3" />
                    <div className="space-y-1"><Label>Valor Unitario</Label><p className="font-semibold text-green-700">{formatCurrency(row['VALOR UNITARIO'])}</p></div>
                    <div className="space-y-1"><Label>Costo Evento Día</Label><p className="font-semibold text-green-700">{formatCurrency(row['COSTO EVENTO DIA'])}</p></div>
                    <div className="space-y-1"><Label>Costo Evento Mes</Label><p className="font-semibold text-blue-700">{formatCurrency(row['COSTO EVENTO MES'])}</p></div>
                    <div className="space-y-1"><Label>Valor Mínimo Mes</Label><p className="font-semibold text-blue-700">{formatCurrency(row['VALOR MINIMO MES'])}</p></div>
                    <div className="space-y-1"><Label>Valor Máximo Mes</Label><p className="font-semibold text-blue-700">{formatCurrency(row['VALOR MAXIMO MES'])}</p></div>
                    <Separator className="col-span-1 md:col-span-2 lg:col-span-3" />
                    <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-3"><Label>Observaciones</Label><p className="text-muted-foreground whitespace-pre-wrap">{row.OBSERVACIONES}</p></div>
                </div>
            </CardContent>
        </Card>
    );

    if (!isClient) {
        return (
            <div className="flex items-center justify-center py-6">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                <p>Cargando buscador...</p>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Buscador PGP por Nota Técnica</CardTitle>
                <CardDescription>Selecciona un prestador para cargar su nota técnica, analizarla con IA y realizar búsquedas.</CardDescription>
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
                
                {loading && (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        <p>Cargando datos de la nota técnica...</p>
                    </div>
                )}
                
                {isDataLoaded && (
                    <div className="space-y-6">
                        <AnalysisCard analysis={analysis} isLoading={loadingAnalysis} />
                        {globalSummary && (
                           <SummaryCard 
                                summary={globalSummary} 
                                title={`Resumen Global: Nota Técnica de ${selectedPrestador?.PRESTADOR}`}
                                description="Cálculos basados en la totalidad de los datos cargados."
                           />
                        )}
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TableIcon className="h-5 w-5" />
                                    Vista Previa de Datos (Primeros 20 Registros)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px] w-full">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>CUPS</TableHead>
                                                <TableHead>Descripción</TableHead>
                                                <TableHead>Costo Evento Mes</TableHead>
                                                <TableHead>Valor Mínimo Mes</TableHead>
                                                <TableHead>Valor Máximo Mes</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pgpData.slice(0, 20).map((row, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{row['CUP/CUM']}</TableCell>
                                                    <TableCell>{row['DESCRIPCION CUPS']}</TableCell>
                                                    <TableCell>{formatCurrency(row['COSTO EVENTO MES'])}</TableCell>
                                                    <TableCell>{formatCurrency(row['VALOR MINIMO MES'])}</TableCell>
                                                    <TableCell>{formatCurrency(row['VALOR MAXIMO MES'])}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Buscar por CUP/CUM o descripción..." className="flex-grow" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                            <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
                                <Search className="mr-2 h-4 w-4" /> Buscar
                            </Button>
                        </div>
                    </div>
                )}

                {searchPerformed && !loading && (
                     <div className="mt-6">
                        <Badge variant="secondary" className="text-sm mb-4">
                            Se encontraron {results.length} resultados para "{searchValue}".
                        </Badge>
                        
                        {searchSummaryData && (
                            <SummaryCard 
                                summary={searchSummaryData} 
                                title="Resumen de Costos de Búsqueda"
                                description="Cálculos basados en los resultados de la búsqueda actual."
                            />
                        )}

                        {results.length > 0 ? (
                            <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                               {results.map((item, index) => <div key={`${item['CUP/CUM']}-${index}`}>{renderDetailCard(item)}</div>)}
                            </ScrollArea>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <Info className="mx-auto h-12 w-12 mb-2"/>
                                No se encontraron resultados para los criterios de búsqueda.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default PgPsearchForm;

    