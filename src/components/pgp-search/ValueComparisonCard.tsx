
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, BarChart2 } from "lucide-react";
import type { ValueComparisonItem } from "./PgPsearchForm";
import { formatCurrency } from './PgPsearchForm';


interface ValueComparisonCardProps {
    expectedValue: number;
    executedValue: number;
    comparisonData: ValueComparisonItem[];
}

const ValueComparisonCard: React.FC<ValueComparisonCardProps> = ({ expectedValue, executedValue, comparisonData }) => {
    if (comparisonData.length === 0) {
        return null; // Don't render the card if there's no data to show
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                         <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">Valor Total Esperado</h3>
                         <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{formatCurrency(expectedValue)}</p>
                         <p className="text-xs text-muted-foreground">Basado en Nota Técnica</p>
                    </div>
                     <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <h3 className="text-sm font-medium text-green-600 dark:text-green-400">Valor Total Ejecutado</h3>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-300">{formatCurrency(executedValue)}</p>
                        <p className="text-xs text-muted-foreground">Basado en Archivos JSON</p>
                    </div>
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
                                            <TableHead className="text-right">Valor Ejecutado</TableHead>
                                            <TableHead className="text-right">Diferencia</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {comparisonData.map((item, index) => (
                                            <TableRow key={`${item.cup}-${index}`}>
                                                <TableCell className="font-mono">{item.cup}</TableCell>
                                                <TableCell>{item.description}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.unitValue)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.expectedValue)}</TableCell>
                                                <TableCell className="text-right font-semibold">{formatCurrency(item.executedValue)}</TableCell>
                                                <TableCell className={`text-right font-bold ${item.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {formatCurrency(item.difference)}
                                                </TableCell>
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
