"use client";

import React, { useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ============ Tipos de datos ============
type MaybeSummary = any;

export interface MonthInput {
  monthName: string;
  summary: MaybeSummary | null;
  executedValue: number;
  ajustes?: number;
}

export interface ReportHeader {
  empresa?: string;
  nit?: string;
  municipio?: string;
  departamento?: string;
  contrato?: string;
  vigencia?: string;
  periodo?: string;
  responsable?: string;
}

interface QuarterlyFinancialReportProps {
  header: ReportHeader;
  months: MonthInput[];
  showAnticipos80_20?: boolean;
}

// ============ Utilidades ============
const formatCOP = (value?: number | null) => {
  if (value === null || value === undefined || isNaN(value as number)) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value as number);
};

const getPgpMensual = (summary: MaybeSummary | null | undefined): number => {
  if (!summary) return 0;
  const keys = ["totalCostoMes", "pgpMensual", "valorTecnico", "total", "autorizado"];
  for (const k of keys) {
    const v = (summary as any)?.[k];
    if (typeof v === "number" && isFinite(v)) return v;
  }
  return 0;
};

const pctBadge = (ratio: number) => {
  const p = isFinite(ratio) ? ratio * 100 : 0;
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  if (p > 105) variant = "destructive";
  else if (p >= 95 && p <= 105) variant = "default";
  return <Badge variant={variant}>{p.toFixed(2)}%</Badge>;
};

// ============ Gráficos dinámicos (Next.js SSR off) ============

type ChartsProps = {
  data: { mes: string; PGP: number; Ejecutado: number; Cumplimiento: number }[];
};

const ChartBars = dynamic(
  async () => {
    const { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } = await import("recharts");
    return ({ data }: ChartsProps) => (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis tickFormatter={(v: number) => new Intl.NumberFormat("es-CO").format(v)} />
          <Tooltip formatter={(v: number) => formatCOP(v)} />
          <Legend />
          <Bar dataKey="PGP" fill="#8884d8" />
          <Bar dataKey="Ejecutado" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    );
  },
  { ssr: false, loading: () => (<div className="h-full w-full grid place-items-center text-sm text-muted-foreground">Cargando gráfico…</div>) }
);

const ChartLine = dynamic(
  async () => {
    const { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } = await import("recharts");
    return ({ data }: ChartsProps) => (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis domain={[0, 140]} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
          <Legend />
          <Line type="monotone" dataKey="Cumplimiento" stroke="#ffc658" />
        </LineChart>
      </ResponsiveContainer>
    );
  },
  { ssr: false, loading: () => (<div className="h-full w-full grid place-items-center text-sm text-muted-foreground">Cargando gráfico…</div>) }
);

// ============ Componente principal ============
const QuarterlyFinancialReport: React.FC<QuarterlyFinancialReportProps> = ({ header, months: monthsData, showAnticipos80_20 = true }) => {
  const reportRef = useRef<HTMLDivElement>(null);

  if (!monthsData || monthsData.length === 0) return null;

  const months = monthsData.map((src) => {
    const pgpMensualAutorizado = getPgpMensual(src.summary);
    const ejecutadoMes = src.executedValue ?? 0;
    const ajustes = src.ajustes ?? 0;
    const diferencia = ejecutadoMes - pgpMensualAutorizado;
    const cumplimiento = pgpMensualAutorizado > 0 ? ejecutadoMes / pgpMensualAutorizado : 0;
    return { ...src, pgpMensualAutorizado, ejecutadoMes, ajustes, diferencia, cumplimiento };
  });

  const totalAutorizado = months.reduce((a, m) => a + (m.pgpMensualAutorizado || 0), 0);
  const totalEjecutado = months.reduce((a, m) => a + (m.ejecutadoMes || 0), 0);
  const totalAjustes = months.reduce((a, m) => a + (m.ajustes || 0), 0);
  const totalConAjustes = totalAutorizado + totalAjustes;

  const diferenciaTrimestre = totalEjecutado - totalAutorizado;
  const cumplimientoTrim = totalAutorizado > 0 ? totalEjecutado / totalAutorizado : 0;

  const min90 = totalAutorizado * 0.9;
  const max110 = totalAutorizado * 1.1;

  const anticipos80 = showAnticipos80_20
    ? months.map((m) => ({
        monthName: m.monthName,
        anticipo80: m.pgpMensualAutorizado * 0.8,
        saldo20: m.pgpMensualAutorizado * 0.2,
      }))
    : [];

  const totalAnticipos80 = anticipos80.reduce((a, it) => a + it.anticipo80, 0);
  const totalSaldos20 = anticipos80.reduce((a, it) => a + it.saldo20, 0);

  const rechartsData = useMemo(
    () =>
      months.map((m) => ({
        mes: m.monthName,
        PGP: Math.round(m.pgpMensualAutorizado),
        Ejecutado: Math.round(m.ejecutadoMes),
        Cumplimiento: Number(((m.cumplimiento || 0) * 100).toFixed(2)),
      })),
    [months]
  );

  const filas = [
    { concepto: "PGP MENSUAL (TRIMESTRE)", autorizado: totalAutorizado, ejecutado: totalEjecutado, diferencia: diferenciaTrimestre, cumplimiento: cumplimientoTrim },
    { concepto: "AJUSTES", autorizado: totalAjustes, ejecutado: 0, diferencia: totalAjustes, cumplimiento: 0 },
    { concepto: "TOTAL PGP CON AJUSTES", autorizado: totalConAjustes, ejecutado: totalEjecutado, diferencia: totalEjecutado - totalConAjustes, cumplimiento: totalConAjustes > 0 ? totalEjecutado / totalConAjustes : 0 },
    { concepto: "FACTURACIÓN CAPITA", autorizado: 0, ejecutado: 0, diferencia: 0, cumplimiento: 0 },
    { concepto: "FACTURACIÓN PAGOS INDIVIDUALES", autorizado: 0, ejecutado: 0, diferencia: 0, cumplimiento: 0 },
    { concepto: "TOTAL FACTURADO", autorizado: totalConAjustes, ejecutado: totalEjecutado, diferencia: totalEjecutado - totalConAjustes, cumplimiento: totalConAjustes > 0 ? totalEjecutado / totalConAjustes : 0 },
  ];
  
  const handleDownloadPdf = async () => {
    const reportElement = reportRef.current;
    if (!reportElement) return;

    const canvas = await html2canvas(reportElement, {
      scale: 2,
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;
    const imgWidth = pdfWidth - 40;
    const imgHeight = imgWidth / ratio;
    
    let heightLeft = imgHeight;
    let position = 20;

    pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
    heightLeft -= (pdf.internal.pageSize.getHeight() - 40);

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 20;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
      heightLeft -= (pdf.internal.pageSize.getHeight() - 40);
    }
    
    await pdf.save(`informe_pgp_${header.empresa || 'reporte'}.pdf`, { returnPromise: true });
  };


  return (
    <div className="space-y-6">
       <div className="flex justify-end">
        <Button onClick={handleDownloadPdf}>
          <Download className="mr-2 h-4 w-4" />
          Descargar Informe en PDF
        </Button>
      </div>

      <div ref={reportRef} className="space-y-6 p-4 bg-background">
        <Card>
          <CardHeader>
            <CardTitle>INFORME TRIMESTRAL – Dirección del Riesgo (PGP)</CardTitle>
            <CardDescription>
              {header?.empresa && <span className="mr-2"><strong>EMPRESA:</strong> {header.empresa}</span>}
              {header?.nit && <span className="mr-2"><strong>NIT:</strong> {header.nit}</span>}
              {header?.municipio && <span className="mr-2"><strong>MUNICIPIO:</strong> {header.municipio}</span>}
              {header?.departamento && <span className="mr-2"><strong>DPTO:</strong> {header.departamento}</span>}
              {header?.contrato && <span className="mr-2"><strong>CONTRATO:</strong> {header.contrato}</span>}
              {header?.vigencia && <span className="block"><strong>VIGENCIA:</strong> {header.vigencia}</span>}
              {header?.periodo && <span className="block"><strong>PERIODO EVALUADO:</strong> {header.periodo}</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
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

        <Card>
          <CardHeader>
            <CardTitle>Gráfico 1. PGP mensual vs ejecución</CardTitle>
            <CardDescription>Comparativo por mes dentro del trimestre evaluado.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ChartBars data={rechartsData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gráfico 2. % de Cumplimiento mensual</CardTitle>
            <CardDescription>Porcentaje de ejecución frente al PGP en cada mes.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ChartLine data={rechartsData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalle mensual</CardTitle>
            <CardDescription>PGP mensual vs ejecución por cada mes del trimestre.</CardDescription>
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
                {months.map((m) => (
                  <TableRow key={m.monthName}>
                    <TableCell className="font-medium">{m.monthName}</TableCell>
                    <TableCell className="text-right">{formatCOP(m.pgpMensualAutorizado)}</TableCell>
                    <TableCell className="text-right">{formatCOP(m.ejecutadoMes)}</TableCell>
                    <TableCell className={`text-right ${m.diferencia > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCOP(m.diferencia)}
                    </TableCell>
                    <TableCell className="text-right">{pctBadge(m.cumplimiento)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matriz de Resumen Financiero (Trimestre)</CardTitle>
            <CardDescription>Análisis consolidado del rendimiento financiero del trimestre.</CardDescription>
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
                {filas.map((row) => (
                  <TableRow key={row.concepto} className={row.concepto.includes("TOTAL") ? "font-bold bg-muted/50" : ""}>
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

        {showAnticipos80_20 && (
          <Card>
            <CardHeader>
              <CardTitle>Pagos Anticipados – Modelo 80/20</CardTitle>
              <CardDescription>80% mensual + 20% reconocido al cierre del trimestre.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MES</TableHead>
                    <TableHead className="text-right">ANTICIPO (80%)</TableHead>
                    <TableHead className="text-right">SALDO (20%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anticipos80.map((row) => (
                    <TableRow key={row.monthName}>
                      <TableCell className="font-medium">{row.monthName}</TableCell>
                      <TableCell className="text-right">{formatCOP(row.anticipo80)}</TableCell>
                      <TableCell className="text-right">{formatCOP(row.saldo20)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>TOTALES</TableCell>
                    <TableCell className="text-right">{formatCOP(totalAnticipos80)}</TableCell>
                    <TableCell className="text-right">{formatCOP(totalSaldos20)}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>TOTAL A PAGAR MODELO 80/20</TableCell>
                    <TableCell className="text-right">{formatCOP(totalAnticipos80 + totalSaldos20)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QuarterlyFinancialReport;
