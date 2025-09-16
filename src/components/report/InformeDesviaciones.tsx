"use client";

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, AlertTriangle, Search, Info, Download, Loader2, TableIcon, X } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { findColumnValue, formatCurrency, type ComparisonSummary } from '../pgp-search/PgPsearchForm';
import type { DeviatedCupInfo, UnexpectedCupInfo, MatrixRow } from '../pgp-search/PgPsearchForm';
import type { CupDescription } from '@/ai/flows/describe-cup-flow';
import { describeCup } from '@/ai/flows/describe-cup-flow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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

    const csv = Papa.unparse(formattedData);
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


const DeviatedCupsAccordion = ({ title, icon, data, badgeVariant, pgpData, onCupClick, onDownload, onDoubleClick, totalDeviationValue }: {
    title: string;
    icon: React.ElementType;
    data: DeviatedCupInfo[];
    badgeVariant: "destructive" | "default";
    pgpData: any[];
    onCupClick: (cup: string) => void;
    onDownload: (data: any[], filename: string) => void;
    onDoubleClick: () => void;
    totalDeviationValue?: number;
}) => {
    const Icon = icon;
    const hasData = data && data.length > 0;
    const isOverExecuted = badgeVariant === 'destructive';

    return (
        <Card className="w-full cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={onDoubleClick}>
            <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${hasData ? (isOverExecuted ? 'text-red-500' : 'text-blue-500') : 'text-muted-foreground'}`} />
                    <CardTitle className="text-base font-medium">{title}</CardTitle>
                </div>
                <div className='flex items-center gap-4 pl-4'>
                    {totalDeviationValue !== undefined && hasData && (
                        <div className="text-right">
                             <p className={`text-sm font-bold ${isOverExecuted ? 'text-red-600' : 'text-blue-600'}`}>{formatCurrency(totalDeviationValue)}</p>
                             <p className="text-xs text-muted-foreground">Valor Desviación</p>
                        </div>
                    )}
                    {hasData && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                const downloadData = data.map(item => ({
                                    ...item,
                                    deviation: item.deviation,
                                    deviationValue: item.deviationValue
                                }));
                                onDownload(downloadData, `${title.toLowerCase().replace(/ /g, '_')}.xls`);
                            }}
                            className="h-7 w-7"
                            aria-label={`Descargar ${title}`}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    )}
                    <Badge variant={hasData ? badgeVariant : 'secondary'}>{data.length}</Badge>
                </div>
            </CardHeader>
        </Card>
    )
};


const DiscrepancyAccordion = ({ title, icon, data, badgeVariant, onLookupClick, onDownload, emptyText, onDoubleClick }: {
    title: string;
    icon: React.ElementType;
    data: any[];
    badgeVariant: "secondary" | "outline";
    onLookupClick?: (cup: string) => void;
    onDownload: (data: any[], filename: string) => void;
    emptyText: string;
    onDoubleClick: () => void;
}) => {
    const Icon = icon;
    const hasData = data && data.length > 0;

    return (
        <Card className="w-full cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={onDoubleClick}>
            <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                    <CardTitle className="text-base font-medium">{title}</CardTitle>
                </div>
                 <div className='flex items-center gap-4 pl-4'>
                    {hasData && (
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
                    )}
                    <Badge variant={hasData ? badgeVariant : 'secondary'}>{data.length}</Badge>
                </div>
            </CardHeader>
        </Card>
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

export const LookedUpCupModal = ({ cupInfo, open, onOpenChange, isLoading }: { cupInfo: CupDescription | null, open: boolean, onOpenChange: (open: boolean) => void, isLoading: boolean }) => {
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


const TableModal = ({ open, onOpenChange, title, content }: { open: boolean, onOpenChange: (open: boolean) => void, title: React.ReactNode, content: React.ReactNode }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-hidden">
          {content}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function InformeDesviaciones({ comparisonSummary, pgpData }: {
    comparisonSummary: ComparisonSummary | null;
    pgpData: any[];
}) {
    const [selectedCupData, setSelectedCupData] = useState<any | null>(null);
    const [isCupModalOpen, setIsCupModalOpen] = useState(false);
    const [lookedUpCupInfo, setLookedUpCupInfo] = useState<CupDescription | null>(null);
    const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
    const [isLookupLoading, setIsLookupLoading] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: React.ReactNode, data: any, type: string } | null>(null);


    const totalOverExecutionValue = useMemo(() => {
        if (!comparisonSummary || !comparisonSummary.overExecutedCups) return 0;
        return comparisonSummary.overExecutedCups.reduce((sum, cup) => sum + cup.deviationValue, 0);
    }, [comparisonSummary]);
    
    const totalUnderExecutionValue = useMemo(() => {
        if (!comparisonSummary || !comparisonSummary.underExecutedCups) return 0;
        return comparisonSummary.underExecutedCups.reduce((sum, cup) => sum + cup.deviationValue, 0);
    }, [comparisonSummary]);



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
        } else {
            handleLookupClick(cup);
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
    
    const handleDoubleClick = (type: string, title: React.ReactNode, data: any) => {
        setModalContent({ type, title, data });
    }
    
    const overExecutedTitle = (
        <div className="flex items-center justify-between w-full">
            <span>CUPS Sobreejecutados (&gt;111%)</span>
            {totalOverExecutionValue > 0 && (
                 <span className="text-red-500 font-bold ml-4">{formatCurrency(totalOverExecutionValue)}</span>
            )}
        </div>
    );
    
    const underExecutedTitle = (
        <div className="flex items-center justify-between w-full">
            <span>CUPS Subejecutados (&lt;90%)</span>
            {totalUnderExecutionValue < 0 && (
                 <span className="text-blue-500 font-bold ml-4">{formatCurrency(totalUnderExecutionValue)}</span>
            )}
        </div>
    );


    const renderModalContent = () => {
        if (!modalContent) return null;

        const { type, data } = modalContent;

        switch (type) {
            case 'over-executed':
            case 'under-executed':
                return (
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>CUPS</TableHead>
                                    <TableHead>Actividad</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-center">Frec. Esperada</TableHead>
                                    <TableHead className="text-center">Frec. Real</TableHead>
                                    <TableHead className="text-center">Desviación</TableHead>
                                    <TableHead className="text-right">Valor Desviación</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item: DeviatedCupInfo) => (
                                    <TableRow key={item.cup}>
                                        <TableCell>
                                             <Button variant="link" className="p-0 h-auto font-mono text-xs" onClick={() => handleCupClick(item.cup)}>
                                                {item.cup}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-xs">{item.activityDescription}</TableCell>
                                        <TableCell className="text-xs">{item.description}</TableCell>
                                        <TableCell className="text-center">{item.expectedFrequency.toFixed(0)}</TableCell>
                                        <TableCell className="text-center">{item.realFrequency}</TableCell>
                                        <TableCell className={`text-center font-bold ${item.deviation > 0 ? 'text-red-600' : 'text-blue-600'}`}>{item.deviation.toFixed(0)}</TableCell>
                                        <TableCell className={`text-right font-bold ${item.deviationValue > 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatCurrency(item.deviationValue)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )
             case 'missing':
                return (
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>CUPS</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-center">Frec. Esperada</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item: any) => (
                                    <TableRow key={item.cup}>
                                        <TableCell className="font-mono text-xs">{item.cup}</TableCell>
                                        <TableCell className="text-xs">{item.description || 'N/A'}</TableCell>
                                        <TableCell className="text-center">{item.expectedFrequency}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                 )
             case 'unexpected':
                 return (
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>CUPS</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-center">Frec. Real</TableHead>
                                    <TableHead className="text-right">Valor Ejecutado</TableHead>
                                    <TableHead className="text-center">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item: UnexpectedCupInfo) => (
                                    <TableRow key={item.cup}>
                                        <TableCell className="font-mono text-xs">{item.cup}</TableCell>
                                        <TableCell className="text-xs">N/A</TableCell>
                                        <TableCell className="text-center">{item.realFrequency}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(item.totalValue)}</TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="outline" size="sm" onClick={() => handleLookupClick(item.cup)}>
                                                <Search className="mr-2 h-4 w-4" /> Buscar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                 )
            default:
                return null;
        }
    }


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="uppercase">Análisis de Frecuencias y Desviaciones</CardTitle>
                    <CardDescription>
                        Comparación entre la frecuencia de servicios esperada (nota técnica) y la real (archivos JSON). Doble clic para expandir la tabla.
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
                        onDoubleClick={() => handleDoubleClick('over-executed', overExecutedTitle, comparisonSummary.overExecutedCups)}
                        totalDeviationValue={totalOverExecutionValue}
                    />
                    <DeviatedCupsAccordion
                        title="CUPS Subejecutados (<90%)"
                        icon={TrendingDown}
                        data={comparisonSummary.underExecutedCups}
                        badgeVariant="default"
                        pgpData={pgpData}
                        onCupClick={handleCupClick}
                        onDownload={handleDownloadXls}
                        onDoubleClick={() => handleDoubleClick('under-executed', underExecutedTitle, comparisonSummary.underExecutedCups)}
                        totalDeviationValue={totalUnderExecutionValue}
                    />
                     <DiscrepancyAccordion
                        title="CUPS Faltantes"
                        icon={AlertTriangle}
                        data={comparisonSummary.missingCups}
                        badgeVariant="secondary"
                        onDownload={handleDownloadXls}
                        emptyText="No hay CUPS planificados que falten en la ejecución."
                        onDoubleClick={() => handleDoubleClick('missing', 'CUPS Faltantes', comparisonSummary.missingCups)}
                    />
                     <DiscrepancyAccordion
                        title="CUPS Inesperados"
                        icon={Search}
                        data={comparisonSummary.unexpectedCups}
                        badgeVariant="outline"
                        onLookupClick={handleLookupClick}
                        onDownload={handleDownloadXls}
                        emptyText="No se encontraron CUPS ejecutados que no estuvieran en la nota técnica."
                        onDoubleClick={() => handleDoubleClick('unexpected', 'CUPS Inesperados', comparisonSummary.unexpectedCups)}
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

            {modalContent && (
                <TableModal
                    open={!!modalContent}
                    onOpenChange={() => setModalContent(null)}
                    title={modalContent.title}
                    content={renderModalContent()}
                />
            )}
        </div>
    );
}
    
