
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart2 } from "lucide-react";
import type { ValueComparisonItem } from "./PgPsearchForm";
import type { ExecutionDataByMonth } from "@/app/page";

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(value);
};

interface ValueComparisonCardProps {
    expectedValue: number;
    executedValueByMonth: Map<string, number>;
    comparisonData: ValueComparisonItem[];
    executionDataByMonth: ExecutionDataByMonth;
    monthNames: string[];
}

const getMonthName = (monthNumber: string) => {
    const date = new Date();
    date.setMonth(parseInt(monthNumber) - 1);
    const name = date.toLocaleString('es-CO', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
}

const ValueComparisonCard: React.FC<ValueComparisonCardProps> = ({ 
    expectedValue, 
    executedValueByMonth, 
    comparisonData,
    executionDataByMonth,
    monthNames
}) => {
    if (comparisonData.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Análisis de Valor (Esperado vs. Real)</CardTitle>
                <CardDescription>
                    Comparación del valor monetario de los servicios según la nota técnica (esperado) y los archivos JSON (ejecutado).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 lg:col-span-1">
                         <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">Valor Total Esperado (Mes)</h3>
                         <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{formatCurrency(expectedValue)}</p>
                         <p className="text-xs text-muted-foreground">Basado en Nota Técnica</p>
                    </div>
                    {[...executedValueByMonth.entries()].map(([month, value]) => (
                        <div key={month} className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <h3 className="text-sm font-medium text-green-600 dark:text-green-400">Valor Ejecutado ({getMonthName(month)})</h3>
                            <p className="text-2xl font-bold text-green-800 dark:text-green-300">{formatCurrency(value)}</p>
                            <p className="text-xs text-muted-foreground">Basado en Archivos JSON</p>
                        </div>
                    ))}
                </div>

                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="value-details">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2">
                                <BarChart2 className="h-5 w-5" />
                                <span>Ver Detalle de Valor por Servicio</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <ScrollArea className="h-[400px]">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead>CUPS / CUM</TableHead>
                                            <TableHead>Descripción</TableHead>
                                            <TableHead className="text-right">Valor Unit.</TableHead>
                                            <TableHead className="text-right">Valor Esperado</TableHead>
                                            {monthNames.map(monthName => (
                                                <TableHead key={monthName} className="text-right">Valor Ejec. ({monthName})</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {comparisonData.map((item, index) => (
                                            <TableRow key={`${item.cup}-${index}`}>
                                                <TableCell className="font-mono">{item.cup}</TableCell>
                                                <TableCell>{item.description}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.unitValue)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.expectedValue)}</TableCell>
                                                {[...executionDataByMonth.keys()].map(monthKey => {
                                                    const executedValue = item.executedValues.get(monthKey) || 0;
                                                    const difference = executedValue - item.expectedValue;
                                                    return (
                                                        <TableCell key={monthKey} className={`text-right font-semibold ${difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                          {formatCurrency(executedValue)}
                                                        </TableCell>
                                                    );
                                                })}
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

export default ValueComparisonCard;
