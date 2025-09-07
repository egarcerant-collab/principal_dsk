
"use client";

import React, { useState, useMemo } from "react";
import Papa from 'papaparse';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRightLeft,
  XCircle,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  Download,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

// ======= Tipos =======
export type MonthKey =
  | "ABRIL"
  | "MAYO"
  | "JUNIO"
  | "ENERO"
  | "FEBRERO"
  | "MARZO"
  | "JULIO"
  | "AGOSTO"
  | "SEPTIEMBRE"
  | "OCTUBRE"
  | "NOVIEMBRE"
  | "DICIEMBRE";

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
  activityDescription?: string;
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

export interface PgpRow {
  SUBCATEGORIA?: string;
  AMBITO?: string;
  'ID RESOLUCION 3100'?: string;
  'DESCRIPCION ID RESOLUCION'?: string;
  'CUP/CUM'?: string;
  'DESCRIPCION CUPS'?: string;
  'FRECUENCIA AÑO SERVICIO'?: number;
  'FRECUENCIA USO'?: number;
  'FRECUENCIA EVENTOS MES'?: number;
  'FRECUENCIA EVENTO DIA'?: number;
  'COSTO EVENTO MES'?: number;
  'COSTO EVENTO DIA'?: number;
  'FRECUENCIA MINIMA MES'?: number;
  'FRECUENCIA MAXIMA MES'?: number;
  'VALOR UNITARIO'?: number;
  'VALOR MINIMO MES'?: number;
  'VALOR MAXIMO MES'?: number;
  'COSTO EVENTO MES (VALOR MES)'?: number;
  OBSERVACIONES?: string;
  [key: string]: any;
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
  pgpData?: PgpRow[]; // <-- Añadido
}

// ======= Utilidades =======
const formatCOP = (n?: number) => {
    if (n === undefined || n === null) return '$0';
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 2,
    }).format(n);
}

const formatNumber = (n?: number) => {
  if (n === undefined || n === null) return '0';
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);
}

const pctBadge = (ratio?: number) => {
  const p = isFinite(ratio ?? 0) ? (ratio ?? 0) * 100 : 0;
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  if (p > 105) variant = "destructive";
  else if (p >= 95 && p <= 105) variant = "default";
  return <Badge variant={variant}>{p.toFixed(2)}%</Badge>;
};

const DetailRow = ({ label, value }: { label: string, value: any }) => (
    <div className="flex justify-between border-b py-2">
        <span className="text-sm font-medium text-muted-foreground">{label}:</span>
        <span className="text-sm font-semibold">{value || 'N/A'}</span>
    </div>
);

const CupDetailModal = ({ cup, isOpen, onClose }: { cup: PgpRow | null, isOpen: boolean, onClose: () => void }) => {
    if (!cup) return null;

    return (
         <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Detalle del CUP: {cup['CUP/CUM']}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {cup['DESCRIPCION CUPS']}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="max-h-96 overflow-y-auto pr-4 space-y-2">
                    <DetailRow label="Subcategoría" value={cup.SUBCATEGORIA} />
                    <DetailRow label="Ámbito" value={cup.AMBITO} />
                    <Separator />
                    <h4 className="font-semibold pt-2">Frecuencias</h4>
                    <DetailRow label="Frecuencia Año Servicio" value={formatNumber(cup['FRECUENCIA AÑO SERVICIO'])} />
                    <DetailRow label="Frecuencia Uso" value={formatNumber(cup['FRECUENCIA USO'])} />
                    <DetailRow label="Frecuencia Eventos Mes" value={formatNumber(cup['FRECUENCIA EVENTOS MES'])} />
                    <DetailRow label="Frecuencia Mínima Mes" value={formatNumber(cup['FRECUENCIA MINIMA MES'])} />
                    <DetailRow label="Frecuencia Máxima Mes" value={formatNumber(cup['FRECUENCIA MAXIMA MES'])} />
                     <Separator />
                    <h4 className="font-semibold pt-2">Costos y Valores</h4>
                    <DetailRow label="Valor Unitario" value={formatCOP(cup['VALOR UNITARIO'])} />
                    <DetailRow label="Costo Evento Mes" value={formatCOP(cup['COSTO EVENTO MES (VALOR MES)'])} />
                    <DetailRow label="Valor Mínimo Mes" value={formatCOP(cup['VALOR MINIMO MES'])} />
                    <DetailRow label="Valor Máximo Mes" value={formatCOP(cup['VALOR MAXIMO MES'])} />
                    <Separator />
                    <h4 className="font-semibold pt-2">Observaciones</h4>
                    <p className="text-sm text-muted-foreground">{cup.OBSERVACIONES || "Sin observaciones."}</p>
                </div>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={onClose}>Cerrar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

const DeviatedCupsAccordion = ({ title, icon, count, data, variant, onCupClick, onDownload }: { title: string, icon: React.ReactNode, count: number, data: DeviatedCupInfo[], variant: 'over' | 'under', onCupClick: (cup: string) => void, onDownload: () => void }) => {
  if (count === 0) return null;
  
  const diffClass = variant === 'over' ? "font-bold text-red-500" : "font-bold text-yellow-600";
  const diffPrefix = variant === 'over' ? "+" : "";

  return (
     <AccordionItem value={`${variant}-executed-cups`} className="border rounded-lg bg-white shadow-sm">
        <div className="flex w-full items-center justify-between p-4">
            <AccordionTrigger className="p-0 text-sm font-medium hover:no-underline [&[data-state=open]]:bg-muted/50 w-full">
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="font-semibold">{count} {title}</span>
                </div>
            </AccordionTrigger>
             <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDownload(); }} className="h-7 w-7 ml-2 shrink-0">
                <Download className="h-4 w-4" />
            </Button>
        </div>
      <AccordionContent className="p-4 pt-0">
        <p className="text-xs text-muted-foreground mb-2">CUPS con frecuencia real {variant === 'over' ? 'mayor' : 'menor'} a la esperada.</p>
        <ScrollArea className="h-48">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CUP</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Esperado</TableHead>
                <TableHead className="text-right">Real</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c, i) => (
                <TableRow key={`${c.cup}-${i}`}>
                  <TableCell>
                    <Button variant="link" className="p-0 h-auto font-mono text-xs" onClick={() => onCupClick(c.cup)}>
                      {c.cup}
                    </Button>
                  </TableCell>
                  <TableCell className="text-xs">{c.activityDescription}</TableCell>
                  <TableCell>{c.month}</TableCell>
                  <TableCell className="text-right">{formatNumber(c.expected)}</TableCell>
                  <TableCell className="text-right">{formatNumber(c.real)}</TableCell>
                  <TableCell className={diffClass + " text-right"}>{diffPrefix}{formatNumber(c.diff)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </AccordionContent>
    </AccordionItem>
  );
};


const DiscrepancyAccordion = ({ title, icon, count, data, onDownload }: { title: string, icon: React.ReactNode, count: number, data: string[], onDownload: () => void }) => {
  if (count === 0) return null;
  
  const description = title.includes("Faltantes") 
    ? "CUPS de la nota técnica no encontrados en el JSON."
    : "CUPS del JSON no encontrados en la nota técnica.";

  return (
    <AccordionItem value={`${title.toLowerCase().replace(/\s+/g, '-')}-cups`} className="border rounded-lg bg-white shadow-sm">
        <div className="flex w-full items-center justify-between p-4">
            <AccordionTrigger className="p-0 text-sm font-medium hover:no-underline [&[data-state=open]]:bg-muted/50 w-full">
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="font-semibold">{count} {title}</span>
                </div>
            </AccordionTrigger>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDownload(); }} className="h-7 w-7 ml-2 shrink-0">
                <Download className="h-4 w-4" />
            </Button>
        </div>
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
  const { header, pgpData } = data;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCupInfo, setSelectedCupInfo] = useState<PgpRow | null>(null);

  const pgpDataMap = useMemo(() => {
    if (!pgpData) return new Map();
    return new Map<string, PgpRow>(pgpData.map(row => [row['CUP/CUM'] ?? '', row]));
  }, [pgpData]);

  const handleCupClick = (cupCode: string) => {
    const cupInfo = pgpDataMap.get(cupCode);
    if (cupInfo) {
      setSelectedCupInfo(cupInfo);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => setIsModalOpen(false);
  
  const handleDownloadCsv = (dataToDownload: any[], filename: string) => {
    const csv = Papa.unparse(dataToDownload);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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
                 <Accordion type="multiple" className="space-y-4">

                     <DeviatedCupsAccordion
                        title={`CUPS Sobreejecutados (>111%)`}
                        icon={<TrendingUp className="h-5 w-5 text-red-500" />}
                        count={data.comparisonSummary.overExecutedCups.length}
                        data={data.comparisonSummary.overExecutedCups}
                        variant="over"
                        onCupClick={handleCupClick}
                        onDownload={() => handleDownloadCsv(data.comparisonSummary?.overExecutedCups || [], 'cups_sobrejecutados.xls')}
                      />
                      
                      <DeviatedCupsAccordion
                        title="CUPS Subejecutados"
                        icon={<TrendingDown className="h-5 w-5 text-yellow-600" />}
                        count={data.comparisonSummary.underExecutedCups.length}
                        data={data.comparisonSummary.underExecutedCups}
                        variant="under"
                        onCupClick={handleCupClick}
                        onDownload={() => handleDownloadCsv(data.comparisonSummary?.underExecutedCups || [], 'cups_subejecutados.xls')}
                      />
                      
                      <DiscrepancyAccordion
                        title="CUPS Faltantes"
                        icon={<XCircle className="h-5 w-5 text-red-500" />}
                        count={data.comparisonSummary.missingCups.length}
                        data={data.comparisonSummary.missingCups}
                        onDownload={() => handleDownloadCsv(data.comparisonSummary?.missingCups.map(cup => ({ cup })) || [], 'cups_faltantes.xls')}
                      />
                      
                      <DiscrepancyAccordion
                        title="CUPS Inesperados"
                        icon={<HelpCircle className="h-5 w-5 text-yellow-600" />}
                        count={data.comparisonSummary.unexpectedCups.length}
                        data={data.comparisonSummary.unexpectedCups}
                        onDownload={() => handleDownloadCsv(data.comparisonSummary?.unexpectedCups.map(cup => ({ cup })) || [], 'cups_inesperados.xls')}
                      />

                  </Accordion>
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
                                       {pctBadge((data.totalExpectedFrequency) ? (data.totalRealFrequency || 0) / (data.totalExpectedFrequency || 1) : 0)}
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
       <CupDetailModal cup={selectedCupInfo} isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}

