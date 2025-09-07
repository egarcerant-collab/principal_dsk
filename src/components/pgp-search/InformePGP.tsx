"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRightLeft, XCircle, HelpCircle, FileText } from "lucide-react";
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

export interface ComparisonSummary {
  totalPgpCups: number;
  matchingCups: number;
  missingCups: string[];
  unexpectedCups: string[];
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
              <CardDescription>
                {header.empresa} | NIT {header.nit} | {header.municipio} – {header.departamento}
                <br />
                Contrato: <Badge variant="secondary">{header.contrato}</Badge> &nbsp; Vigencia: {header.vigencia}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

          {data.comparisonSummary && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-blue-600" />Contabilidad y Coincidencias</CardTitle>
                <CardDescription>Resumen de la alineación entre la Nota Técnica y los datos de ejecución (JSON).</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="CUPS en Nota Técnica" value={data.comparisonSummary.totalPgpCups} icon={FileText} />
                
                <Accordion type="single" collapsible className="md:col-span-1 lg:col-span-1">
                   <AccordionItem value="missing-cups" className="border rounded-lg bg-white">
                      <AccordionTrigger className="p-4 text-sm font-medium">
                        <div className="flex items-center gap-2">
                           <XCircle className="h-5 w-5 text-red-500" />
                           <span>{data.comparisonSummary.missingCups.length} CUPS Faltantes</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 pt-0">
                         <p className="text-xs text-muted-foreground mb-2">CUPS de la nota técnica no encontrados en el JSON.</p>
                         <ScrollArea className="h-40">
                          <div className="text-xs font-mono space-y-1">
                            {data.comparisonSummary.missingCups.map(cup => <div key={cup}>{cup}</div>)}
                          </div>
                         </ScrollArea>
                      </AccordionContent>
                   </AccordionItem>
                </Accordion>
                
                <Accordion type="single" collapsible className="md:col-span-1 lg:col-span-1">
                   <AccordionItem value="unexpected-cups" className="border rounded-lg bg-white">
                      <AccordionTrigger className="p-4 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-5 w-5 text-yellow-600" />
                          <span>{data.comparisonSummary.unexpectedCups.length} CUPS Inesperados</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 pt-0">
                         <p className="text-xs text-muted-foreground mb-2">CUPS del JSON no encontrados en la nota técnica.</p>
                         <ScrollArea className="h-40">
                          <div className="text-xs font-mono space-y-1">
                             {data.comparisonSummary.unexpectedCups.map(cup => <div key={cup}>{cup}</div>)}
                          </div>
                         </ScrollArea>
                      </AccordionContent>
                   </AccordionItem>
                </Accordion>
                
              </CardContent>
            </Card>
          )}
          
          <Separator />
          
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
    </div>
  );
}
