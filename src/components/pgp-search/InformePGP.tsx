"use client";

import React, { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, FileText, Copy, Download, HelpCircle, ArrowRightLeft, Search, XCircle, CheckCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
}

// ======= Utilidades =======
const formatCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2 }).format(n);
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

function withinBand(total: number, band: ContractBand) {
  const min = band.estimateCOP * band.minPct;
  const max = band.estimateCOP * band.maxPct;
  return { min, max, ok: total >= min && total <= max };
}

// ======= Narrativa "asistida" =======
function generateNarrative(data: ReportData) {
  const { months, band, descuentosCOP = 0, reconocimientosCOP = 0 } = data;
  const totalTrim = months.reduce((s, m) => s + m.valueCOP, 0);
  const totalCUPS = months.reduce((s, m) => s + m.cups, 0);
  const b = withinBand(totalTrim, band);

  const ordenMeses = months.map((m) => m.month).join("-");

  const p0 = data.objetivoTexto ?? (
    `Evaluar la ejecución del Acuerdo de Pago Global Prospectivo (PGP), \
asegurando cumplimiento contractual, calidad en la prestación y uso eficiente de los recursos, \
incluyendo verificación de valores ejecutados, anticipos (modelo 80/20), \
reconocimientos y/o descuentos, y estabilidad operativa del prestador durante el trimestre.`
  );

  const p1 = (
    `Durante los meses de ${ordenMeses}, el prestador reportó ${totalCUPS.toLocaleString("es-CO")} \
actividades (CUPS) y un valor ejecutado trimestral de ${formatCOP(totalTrim)}. ` +
    `Los valores mensuales fueron: ` +
    months
      .map((m) => `${m.month}: ${formatCOP(m.valueCOP)} (${m.cups.toLocaleString("es-CO")} CUPS)`)
      .join("; ") +
    "."
  );

  const p2 = b.ok
    ? `La ejecución trimestral se mantuvo dentro del rango de control ${pct(band.minPct)}–${pct(band.maxPct)} ` +
      `(rango: ${formatCOP(b.min)} – ${formatCOP(b.max)}), lo que indica estabilidad financiera ` +
      `y adherencia a la nota técnica.`
    : `La ejecución trimestral quedó fuera del rango de control ${pct(band.minPct)}–${pct(band.maxPct)} ` +
      `(rango: ${formatCOP(b.min)} – ${formatCOP(b.max)}). Se recomienda revisar causas de ` +
      `${totalTrim < b.min ? "subejecución" : "sobre‑ejecución"} y ajustar la programación operativa.`;

  const totalReconocido = Math.max(0, totalTrim + reconocimientosCOP - descuentosCOP);

  const p3 = (
    `En términos financieros, el valor trimestral ejecutado (${formatCOP(totalTrim)}) ` +
    `${descuentosCOP ? `incluye descuentos por ${formatCOP(descuentosCOP)}` : "no registra descuentos"}` +
    `${reconocimientosCOP ? ` y reconocimientos por ${formatCOP(reconocimientosCOP)}.` : "."} ` +
    `El total reconocido asciende a ${formatCOP(totalReconocido)}.`
  );

  const p4 = (
    `Conforme al esquema de caja 80/20, se programaron anticipos por ${formatCOP(data.anticipos.anticipado80COP)} ` +
    `(${formatCOP(data.anticipos.mes1_80COP)} en el primer mes y ${formatCOP(data.anticipos.mes2_80COP)} en el segundo), ` +
    `y el pago del tercer mes por ${formatCOP(data.anticipos.mes3_100COP)} (100%).`
  );

  const peakCups = months.reduce((a, b) => (b.cups > a.cups ? b : a));
  const peakVal = months.reduce((a, b) => (b.valueCOP > a.valueCOP ? b : a));

  const p5 = (
    `Operativamente, el mayor volumen de actividades se observó en ${peakCups.month} ` +
    `(${peakCups.cups.toLocaleString("es-CO")} CUPS) y el mayor valor ejecutado en ${peakVal.month} ` +
    `(${formatCOP(peakVal.valueCOP)}), sin evidenciar concentraciones atípicas por encima del comportamiento esperado.`
  );

  const recomendaciones = b.ok
    ? [
      "Mantener la disciplina operativa y el seguimiento a indicadores trazadores.",
      "Consolidar la planeación de oferta según demanda observada y estacionalidad local.",
      "Profundizar auditoría concurrente sobre códigos de alto impacto financiero.",
    ]
    : [
      "Ajustar metas operativas y redistribuir oferta para volver al rango de control.",
      "Revisar glosas/causales de no reconocimiento y trazabilidad de historias clínicas.",
      "Implementar micro‑planes de acceso para reducir variabilidad intermensual.",
    ];

  return { paragraphs: [p0, p1, p2, p3, p4, p5], recomendaciones, totalTrim, totalCUPS, bandHit: b.ok, bandMin: b.min, bandMax: b.max };
}

const pctBadge = (ratio: number) => {
  const p = isFinite(ratio) ? ratio * 100 : 0;
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  if (p > 105) variant = "destructive";
  else if (p >= 95 && p <= 105) variant = "default";
  return <Badge variant={variant}>{p.toFixed(2)}%</Badge>;
};


// ======= Componente principal =======
export default function InformePGP({ data }: { data: ReportData }) {
  const [copied, setCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const summary = useMemo(() => generateNarrative(data), [data]);

  const header = data.header;

  const handleCopy = async () => {
    const texto = [
      `INFORME DEL COMPONENTE DIRECCIÓN DEL RIESGO NACIONAL EN SALUD – CONTRATOS PGP`,
      `${header.empresa ?? ""} | NIT ${header.nit ?? ""} | ${header.municipio ?? ""} – ${header.departamento ?? ""}`,
      `Contrato: ${header.contrato ?? ""} | Vigencia: ${header.vigencia ?? ""}`,
      `\n1) Objetivo`,
      summary.paragraphs[0],
      `\n2) Resultados del trimestre`,
      summary.paragraphs[1],
      summary.paragraphs[2],
      `\n3) Aspectos financieros`,
      summary.paragraphs[3],
      summary.paragraphs[4],
      `\n4) Observaciones operativas`,
      summary.paragraphs[5],
      `\n5) Recomendaciones`,
      ...summary.recomendaciones.map((r, i) => `${i + 1}. ${r}`),
    ].join("\n");

    await navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;

    const imgWidth = pdfWidth - 40;
    const imgHeight = imgWidth / ratio;

    let heightLeft = imgHeight;
    let position = 20;

    pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - 40);

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 40);
    }

    pdf.save(`informe_pgp_${(header.empresa || 'reporte').replace(/\s/g, '_')}.pdf`);
  };

  const band = withinBand(summary.totalTrim, data.band);

  return (
    <div ref={reportRef} className="mx-auto max-w-6xl space-y-6 p-4 bg-white print:bg-transparent">
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
            <div className="flex items-center gap-2 print:hidden">
              <Button onClick={handleCopy} variant="default" className="gap-2">
                <Copy className="h-4 w-4" /> {copied ? "¡Copiado!" : "Copiar informe"}
              </Button>
              <Button onClick={handleDownloadPdf} variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Descargar PDF
              </Button>
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
                                {data.financialMatrix.map(row => (
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
           )}


        </CardContent>
      </Card>
    </div>
  );
}
