"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// === Tipos de datos de entrada ===
export type MonthInput = {
  monthName: string;
  pgpMensualAutorizado: number;
  ejecutadoMes: number;
  ajustes?: number;
};

export type ReportHeader = {
  empresa?: string;
  nit?: string;
  contrato?: string;
  periodo?: string;
};

interface QuarterlyFinancialReportProps {
  header: ReportHeader;
  months: MonthInput[];
}

// === Utilidades ===
const formatCOP = (value?: number | null) => {
  if (value === null || value === undefined || isNaN(value)) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const pctBadge = (ratio: number) => {
  const p = isFinite(ratio) ? ratio * 100 : 0;
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  if (p > 105) variant = "destructive";
  else if (p >= 95 && p <= 105) variant = "default";
  return <Badge variant={variant}>{p.toFixed(2)}%</Badge>;
};

// === Componente principal ===
const QuarterlyFinancialReport: React.FC<QuarterlyFinancialReportProps> = ({
  header,
  months,
}) => {
  if (!months || months.length === 0) return null;

  // Totales del trimestre
  const totalAutorizado = months.reduce((acc, m) => acc += (m.pgpMensualAutorizado ?? 0), 0);
  const totalEjecutado  = months.reduce((acc, m) => acc += (m.ejecutadoMes ?? 0), 0);
  const totalAjustes    = months.reduce((acc, m) => acc += (m.ajustes ?? 0), 0);
  const totalConAjustes = totalAutorizado + totalAjustes;

  const diferenciaTrimestre = totalEjecutado - totalAutorizado;
  const cumplimientoTrim    = totalAutorizado > 0 ? totalEjecutado / totalAutorizado : 0;

  // Banda de control 90–110% sobre el valor de 3 meses (como en el informe)
  const min90 = totalAutorizado * 0.90;
  const max110 = totalAutorizado * 1.10;


  // Filas tipo “Matriz” (similar a tu FinancialSummaryMatrix)
  const filas = [
    {
      concepto: "PGP MENSUAL (TRIMESTRE)",
      autorizado: totalAutorizado,
      ejecutado: totalEjecutado,
      diferencia: diferenciaTrimestre,
      cumplimiento: cumplimientoTrim
    },
    {
      concepto: "AJUSTES",
      autorizado: totalAjustes,
      ejecutado: 0,
      diferencia: totalAjustes,
      cumplimiento: 0
    },
    {
      concepto: "TOTAL PGP CON AJUSTES",
      autorizado: totalConAjustes,
      ejecutado: totalEjecutado,
      diferencia: totalEjecutado - totalConAjustes,
      cumplimiento: totalConAjustes > 0 ? totalEjecutado / totalConAjustes : 0
    },
    {
      concepto: "FACTURACIÓN CAPITA",
      autorizado: 0, ejecutado: 0, diferencia: 0, cumplimiento: 0
    },
    {
      concepto: "FACTURACIÓN PAGOS INDIVIDUALES",
      autorizado: 0, ejecutado: 0, diferencia: 0, cumplimiento: 0
    },
    {
      concepto: "TOTAL FACTURADO",
      autorizado: totalConAjustes,
      ejecutado: totalEjecutado,
      diferencia: totalEjecutado - totalConAjustes,
      cumplimiento: totalConAjustes > 0 ? totalEjecutado / totalConAjustes : 0
    },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado del informe */}
      <Card>
        <CardHeader>
          <CardTitle>INFORME DEL COMPONENTE DIRECCIÓN DEL RIESGO – CONTRATOS PGP</CardTitle>
          <CardDescription>
            {header?.empresa && (<span className="mr-2"><strong>EMPRESA:</strong> {header.empresa}</span>)}
            {header?.nit && (<span className="mr-2"><strong>NIT:</strong> {header.nit}</span>)}
            {header?.contrato && (<span className="mr-2"><strong>CONTRATO:</strong> {header.contrato}</span>)}
            {header?.periodo && (<span className="block"><strong>PERIODO EVALUADO:</strong> {header.periodo}</span>)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Resumen ejecutivo */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="text-sm text-muted-foreground">Valor {months.length} meses (PGP)</div>
              <div className="text-2xl font-semibold">{formatCOP(totalAutorizado)}</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="text-sm text-muted-foreground">Total ejecutado (periodo)</div>
              <div className="text-2xl font-semibold">{formatCOP(totalEjecutado)}</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="text-sm text-muted-foreground">% Cumplimiento</div>
              <div className="text-2xl font-semibold">{pctBadge(cumplimientoTrim)}</div>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-muted/20">
              <div className="text-sm text-muted-foreground">Rango 90%</div>
              <div className="text-xl font-medium">{formatCOP(min90)}</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/20">
              <div className="text-sm text-muted-foreground">Rango 110%</div>
              <div className="text-xl font-medium">{formatCOP(max110)}</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/20">
              <div className="text-sm text-muted-foreground">Diferencia (Ejecutado − PGP)</div>
              <div className={`text-xl font-medium ${diferenciaTrimestre > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCOP(diferenciaTrimestre)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalle mensual */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle mensual</CardTitle>
          <CardDescription>PGP mensual vs ejecución por cada mes del periodo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MES</TableHead>
                <TableHead className="text-right">PGP MENSUAL</TableHead>
                <TableHead className="text-right">EJECUCIÓN</TableHead>
                <TableHead className="text-right">DIFERENCIA</TableHead>
                <TableHead className="text-right">% CUMPLIMIENTO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((m) => {
                const diff = (m.ejecutadoMes ?? 0) - (m.pgpMensualAutorizado ?? 0);
                const ratio = (m.pgpMensualAutorizado ?? 0) > 0
                  ? (m.ejecutadoMes ?? 0) / (m.pgpMensualAutorizado ?? 1)
                  : 0;
                return (
                  <TableRow key={m.monthName}>
                    <TableCell className="font-medium">{m.monthName}</TableCell>
                    <TableCell className="text-right">{formatCOP(m.pgpMensualAutorizado)}</TableCell>
                    <TableCell className="text-right">{formatCOP(m.ejecutadoMes)}</TableCell>
                    <TableCell className={`text-right ${diff > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCOP(diff)}
                    </TableCell>
                    <TableCell className="text-right">{pctBadge(ratio)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Matriz tipo “TOTAL PGP CON AJUSTES / TOTAL FACTURADO” */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Resumen Financiero (Periodo)</CardTitle>
          <CardDescription>Análisis consolidado del rendimiento financiero del periodo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CONCEPTO</TableHead>
                <TableHead className="text-right">VALOR AUTORIZADO</TableHead>
                <TableHead className="text-right">EJECUCIÓN</TableHead>
                <TableHead className="text-right">DIFERENCIA</TableHead>
                <TableHead className="text-right">% CUMPLIMIENTO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map(row => (
                <TableRow
                  key={row.concepto}
                  className={["TOTAL PGP CON AJUSTES", "TOTAL FACTURADO"].includes(row.concepto) ? "font-bold bg-muted/50" : ""}
                >
                  <TableCell>{row.concepto}</TableCell>
                  <TableCell className="text-right">{formatCOP(row.autorizado)}</TableCell>
                  <TableCell className="text-right">{formatCOP(row.ejecutado)}</TableCell>
                  <TableCell className={`text-right ${row.diferencia > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCOP(row.diferencia)}
                  </TableCell>
                  <TableCell className="text-right">{pctBadge(row.cumplimiento)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuarterlyFinancialReport;