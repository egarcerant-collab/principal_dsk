"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRightLeft, XCircle, HelpCircle, FileText, TrendingDown, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import StatCard from "../shared/StatCard";

// ======= Tipos =======
export type MonthKey = "ABRIL" | "MAYO" | "JUNIO" | "ENERO" | "FEBRERO" | "MARZO" | "JULIO" | "AGOSTO" | "SEPTIEMBRE" | "OCTUBRE" | "NOVIEMBRE" | "DICIEMBRE";

export interface MonthExecution {
  month: MonthKey;
  cups: number;
  valueCOP: number;
}

export interface ContractBand {
  estimateCOP: number;
  minPct: number;
  maxPct: number;
}

export interface Anticipos80_20 {
  anticipado80COP: number;
  mes1_80COP: number;
  mes2_80COP: number;
  mes3_100COP: number;
}

export interface HeaderInfo {
  informeNo?: string;
  fecha?: string;
  empresa?: string;
  nit?: string;
  municipio?: string;
  departamento?: string;
  contrato?: string;
  vigencia?: string;
  responsable?: string;
  periodo?: string;
}

export interface DeviatedCupInfo {
  cup: string;
  description: string;
  month: string;
  expected: number;
  real: number;
  diff: number;
}

export interface ComparisonSummary {
  totalPgpCups: number;
  matchingCups: number;
  missingCups: string[];
  unexpectedCups: string[];
  underExecutedCups: DeviatedCupInfo[];
  overExecutedCups: DeviatedCupInfo[];
}

export interface FinancialMatrixRow {
    concepto: string;
    autorizado: number;
    ejecutado: number;
    diferencia: number;
    cumplimiento: number;
}

export interface ReportData {
  header: HeaderInfo;
  months: MonthExecution[];
  band: ContractBand;
  anticipos: Anticipos80_20;
  comparisonSummary?: ComparisonSummary;
  descuentosCOP?: number;
  reconocimientosCOP?: number;
  objetivoTexto?: string;
  financialMatrix?: FinancialMatrixRow[];
  totalExpectedFrequency?: number;
  totalRealFrequency?: number;
  expectedMonthlyValue?: number;
}

// ======= Utilidades =======
const formatCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2 }).format(n);
const formatNumber = (n: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);

const pctBadge = (ratio: number) => {
  const p = isFinite(ratio) ? ratio * 100 : 0;
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  if (p > 105) variant = "destructive";
  else if (p >= 95 && p <= 105) variant = "default";
  return <Badge variant={variant}>{p.toFixed(2)}%</Badge>;
};

const DeviatedCupsAccordion = ({ title, icon, count, data, variant }: { title: string, icon: React.ReactNode, count: number, data: DeviatedCupInfo[], variant: 'over' | 'under' }) => {
  if (count === 0) return null;
  
  const diffClass = variant === 'over' ? "font-bold text-red-500" : "font-bold text-yellow-600";
  const diffPrefix = variant === 'over' ? "+" : "";

  return (
    <AccordionItem value={`${variant}-executed-cups`} className="border rounded-lg bg-white shadow-sm">
      <AccordionTrigger className="p-4 text-sm font-medium hover:no-underline">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold">{count} {title}</span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-4 pt-0">
        <p className="text-xs text-muted-foreground mb-2">CUPS con frecuencia real {variant === 'over' ? 'mayor' : 'menor'} a la esperada.</p>
        <ScrollArea className="h-48">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CUP</TableHead>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Esperado</TableHead>
                <TableHead className="text-right">Real</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c, i) => (
                <TableRow key={`${c.cup}-${i}`}>
                  <TableCell className="font-mono text-xs">{c.cup}</TableCell>
                  <TableCell>{c.month}</TableCell>
                  <TableCell className="text-right">{c.expected}</TableCell>
                  <TableCell className="text-right">{c.real}</TableCell>
                  <TableCell className={diffClass + " text-right"}>{diffPrefix}{c.diff}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </AccordionContent>
    </AccordionItem>
  );
};


const DiscrepancyAccordion = ({ title, icon, count, data }: { title: string, icon: React.ReactNode, count: number, data: string[] }) => {
  if (count === 0) return null;
  
  const description = title.includes("Faltantes") 
    ? "CUPS de la nota técnica no encontrados en el JSON."
    : "CUPS del JSON no encontrados en la nota técnica.";

  return (
    <AccordionItem value={`${title.toLowerCase().replace(' ', '-')}-cups`} className="border rounded-lg bg-white shadow-sm">
      <AccordionTrigger className="p-4 text-sm font-medium hover:no-underline">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold">{count} {title}</span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-4 pt-0">
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
        <ScrollArea className="h-48">
          <div className="text-xs font-mono space-y-1 p-2 bg-gray-50 rounded">
            {data.map(cup => <div key={cup}>{cup}</div>)}
          </div>
        </ScrollArea>
      </AccordionContent>
    </AccordionItem>
  );
};


// ======= Componente principal =======
export default function InformePGP({ data }: { data: ReportData }) {
  const header = data.header;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 bg-white print:bg-transparent">
      <Card className="shadow-xl print:shadow-none print:border-none">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Análisis y Contabilidad PGP</CardTitle>
              <div className="text-sm text-muted-foreground">
                {header.empresa} | NIT {header.nit} | {header.municipio} – {header.departamento}
                <br />
                Contrato: <Badge variant="secondary">{header.contrato}</Badge> &nbsp; Vigencia: {header.vigencia}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {data.months.length > 0 && data.expectedMonthlyValue !== undefined && (
             <Card>
                <CardHeader>
                    <CardTitle>Detalle Mensual</CardTitle>
                    <CardDescription>Comparación del valor esperado (nota técnica) vs. el ejecutado (JSON) para cada mes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mes</TableHead>
                                <TableHead className="text-right">Valor Esperado</TableHead>
                                <TableHead className="text-right">Valor Ejecutado</TableHead>
                                <TableHead className="text-right">Diferencia</TableHead>
                                <TableHead className="text-right">% Cumplimiento</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.months.map(month => {
                            const expected = data.expectedMonthlyValue ?? 0;
                            const executed = month.valueCOP;
                            const diff = executed - expected;
                            const ratio = expected > 0 ? executed / expected : 0;
                            return (
                              <TableRow key={month.month}>
                                <TableCell className="font-medium">{month.month}</TableCell>
                                <TableCell className="text-right">{formatCOP(expected)}</TableCell>
                                <TableCell className="text-right">{formatCOP(executed)}</TableCell>
                                <TableCell className={`text-right ${diff > 0 ? "text-red-600" : "text-green-600"}`}>
                                    {formatCOP(diff)}
                                </TableCell>
                                <TableCell className="text-right">{pctBadge(ratio)}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
          )}

          <Separator />

          {data.comparisonSummary && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-blue-600" />Análisis de Frecuencias y Desviaciones</CardTitle>
                <CardDescription>Resumen de la alineación entre la Nota Técnica y los datos de ejecución (JSON).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StatCard title="CUPS en Nota Técnica" value={data.comparisonSummary.totalPgpCups} icon={FileText} />
                  <Accordion type="single" collapsible className="space-y-4">

                     <DeviatedCupsAccordion
                        title="CUPS Sobreejecutados"
                        icon={<TrendingUp className="h-5 w-5 text-red-500" />}
                        count={data.comparisonSummary.overExecutedCups.length}
                        data={data.comparisonSummary.overExecutedCups}
                        variant="over"
                      />
                      
                      <DeviatedCupsAccordion
                        title="CUPS Subejecutados"
                        icon={<TrendingDown className="h-5 w-5 text-yellow-600" />}
                        count={data.comparisonSummary.underExecutedCups.length}
                        data={data.comparisonSummary.underExecutedCups}
                        variant="under"
                      />
                      
                      <DiscrepancyAccordion
                        title="CUPS Faltantes"
                        icon={<XCircle className="h-5 w-5 text-red-500" />}
                        count={data.comparisonSummary.missingCups.length}
                        data={data.comparisonSummary.missingCups}
                      />
                      
                      <DiscrepancyAccordion
                        title="CUPS Inesperados"
                        icon={<HelpCircle className="h-5 w-5 text-yellow-600" />}
                        count={data.comparisonSummary.unexpectedCups.length}
                        data={data.comparisonSummary.unexpectedCups}
                      />

                  </Accordion>
                </div>
              </CardContent>
            </Card>
          )}

           {data.financialMatrix && data.financialMatrix.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Matriz de Resumen Financiero (Periodo)</CardTitle>
                        <CardDescription>Análisis consolidado del rendimiento financiero y operativo del periodo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>CONCEPTO</TableHead>
                                    <TableHead className="text-right">VALOR/FRECUENCIA AUTORIZADO</TableHead>
                                    <TableHead className="text-right">EJECUCIÓN</TableHead>
                                    <TableHead className="text-right">DIFERENCIA</TableHead>
                                    <TableHead className="text-right">% CUMPLIMIENTO</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.financialMatrix.map(row => (
                                <TableRow
                                    key={row.concepto}
                                    className={"font-bold bg-muted/50"}
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
                                 <TableRow>
                                    <TableCell className="font-bold">Frecuencia de Actividades (CUPS)</TableCell>
                                    <TableCell className="text-right">{formatNumber(data.totalExpectedFrequency || 0)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(data.totalRealFrequency || 0)}</TableCell>
                                    <TableCell className={`text-right ${(data.totalRealFrequency || 0) > (data.totalExpectedFrequency || 0) ? "text-red-600" : "text-green-600"}`}>
                                     {formatNumber((data.totalRealFrequency || 0) - (data.totalExpectedFrequency || 0))}
                                    </TableCell>
                                     <TableCell className="text-right">
                                       {pctBadge((data.totalExpectedFrequency) ? (data.totalRealFrequency || 0) / data.totalExpectedFrequency : 0)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
           )}
        </CardContent>
      </Card>
      
      {/* Matriz Adicional en Blanco */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz Adicional (En Blanco)</CardTitle>
          <CardDescription>Plantilla para conceptos o proyecciones adicionales.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Concepto</TableHead>
                <TableHead className="text-right">Valor A</TableHead>
                <TableHead className="text-right">Valor B</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">...</TableCell>
                <TableCell className="text-right">...</TableCell>
                <TableCell className="text-right">...</TableCell>
                <TableCell className="text-right">...</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">...</TableCell>
                <TableCell className="text-right">...</TableCell>
                <TableCell className="text-right">...</TableCell>
                <TableCell className="text-right">...</TableCell>
              </TableRow>
              <TableRow className="font-bold bg-muted/50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">...</TableCell>
                <TableCell className="text-right">...</TableCell>
                <TableCell className="text-right">...</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
