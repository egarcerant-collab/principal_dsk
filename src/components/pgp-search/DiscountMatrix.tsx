
"use client";

import React, { useState }from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, DollarSign } from "lucide-react";
import { Button } from '@/components/ui/button';
import { formatCurrency } from './PgPsearchForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export interface DiscountMatrixRow {
    CUPS: string;
    Descripcion?: string;
    Cantidad_Ejecutada: number;
    Valor_Unitario: number;
    Valor_Ejecutado: number;
    Valor_a_Reconocer: number;
    Valor_a_Descontar: number;
    Clasificacion: string;
}

interface DiscountMatrixProps {
  data: DiscountMatrixRow[];
}


const handleDownloadXls = (data: any[], filename: string) => {
    const dataToExport = JSON.parse(JSON.stringify(data));
    const formattedData = dataToExport.map((row: any) => {
        for (const key in row) {
            if (typeof row[key] === 'number') {
                row[key] = row[key].toString().replace('.', ',');
            }
        }
        return row;
    });
    const csv = Papa.unparse(formattedData, { delimiter: ";" });
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const DiscountMatrix: React.FC<DiscountMatrixProps> = ({ data }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    if (!data || data.length === 0) {
        return null;
    }

    const totalDescuento = data.reduce((sum, row) => sum + row.Valor_a_Descontar, 0);

    const getRowClass = (classification: string) => {
        switch (classification) {
            case "Sobre-ejecutado": return "text-red-600";
            case "Sub-ejecutado": return "text-blue-600";
            case "Inesperado": return "text-purple-600";
            default: return "";
        }
    };
    
    const renderTable = (tableData: DiscountMatrixRow[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>CUPS</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Cant. Ejecutada</TableHead>
                    <TableHead className="text-right">Valor Unitario (NT)</TableHead>
                    <TableHead className="text-right">Valor Ejecutado</TableHead>
                    <TableHead className="text-right">Valor a Reconocer</TableHead>
                    <TableHead className="text-right text-red-500 font-bold">Valor a Descontar</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tableData.map((row, index) => (
                    <TableRow key={index} className={getRowClass(row.Clasificacion)}>
                        <TableCell className="font-mono text-xs">{row.CUPS}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{row.Descripcion}</TableCell>
                        <TableCell className="text-center">{row.Cantidad_Ejecutada}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatCurrency(row.Valor_Unitario)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.Valor_Ejecutado)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(row.Valor_a_Reconocer)}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{formatCurrency(row.Valor_a_Descontar)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <>
            <Card onDoubleClick={() => setIsModalOpen(true)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center">
                                <DollarSign className="h-6 w-6 mr-3 text-red-500" />
                                Matriz de Descuentos (Análisis de Valor)
                            </CardTitle>
                            <CardDescription>
                               Análisis financiero enfocado en los valores a descontar por sobre-ejecución e imprevistos.
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Descuento Total Sugerido</p>
                            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalDescuento)}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                        {renderTable(data)}
                    </ScrollArea>
                </CardContent>
            </Card>
            
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Matriz de Descuentos (Análisis de Valor)</DialogTitle>
                         <div className="text-right text-lg">
                            <span className="text-muted-foreground">Descuento Total Sugerido: </span>
                            <span className="font-bold text-red-500">{formatCurrency(totalDescuento)}</span>
                        </div>
                    </DialogHeader>
                    <div className="flex-grow overflow-hidden">
                        <ScrollArea className="h-full">
                           {renderTable(data)}
                        </ScrollArea>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="secondary"
                            onClick={() => handleDownloadXls(data, 'matriz_descuentos.xls')}
                        >
                            <FileDown className="mr-2 h-4 w-4" />
                            Descargar
                        </Button>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default DiscountMatrix;
