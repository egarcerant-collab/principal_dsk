
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { SummaryData } from "./PgPsearchForm";

interface FinancialSummaryMatrixProps {
    summary: SummaryData | null;
    executedValue: number;
    monthName: string;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(value);
};

const FinancialSummaryMatrix: React.FC<FinancialSummaryMatrixProps> = ({ summary, executedValue, monthName }) => {
    if (!summary) {
        return null;
    }

    const pgpMensual = summary.totalCostoMes;
    const totalEjecutado = executedValue;
    const diferencia = totalEjecutado - pgpMensual;
    const cumplimiento = pgpMensual > 0 ? (totalEjecutado / pgpMensual) : 0;

    const getComplianceBadge = (percentage: number) => {
        const p = percentage * 100;
        let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
        if (p > 105) variant = "destructive";
        else if (p >= 95 && p <= 105) variant = "default";

        return <Badge variant={variant}>{p.toFixed(2)}%</Badge>
    }

    const dataRows = [
        { concepto: "PGP MENSUAL", autorizado: pgpMensual, ejecutado: totalEjecutado, diferencia, cumplimiento},
        { concepto: "AJUSTES", autorizado: 0, ejecutado: 0, diferencia: 0, cumplimiento: 0},
        { concepto: "TOTAL PGP CON AJUSTES", autorizado: pgpMensual, ejecutado: totalEjecutado, diferencia, cumplimiento},
        { concepto: "FACTURACIÓN CAPITA", autorizado: 0, ejecutado: 0, diferencia: 0, cumplimiento: 0},
        { concepto: "FACTURACIÓN PAGOS INDIVIDUALES", autorizado: 0, ejecutado: 0, diferencia: 0, cumplimiento: 0},
        { concepto: "TOTAL FACTURADO", autorizado: pgpMensual, ejecutado: totalEjecutado, diferencia, cumplimiento},
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Matriz de Resumen Financiero (PGP) - {monthName}</CardTitle>
                <CardDescription>
                    Análisis consolidado del rendimiento financiero del contrato para el mes seleccionado.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-bold text-foreground">CONCEPTO</TableHead>
                            <TableHead className="text-right font-bold text-foreground">VALOR MENSUAL AUTORIZADO</TableHead>
                            <TableHead className="text-right font-bold text-foreground">EJECUCIÓN DEL MES</TableHead>
                            <TableHead className="text-right font-bold text-foreground">DIFERENCIA</TableHead>
                            <TableHead className="text-right font-bold text-foreground">% CUMPLIMIENTO</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dataRows.map(row => (
                            <TableRow key={row.concepto} className={["TOTAL PGP CON AJUSTES", "TOTAL FACTURADO"].includes(row.concepto) ? "font-bold bg-muted/50" : ""}>
                                <TableCell>{row.concepto}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.autorizado)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(row.ejecutado)}</TableCell>
                                <TableCell className={`text-right ${row.diferencia > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(row.diferencia)}</TableCell>
                                <TableCell className="text-right">
                                    {getComplianceBadge(row.cumplimiento)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default FinancialSummaryMatrix;
