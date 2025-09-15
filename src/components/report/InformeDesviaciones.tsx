
"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, AlertTriangle, Search, Info, Download, Loader2, TableIcon } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { findColumnValue, formatCurrency, type ComparisonSummary } from '../pgp-search/PgPsearchForm';
import type { DeviatedCupInfo, MatrixRow } from '../pgp-search/PgPsearchForm';
import type { CupDescription } from '@/ai/flows/describe-cup-flow';
import { describeCup } from '@/ai/flows/describe-cup-flow';


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


const DeviatedCupsAccordion = ({ title, icon, data, badgeVariant, pgpData, onCupClick, onDownload }: {
    title: string;
    icon: React.ElementType;
    data: DeviatedCupInfo[];
    badgeVariant: "destructive" | "default";
    pgpData: any[];
    onCupClick: (cup: string) => void;
    onDownload: (data: any[], filename: string) => void;
}) => {
    const Icon = icon;
    if (!data || data.length === 0) {
        return (
             <Card className="bg-gray-50 dark:bg-gray-800/20">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div className='flex items-center'>
                        <Icon className="h-6 w-6 mr-3 text-muted-foreground" />
                        <CardTitle className="text-base font-medium">{title}</CardTitle>
                    </div>
                    <Badge variant="secondary">0</Badge>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Accordion type="single" collapsible className="w-full border rounded-lg">
            <AccordionItem value="item-1" className="border-0">
                 <div className="flex items-center justify-between p-4">
                    <AccordionTrigger className="p-0 flex-1 hover:no-underline">
                        <div className="flex items-center">
                            <Icon className={`h-6 w-6 mr-3 ${badgeVariant === 'destructive' ? 'text-red-500' : 'text-blue-500'}`} />
                            <h3 className="text-base font-medium text-left">{title}</h3>
                        </div>
                    </AccordionTrigger>
                    <div className='flex items-center gap-4 pl-4'>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                const downloadData = data.map(item => ({
                                    ...item,
                                    deviation: item.deviation.toFixed(0) // Ensure deviation is formatted
                                }));
                                onDownload(downloadData, `${title.toLowerCase().replace(/ /g, '_')}.xls`);
                            }}
                            className="h-7 w-7"
                            aria-label={`Descargar ${title}`}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Badge variant={badgeVariant}>{data.length}</Badge>
                    </div>
                </div>
                <AccordionContent className="px-4 pb-4">
                    <ScrollArea className="h-72">
                        <Table>
                             <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                                <TableRow>
                                    <TableHead>CUPS</TableHead>
                                    <TableHead>Actividad</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-center">Frec. Esperada</TableHead>
                                    <TableHead className="text-center">Frec. Real</TableHead>
                                    <TableHead className="text-center">Desviación</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(({ cup, description, activityDescription, expectedFrequency, realFrequency, deviation }) => (
                                    <TableRow key={cup}>
                                        <TableCell>
                                             <Button variant="link" className="p-0 h-auto font-mono text-xs" onClick={() => onCupClick(cup)}>
                                                {cup}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-xs">{activityDescription}</TableCell>
                                        <TableCell className="text-xs">{description}</TableCell>
                                        <TableCell className="text-center">{expectedFrequency.toFixed(0)}</TableCell>
                                        <TableCell className="text-center">{realFrequency}</TableCell>
                                        <TableCell className={`text-center font-bold ${deviation > 0 ? 'text-red-600' : 'text-green-700'}`}>
                                            {deviation.toFixed(0)}
                                        </TableCell>
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


const DiscrepancyAccordion = ({ title, icon, data, badgeVariant, onLookupClick, onDownload, emptyText }: {
    title: string;
    icon: React.ElementType;
    data: any[];
    badgeVariant: "secondary" | "outline";
    onLookupClick?: (cup: string) => void;
    onDownload: (data: any[], filename: string) => void;
    emptyText: string;
}) => {
    const Icon = icon;
    if (!data || data.length === 0) {
        return (
             <Card className="bg-gray-50 dark:bg-gray-800/20">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                     <div className='flex items-center'>
                        <Icon className="h-6 w-6 mr-3 text-muted-foreground" />
                        <CardTitle className="text-base font-medium">{title}</CardTitle>
                    </div>
                    <Badge variant="secondary">0</Badge>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Accordion type="single" collapsible className="w-full border rounded-lg">
            <AccordionItem value="item-1" className="border-0">
                 <div className="flex items-center justify-between p-4">
                    <AccordionTrigger className="p-0 flex-1 hover:no-underline">
                        <div className="flex items-center">
                            <Icon className="h-6 w-6 mr-3 text-muted-foreground" />
                            <h3 className="text-base font-medium text-left">{title}</h3>
                        </div>
                    </AccordionTrigger>
                     <div className='flex items-center gap-4 pl-4'>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDownload(data, `${title.toLowerCase().replace(/ /g, '_')}.xls`);
                            }}
                            className="h-7 w-7"
                            aria-label={`Descargar ${title}`}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Badge variant={badgeVariant}>{data.length}</Badge>
                    </div>
                </div>
                <AccordionContent className="px-4 pb-4">
                    <ScrollArea className="h-72">
                        <Table>
                             <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                                <TableRow>
                                    <TableHead>CUPS</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-center">{title.includes("Faltantes") ? "Frec. Esperada" : "Frec. Real"}</TableHead>
                                     {onLookupClick && <TableHead className="text-center">Acción</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item) => (
                                    <TableRow key={item.cup}>
                                        <TableCell className="font-mono text-xs">{item.cup}</TableCell>
                                        <TableCell className="text-xs">{item.description || 'N/A'}</TableCell>
                                        <TableCell className="text-center">{title.includes("Faltantes") ? item.expectedFrequency : item.realFrequency}</TableCell>
                                         {onLookupClick && (
                                            <TableCell className="text-center">
                                                <Button variant="outline" size="sm" onClick={() => onLookupClick(item.cup)}>
                                                    <Search className="mr-2 h-4 w-4" /> Buscar
                                                </Button>
                                            </TableCell>
                                        )}
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


const CupDetailsModal = ({ cupData, open, onOpenChange }: { cupData: any | null, open: boolean, onOpenChange: (open: boolean) => void }) => {
    if (!cupData) return null;
    
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Detalles del CUPS: <span className="font-mono">{cupData['CUP/CUM']}</span></AlertDialogTitle>
                    <AlertDialogDescription>
                        {cupData['DESCRIPCION CUPS'] || "Información detallada de la nota técnica."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 <ScrollArea className="max-h-80 pr-6">
                    <div className="space-y-4 text-sm">
                        {Object.entries(cupData).map(([key, value]) => (
                            <div key={key} className="grid grid-cols-2 gap-2 border-b pb-2">
                                <dt className="font-semibold text-muted-foreground">{key}</dt>
                                <dd className="text-right">{typeof value === 'number' ? formatCurrency(value) : String(value)}</dd>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => onOpenChange(false)}>Cerrar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const LookedUpCupModal = ({ cupInfo, open, onOpenChange, isLoading }: { cupInfo: CupDescription | null, open: boolean, onOpenChange: (open: boolean) => void, isLoading: boolean }) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isLoading ? "Buscando información..." : `Resultado para: ${cupInfo?.cup}`}
          </AlertDialogTitle>
        </AlertDialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <AlertDialogDescription>
            {cupInfo?.description || "No se encontró una descripción para este código."}
          </AlertDialogDescription>
        )}
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>Cerrar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


export default function InformeDesviaciones({ comparisonSummary, pgpData }: {
    comparisonSummary: ComparisonSummary | null;
    pgpData: any[];
}) {
    const [selectedCupData, setSelectedCupData] = useState<any | null>(null);
    const [isCupModalOpen, setIsCupModalOpen] = useState(false);
    const [lookedUpCupInfo, setLookedUpCupInfo] = useState<CupDescription | null>(null);
    const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
    const [isLookupLoading, setIsLookupLoading] = useState(false);


    if (!comparisonSummary) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="uppercase">Análisis de Frecuencias y Desviaciones</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No hay datos de ejecución cargados para comparar.</p>
                </CardContent>
            </Card>
        )
    }

    const handleCupClick = (cup: string) => {
        const cupDetails = pgpData.find(row => findColumnValue(row, ['cup/cum', 'cups']) === cup);
        if (cupDetails) {
            setSelectedCupData(cupDetails);
            setIsCupModalOpen(true);
        }
    };
    
    const handleLookupClick = async (cup: string) => {
        setIsLookupLoading(true);
        setIsLookupModalOpen(true);
        try {
            const result = await describeCup(cup);
            setLookedUpCupInfo(result);
        } catch (error) {
            setLookedUpCupInfo({ cup, description: "Error al buscar la descripción." });
            console.error("Error looking up CUP:", error);
        } finally {
            setIsLookupLoading(false);
        }
    };


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="uppercase">Análisis de Frecuencias y Desviaciones</CardTitle>
                    <CardDescription>
                        Comparación entre la frecuencia de servicios esperada (nota técnica) y la real (archivos JSON).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <DeviatedCupsAccordion
                        title="CUPS Sobreejecutados (>111%)"
                        icon={TrendingUp}
                        data={comparisonSummary.overExecutedCups}
                        badgeVariant="destructive"
                        pgpData={pgpData}
                        onCupClick={handleCupClick}
                        onDownload={handleDownloadXls}
                    />
                    <DeviatedCupsAccordion
                        title="CUPS Subejecutados (<90%)"
                        icon={TrendingDown}
                        data={comparisonSummary.underExecutedCups}
                        badgeVariant="default"
                        pgpData={pgpData}
                        onCupClick={handleCupClick}
                        onDownload={handleDownloadXls}
                    />
                     <DiscrepancyAccordion
                        title="CUPS Faltantes"
                        icon={AlertTriangle}
                        data={comparisonSummary.missingCups}
                        badgeVariant="secondary"
                        onDownload={handleDownloadXls}
                        emptyText="No hay CUPS planificados que falten en la ejecución."
                    />
                     <DiscrepancyAccordion
                        title="CUPS Inesperados"
                        icon={Search}
                        data={comparisonSummary.unexpectedCups}
                        badgeVariant="outline"
                        onLookupClick={handleLookupClick}
                        onDownload={handleDownloadXls}
                        emptyText="No se encontraron CUPS ejecutados que no estuvieran en la nota técnica."
                    />
                </CardContent>
            </Card>

            <CupDetailsModal
                cupData={selectedCupData}
                open={isCupModalOpen}
                onOpenChange={setIsCupModalOpen}
            />
            
             <LookedUpCupModal
                cupInfo={lookedUpCupInfo}
                open={isLookupModalOpen}
                onOpenChange={setIsLookupModalOpen}
                isLoading={isLookupLoading}
            />
        </div>
    );
}
