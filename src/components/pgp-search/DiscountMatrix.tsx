
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, DollarSign } from "lucide-react";
import { Button } from '@/components/ui/button';
import { formatCurrency } from './PgPsearchForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

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
    const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
    const [adjustedValues, setAdjustedValues] = useState<Record<string, number>>({});
    const [adjustedQuantities, setAdjustedQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        const initialSelections: Record<string, boolean> = {};
        const initialValues: Record<string, number> = {};
        const initialQuantities: Record<string, number> = {};
        
        data.forEach(row => {
            const valorReconocerInicial = row.Clasificacion === 'Sobre-ejecutado' ? row.Valor_a_Reconocer : row.Valor_Ejecutado;
            const valorDescontarInicial = row.Valor_Ejecutado - valorReconocerInicial;

            initialSelections[row.CUPS] = true;
            initialQuantities[row.CUPS] = row.Cantidad_Ejecutada;
            initialValues[row.CUPS] = valorDescontarInicial;
        });

        setSelectedRows(initialSelections);
        setAdjustedQuantities(initialQuantities);
        setAdjustedValues(initialValues);
    }, [data]);

    const handleSelectAll = (checked: boolean) => {
        const newSelections: Record<string, boolean> = {};
        data.forEach(row => {
            newSelections[row.CUPS] = checked;
        });
        setSelectedRows(newSelections);
    };

    const handleSelectRow = (cup: string, checked: boolean) => {
        setSelectedRows(prev => ({ ...prev, [cup]: checked }));
    };
    
    const handleDiscountValueChange = (cup: string, value: string) => {
        const numericValue = parseFloat(value.replace(/[^0-9.-]+/g,"")) || 0;
        setAdjustedValues(prev => ({...prev, [cup]: numericValue }));
    };

    const handleQuantityChange = (cup: string, value: string) => {
        const numericValue = parseInt(value.replace(/[^0-9]+/g,""), 10) || 0;
        setAdjustedQuantities(prev => ({ ...prev, [cup]: numericValue }));

        // Recalculate 'Valor a Descontar' when quantity changes
        const rowData = data.find(r => r.CUPS === cup);
        if (rowData) {
            const nuevoValorReconocer = numericValue * rowData.Valor_Unitario;
            const nuevoValorADescontar = rowData.Valor_Ejecutado - nuevoValorReconocer;
            setAdjustedValues(prev => ({...prev, [cup]: nuevoValorADescontar}));
        }
    };


    const totalDescuentoAplicado = useMemo(() => {
        return Object.entries(selectedRows).reduce((sum, [cup, isSelected]) => {
            if (isSelected) {
                return sum + (adjustedValues[cup] || 0);
            }
            return sum;
        }, 0);
    }, [selectedRows, adjustedValues]);


    const allSelected = useMemo(() => data.every(row => selectedRows[row.CUPS]), [data, selectedRows]);
    
    if (!data || data.length === 0) {
        return null;
    }

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
                    <TableHead className="w-12">
                        <Checkbox 
                            checked={allSelected} 
                            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                            aria-label="Seleccionar todo"
                        />
                    </TableHead>
                    <TableHead>CUPS</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Cant. Ejecutada</TableHead>
                    <TableHead className="text-center w-32">Cant. Validada</TableHead>
                    <TableHead className="text-right">Valor Ejecutado</TableHead>
                    <TableHead className="text-right">Valor a Reconocer</TableHead>
                    <TableHead className="text-right text-red-500 font-bold w-48">Valor a Descontar</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tableData.map((row, index) => {
                    const validatedQuantity = adjustedQuantities[row.CUPS] ?? row.Cantidad_Ejecutada;
                    const recalculatedValorReconocer = validatedQuantity * row.Valor_Unitario;
                    
                    return (
                        <TableRow key={index} className={getRowClass(row.Clasificacion)}>
                            <TableCell>
                               <Checkbox 
                                    checked={selectedRows[row.CUPS] || false}
                                    onCheckedChange={(checked) => handleSelectRow(row.CUPS, Boolean(checked))}
                               />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{row.CUPS}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{row.Descripcion}</TableCell>
                            <TableCell className="text-center">{row.Cantidad_Ejecutada}</TableCell>
                             <TableCell className="text-center">
                                <Input
                                    type="text"
                                    value={new Intl.NumberFormat('es-CO').format(validatedQuantity)}
                                    onChange={(e) => handleQuantityChange(row.CUPS, e.target.value)}
                                    className="h-8 text-center border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(row.Valor_Ejecutado)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(recalculatedValorReconocer)}</TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                                 <Input
                                    type="text"
                                    value={new Intl.NumberFormat('es-CO').format(adjustedValues[row.CUPS] || 0)}
                                    onChange={(e) => handleDiscountValueChange(row.CUPS, e.target.value)}
                                    className="h-8 text-right border-red-200 focus:border-red-500 focus:ring-red-500"
                                />
                            </TableCell>
                        </TableRow>
                    )
                })}
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
                               Análisis financiero interactivo para calcular los descuentos por sobre-ejecución e imprevistos.
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Descuento Total APLICADO</p>
                            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalDescuentoAplicado)}</p>
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
                            <span className="text-muted-foreground">Descuento Total APLICADO: </span>
                            <span className="font-bold text-red-500">{formatCurrency(totalDescuentoAplicado)}</span>
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
                            onClick={() => handleDownloadXls(data.map(r => ({
                                ...r, 
                                Cantidad_Validada: adjustedQuantities[r.CUPS] ?? r.Cantidad_Ejecutada,
                                Valor_a_Reconocer_Ajustado: (adjustedQuantities[r.CUPS] ?? r.Cantidad_Ejecutada) * r.Valor_Unitario,
                                Valor_a_Descontar_Ajustado: adjustedValues[r.CUPS] || 0, 
                                Seleccionado: selectedRows[r.CUPS] || false 
                            })), 'matriz_descuentos_ajustada.xls')}
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
