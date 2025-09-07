
"use client";

import React from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, TableIcon, Wallet, Landmark } from "lucide-react";
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

interface FinancialMatrixProps {
  matrixData: MatrixRow[];
  totalExpectedValue: number;
  totalExecutedValue: number;
}

const FinancialMatrix: React.FC<FinancialMatrixProps> = ({ matrixData, totalExpectedValue, totalExecutedValue }) => {
    if (!matrixData || matrixData.length === 0) {
        return null;
    }

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
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200">
                        <Landmark className="h-6 w-6 mx-auto text-blue-500 mb-1" />
                        <p className="text-sm text-muted-foreground">Valor Total Esperado (Período)</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalExpectedValue)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200">
                         <Wallet className="h-6 w-6 mx-auto text-green-500 mb-1" />
                        <p className="text-sm text-muted-foreground">Valor Total Ejecutado (Período)</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalExecutedValue)}</p>
                    </div>
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
                                        {matrixData.map((row, index) => (
                                            <TableRow key={index} className={getRowClass(row.Clasificacion)}>
                                                <TableCell className="text-xs">{row.Mes}</TableCell>
                                                <TableCell className="font-mono text-xs">{row.CUPS}</TableCell>
                                                <TableCell className="text-center">{row.Cantidad_Esperada}</TableCell>
                                                <TableCell className="text-center">{row.Cantidad_Ejecutada}</TableCell>
                                                <TableCell className="text-center font-semibold">{row.Diferencia}</TableCell>
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
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
};

export default FinancialMatrix;
