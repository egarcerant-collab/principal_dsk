"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, Info, CheckCircle, DatabaseZap, Loader2, TrendingUp, TrendingDown, Target, FileText, Calendar, ChevronDown, Building } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import Papa, { type ParseResult } from 'papaparse';
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface PgpRow {
    'SUBCATEGORIA': string;
    'AMBITO': string;
    'ID RESOLUCION 3100': string;
    'DESCRIPCION ID RESOLUCION': string;
    'CUP/CUM': string;
    'DESCRIPCION CUPS': string;
    'FRECUENCIA AÑO SERVICIO': number;
    'FRECUENCIA ESTIMADA EN MESES CONTRATADOS': number;
    'FRECUENCIA USO': number;
    'COSTO EVENTO MES EN POBLACIÓN': number;
    'FRECUENCIA EVENTO DIA EN POBLACIÓN': number;
    'FRECUENCIA MINIMA': number;
    'FRECUENCIA MAXIMA': number;
    'VALOR UNITARIO DEL SERVICIO (CME)': number;
    'COSTO EVENTO DIA (VALOR DIA)': number;
    'VALOR MINIMO MES': number;
    'COSTO EVENTO MES (VALOR MES)': number;
    'VALOR MAXIMO MES': number;
    'OBSERVACIONES': string;
    [key: string]: any;
}


interface Prestador {
    NIT: string;
    PRESTADOR: string;
    'ID DE ZONA': string;
    WEB: string;
}

interface SummaryData {
  totalCostoMes: number;
  upperBound: number;
  lowerBound: number;
  totalAnual: number;
  totalMinimoAnual: number;
  totalMaximoAnual: number;
}

const PRESTADORES_SHEET_URL = "https://docs.google.com/spreadsheets/d/10Icu1DO4llbolO60VsdFcN5vxuYap1vBZs6foZ-XD04/gviz/tq?tqx=out:csv&sheet=Hoja1";

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

const PgPsearchForm: React.FC = () => {
    const [searchValue, setSearchValue] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingPrestadores, setLoadingPrestadores] = useState<boolean>(true);
    const [results, setResults] = useState<PgpRow[]>([]);
    const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
    const [pgpData, setPgpData] = useState<PgpRow[]>([]);
    const [prestadores, setPrestadores] = useState<Prestador[]>([]);
    const [selectedPrestador, setSelectedPrestador] = useState<Prestador | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
    const [globalSummary, setGlobalSummary] = useState<SummaryData | null>(null);
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;
        
        const fetchPrestadores = async () => {
            setLoadingPrestadores(true);
            toast({ title: "Cargando lista de prestadores..." });
            try {
                const response = await fetch(PRESTADORES_SHEET_URL);
                if (!response.ok) throw new Error('No se pudo cargar la lista de prestadores.');
                const csvText = await response.text();
                Papa.parse<Prestador>(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        setPrestadores(results.data.filter(p => p.PRESTADOR && p.PRESTADOR.trim() !== ''));
                        toast({ title: "Lista de prestadores cargada." });
                    },
                    error: (error: Error) => { throw error; }
                });
            } catch (error: any) {
                toast({ title: "Error al Cargar Prestadores", description: error.message, variant: "destructive" });
            } finally {
                setLoadingPrestadores(false);
            }
        };
        fetchPrestadores();
    }, [isClient, toast]);
    
    const calculateSummary = useCallback((data: PgpRow[]): SummaryData | null => {
        if (data.length === 0) return null;
        const totalCostoMes = data.reduce((acc, row) => acc + (row['COSTO EVENTO MES (VALOR MES)'] || 0), 0);
        const totalMinimoMes = data.reduce((acc, row) => acc + (row['VALOR MINIMO MES'] || 0), 0);
        const totalMaximoMes = data.reduce((acc, row) => acc + (row['VALOR MAXIMO MES'] || 0), 0);
        return {
            totalCostoMes,
            lowerBound: totalCostoMes * 0.9,
            upperBound: totalCostoMes * 1.1,
            totalAnual: totalCostoMes * 12,
            totalMinimoAnual: totalMinimoMes * 12,
            totalMaximoAnual: totalMaximoMes * 12,
        };
    }, []);

    const fetchAndParseSheetData = useCallback(async (url: string): Promise<PgpRow[]> => {
        const csvUrl = new URL(url.includes('/edit') ? url.replace(/\/edit.*$/, '/gviz/tq?tqx=out:csv') : url);
        if(!url.includes('tqx=out:csv')) {
            csvUrl.searchParams.set('tqx', 'out:csv');
        }
        
        const response = await fetch(csvUrl.toString());
        if (!response.ok) throw new Error(`Error obteniendo Google Sheet: ${response.statusText}`);
        const csvText = await response.text();

        return new Promise((resolve, reject) => {
            Papa.parse<Record<string, string>>(csvText, {
                header: true,
                skipEmptyLines: 'greedy',
                dynamicTyping: false,
                complete: (parsedResults: ParseResult<Record<string, string>>) => {
                    if (parsedResults.errors.length) console.warn("Errores de parseo:", parsedResults.errors);
                    
                    const data = parsedResults.data.map(row => {
                        const newRow: Partial<PgpRow> = {};
                        for (const key in row) {
                            const trimmedKey = key.trim() as keyof PgpRow;
                            const value = (row[key] || '').trim();
                            if (trimmedKey) {
                                const numericKeys: (keyof PgpRow)[] = [
                                    'FRECUENCIA AÑO SERVICIO', 'FRECUENCIA ESTIMADA EN MESES CONTRATADOS', 'FRECUENCIA USO',
                                    'COSTO EVENTO MES EN POBLACIÓN', 'FRECUENCIA EVENTO DIA EN POBLACIÓN', 'FRECUENCIA MINIMA',
                                    'FRECUENCIA MAXIMA', 'VALOR UNITARIO DEL SERVICIO (CME)', 'COSTO EVENTO DIA (VALOR DIA)',
                                    'VALOR MINIMO MES', 'COSTO EVENTO MES (VALOR MES)', 'VALOR MAXIMO MES'
                                ];
                                if (numericKeys.includes(trimmedKey)) {
                                    (newRow as any)[trimmedKey] = parseFloat(value.replace(/[$.]/g, '').replace(',', '.')) || 0;
                                } else {
                                    (newRow as any)[trimmedKey] = value;
                                }
                            }
                        }
                        return newRow as PgpRow;
                    }).filter(item => item['CUP/CUM']);
                    resolve(data);
                },
                error: (error: Error) => reject(new Error(`Error parseando CSV: ${error.message}`))
            });
        });
    }, []);

    const handleSelectPrestador = async (prestador: Prestador) => {
        setSelectedPrestador(prestador);
        setLoading(true);
        setIsDataLoaded(false);
        setSearchValue('');
        setSearchPerformed(false);
        setResults([]);
        setGlobalSummary(null);
        toast({ title: `Cargando Nota Técnica: ${prestador.PRESTADOR}...`, description: "Espere un momento, por favor." });
        
        try {
            if (!prestador.WEB || prestador.WEB.trim() === '') {
                throw new Error("La URL de la nota técnica no está definida para este prestador.");
            }
            const data = await fetchAndParseSheetData(prestador.WEB);
            setPgpData(data);
            setGlobalSummary(calculateSummary(data));
            setIsDataLoaded(true);
            toast({ title: "Datos PGP Cargados", description: `Se cargaron ${data.length} registros para ${prestador.PRESTADOR}.` });
        } catch (error: any) {
            toast({ title: "Error al Cargar Datos de la Nota Técnica", description: error.message, variant: "destructive" });
            setSelectedPrestador(null);
        } finally {
            setLoading(false);
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
                    <div className="space-y-1"><Label>Frec. Meses Contratados</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA ESTIMADA EN MESES CONTRATADOS'])}</p></div>
                    <div className="space-y-1"><Label>Frecuencia Uso</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA USO'])}</p></div>
                    <div className="space-y-1"><Label>Frec. Mínima</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA MINIMA'])}</p></div>
                    <div className="space-y-1"><Label>Frec. Máxima</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA MAXIMA'])}</p></div>
                    <div className="space-y-1"><Label>Frec. Evento Día Población</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA EVENTO DIA EN POBLACIÓN'])}</p></div>
                    <Separator className="col-span-1 md:col-span-2 lg:col-span-3" />
                    <div className="space-y-1"><Label>Valor Unitario (CME)</Label><p className="font-semibold text-green-700">{formatCurrency(row['VALOR UNITARIO DEL SERVICIO (CME)'])}</p></div>
                    <div className="space-y-1"><Label>Costo Evento Mes Población</Label><p className="font-semibold text-green-700">{formatCurrency(row['COSTO EVENTO MES EN POBLACIÓN'])}</p></div>
                    <div className="space-y-1"><Label>Costo Evento Día (Valor Día)</Label><p className="font-semibold text-green-700">{formatCurrency(row['COSTO EVENTO DIA (VALOR DIA)'])}</p></div>
                    <div className="space-y-1"><Label>Valor Mínimo Mes</Label><p className="font-semibold text-blue-700">{formatCurrency(row['VALOR MINIMO MES'])}</p></div>
                    <div className="space-y-1"><Label>Costo Evento Mes (Valor Mes)</Label><p className="font-semibold text-blue-700">{formatCurrency(row['COSTO EVENTO MES (VALOR MES)'])}</p></div>
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
                <CardDescription>Selecciona un prestador para cargar su nota técnica y realizar búsquedas.</CardDescription>
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
                    <DropdownMenuContent className="w-full md:w-[300px]">
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
                    <>
                        {globalSummary && (
                           <SummaryCard 
                                summary={globalSummary} 
                                title={`Resumen Global: Nota Técnica de ${selectedPrestador?.PRESTADOR}`}
                                description="Cálculos basados en la totalidad de los datos cargados."
                           />
                        )}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Buscar por CUP/CUM o descripción..." className="flex-grow" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                            <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
                                <Search className="mr-2 h-4 w-4" /> Buscar
                            </Button>
                        </div>
                    </>
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

    