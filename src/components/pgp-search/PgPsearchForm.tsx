
"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, Info, CheckCircle, DatabaseZap, Loader2 } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import Papa, { type ParseResult } from 'papaparse';
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";


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

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1Aajbs7d4dxfvd0Juxr6jrHobtQg1N4IA/edit?gid=895489820#gid=895489820";

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);
};

const PgPsearchForm: React.FC = () => {
    const [searchValue, setSearchValue] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [results, setResults] = useState<PgpRow[]>([]);
    const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
    const [pgpData, setPgpData] = useState<PgpRow[]>([]);
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
    const { toast } = useToast();

    const fetchAndParseSheetData = useCallback(async (url: string): Promise<PgpRow[]> => {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) throw new Error("URL de Google Sheets inválida.");

        const sheetId = match[1];
        const gidMatch = url.match(/gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : '0';
        const fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
        const response = await fetch(fetchUrl);
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
                                if (['FRECUENCIA AÑO SERVICIO', 'FRECUENCIA ESTIMADA EN MESES CONTRATADOS', 'FRECUENCIA USO', 'COSTO EVENTO MES EN POBLACIÓN', 'FRECUENCIA EVENTO DIA EN POBLACIÓN', 'FRECUENCIA MINIMA', 'FRECUENCIA MAXIMA', 'VALOR UNITARIO DEL SERVICIO (CME)', 'COSTO EVENTO DIA (VALOR DIA)', 'VALOR MINIMO MES', 'COSTO EVENTO MES (VALOR MES)', 'VALOR MAXIMO MES'].includes(trimmedKey)) {
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

    const handleLoadData = async () => {
        setLoading(true);
        toast({ title: "Accediendo a la Base de Datos PGP...", description: "Espere un momento, por favor." });
        try {
            const data = await fetchAndParseSheetData(GOOGLE_SHEET_URL);
            setPgpData(data);
            setIsDataLoaded(true);
            toast({ title: "Datos PGP Cargados", description: `Se cargaron ${data.length} registros.` });
        } catch (error: any) {
            toast({ title: "Error al Cargar Datos", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        if (!isDataLoaded) {
            toast({ title: "Datos no Cargados", description: "Cargue la base de datos PGP primero.", variant: "default" });
            return;
        }
        if (!searchValue.trim()) {
            toast({ title: "Valor Requerido", description: "Ingrese un valor para buscar.", variant: "destructive" });
            return;
        }
        setLoading(true);
        setSearchPerformed(true);

        const searchTerm = searchValue.toLowerCase().trim();
        const filteredResults = pgpData.filter(item => {
            const cupCum = String(item['CUP/CUM'] || '').toLowerCase();
            const descripcion = String(item['DESCRIPCION CUPS'] || '').toLowerCase();
            return cupCum.includes(searchTerm) || descripcion.includes(searchTerm);
        });

        setResults(filteredResults);
        setLoading(false);
        toast({ title: "Búsqueda Realizada", description: `Se encontraron ${filteredResults.length} resultados.` });
    };
    
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
                    <div className="space-y-1"><Label>Frecuencia Meses Contratados</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA ESTIMADA EN MESES CONTRATADOS'])}</p></div>
                    <div className="space-y-1"><Label>Frecuencia Uso</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA USO'])}</p></div>
                    <div className="space-y-1"><Label>Frecuencia Mínima</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA MINIMA'])}</p></div>
                    <div className="space-y-1"><Label>Frecuencia Máxima</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA MAXIMA'])}</p></div>
                     <div className="space-y-1"><Label>Frecuencia Evento Día Población</Label><p className="font-semibold">{formatNumber(row['FRECUENCIA EVENTO DIA EN POBLACIÓN'])}</p></div>
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Buscador PGP</CardTitle>
                <CardDescription>Carga la base de datos desde Google Sheets y realiza búsquedas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Button onClick={handleLoadData} disabled={loading || isDataLoaded} className={cn("w-full md:w-auto", isDataLoaded && "bg-green-600 hover:bg-green-700")}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isDataLoaded ? <CheckCircle className="mr-2 h-4 w-4"/> : <DatabaseZap className="mr-2 h-4 w-4" />}
                    {loading ? "Cargando..." : isDataLoaded ? "Base de Datos Cargada" : "Cargar Base de Datos PGP"}
                </Button>
                
                {isDataLoaded && (
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Buscar por CUP/CUM o descripción..." className="flex-grow" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                        <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
                            <Search className="mr-2 h-4 w-4" /> Buscar
                        </Button>
                    </div>
                )}

                {searchPerformed && !loading && (
                    <div className="mt-6">
                        <Badge variant="secondary" className="text-sm mb-4">
                            Se encontraron {results.length} resultados para "{searchValue}".
                        </Badge>
                        
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
