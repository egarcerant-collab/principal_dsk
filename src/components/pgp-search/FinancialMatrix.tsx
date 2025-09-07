
"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, TableIcon, Wallet, Landmark, Calendar, ChevronDown } from "lucide-react";
import { Button } from '@/components/ui/button';
import { formatCurrency, type MatrixRow } from './PgPsearchForm';

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

export interface MonthlyFinancialSummary {
    month: string;
    totalValorEsperado: number;
    totalValorEjecutado: number;
}

interface FinancialMatrixProps {
  matrixData: MatrixRow[];
  monthlyFinancials: MonthlyFinancialSummary[];
}

const FinancialMatrix: React.FC<FinancialMatrixProps> = ({ matrixData, monthlyFinancials }) => {
    const [showAll, setShowAll] = useState(false);
    
    if (!matrixData || matrixData.length === 0) {
        return null;
    }

    const visibleData = showAll ? matrixData : matrixData.slice(0, 10);

    const getRowClass = (classification: string) => {
        switch (classification) {
            case "Sobre-ejecutado": return "text-red-600";
            case "Sub-ejecutado": return "text-blue-600";
            case "Faltante": return "text-yellow-600";
            default: return "";
        }
    };

    return (
        <Card>
             <CardHeader>
                <CardTitle>Matriz Detallada: Ejecución vs. Esperado</CardTitle>
                <CardDescription>
                    Análisis detallado de la ejecución por cantidad y valor, mes a mes.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Monthly Summary Cards */}
                <div className="space-y-4">
                    {monthlyFinancials.map(summary => (
                         <div key={summary.month} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/20">
                            <h4 className="text-lg font-semibold mb-3 flex items-center">
                                <Calendar className="h-5 w-5 mr-2 text-muted-foreground"/>
                                {summary.month}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200">
                                    <Landmark className="h-6 w-6 mx-auto text-blue-500 mb-1" />
                                    <p className="text-sm text-muted-foreground">Valor Esperado</p>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(summary.totalValorEsperado)}</p>
                                </div>
                                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200">
                                    <Wallet className="h-6 w-6 mx-auto text-green-500 mb-1" />
                                    <p className="text-sm text-muted-foreground">Valor Ejecutado</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(summary.totalValorEjecutado)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>


                {/* Accordion for Detailed Table */}
                <Accordion type="single" collapsible className="w-full border rounded-lg" defaultValue='item-1'>
                    <AccordionItem value="item-1" className="border-0">
                         <div className="flex items-center justify-between p-4">
                            <AccordionTrigger className="p-0 flex-1 hover:no-underline">
                                <div className="flex items-center">
                                    <TableIcon className="h-6 w-6 mr-3 text-purple-600" />
                                    <h3 className="text-base font-medium text-left">Ver detalle completo de la matriz</h3>
                                </div>
                            </AccordionTrigger>
                            <div className='flex items-center gap-4 pl-4'>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadXls(matrixData, `matriz_ejecucion_vs_esperado.xls`);
                                    }}
                                    className="h-7 w-7"
                                    aria-label="Descargar Matriz"
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
                                            <TableHead className="text-center">Cant. Esperada</TableHead>
                                            <TableHead className="text-center">Cant. Ejecutada</TableHead>
                                            <TableHead className="text-center">Diferencia</TableHead>
                                            <TableHead className="text-center">% Ejecución</TableHead>
                                            <TableHead>Clasificación</TableHead>
                                            <TableHead className="text-right">V. Unitario</TableHead>
                                            <TableHead className="text-right">V. Esperado</TableHead>
                                            <TableHead className="text-right">V. Ejecutado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visibleData.map((row, index) => (
                                            <TableRow key={index} className={getRowClass(row.Clasificacion)}>
                                                <TableCell className="text-xs">{row.Mes}</TableCell>
                                                <TableCell className="font-mono text-xs">{row.CUPS}</TableCell>
                                                <TableCell className="text-center">{row.Cantidad_Esperada.toFixed(2)}</TableCell>
                                                <TableCell className="text-center">{row.Cantidad_Ejecutada}</TableCell>
                                                <TableCell className="text-center font-semibold">{row.Diferencia.toFixed(2)}</TableCell>
                                                <TableCell className="text-center">{row['%_Ejecucion']}</TableCell>
                                                <TableCell className="font-medium">{row.Clasificacion}</TableCell>
                                                <TableCell className="text-right text-xs">{formatCurrency(row.Valor_Unitario)}</TableCell>
                                                <TableCell className="text-right text-xs">{formatCurrency(row.Valor_Esperado)}</TableCell>
                                                <TableCell className="text-right text-xs font-bold">{formatCurrency(row.Valor_Ejecutado)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                             {matrixData.length > 10 && (
                                <div className="pt-4 text-center">
                                    <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                                        <ChevronDown className={`mr-2 h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                                        {showAll ? 'Ver menos' : `Ver más (${matrixData.length - 10} filas)`}
                                    </Button>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
};

export default FinancialMatrix;
