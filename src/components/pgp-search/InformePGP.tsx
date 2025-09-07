"use client";

import React, { useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, FileText, Copy, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart, Legend } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";


/**
 * InformePGP.tsx
 * ------------------------------------------------------------
 * Componente de React + TypeScript para generar un informe tipo
 * "Seguimiento Trimestral PGP" con:
 *  - Gráficas (valores ejecutados vs. meta) y (CUPS por mes)
 *  - Narrativa técnica "asistida por IA" (plantillas heurísticas)
 *  - Indicadores de banda de control (90%–110%)
 *  - Botón para copiar el informe textual
 *  - Diseño shadcn/ui + Tailwind (cards, alerts, badges)
 *
 * Cómo usarlo:
 *  <InformePGP data={data} />
 * Donde `data` cumple la interfaz ReportData (ver abajo).
 *
 * Si no pasas `data`, se renderiza un ejemplo con los valores del
 * reporte del Trimestre 2 (Uribia, GRUPO IMB) indicados por el usuario.
 */

// ======= Tipos =======
export type MonthKey = "ABRIL" | "MAYO" | "JUNIO" | "ENERO" | "FEBRERO" | "MARZO" | "JULIO" | "AGOSTO" | "SEPTIEMBRE" | "OCTUBRE" | "NOVIEMBRE" | "DICIEMBRE";

export interface MonthExecution {
  month: MonthKey;
  cups: number;          // Número de actividades/códigos reportados
  valueCOP: number;      // Valor ejecutado en COP para el mes
}

export interface ContractBand {
  estimateCOP: number;   // Valor estimado (nota técnica) para el trimestre
  minPct: number;        // p.ej. 0.90
  maxPct: number;        // p.ej. 1.10
}

export interface Anticipos80_20 {
  anticipado80COP: number; // Total anticipado (80% de 2 meses)
  mes1_80COP: number;      // 80% mes 1
  mes2_80COP: number;      // 80% mes 2
  mes3_100COP: number;     // 100% mes 3
}

export interface HeaderInfo {
  informeNo?: string;
  fecha?: string;           // ISO o legible
  empresa?: string;         // p.ej. "DUSAKAWI EPSI"
  nit?: string;
  municipio?: string;       // p.ej. "URIBIA"
  departamento?: string;    // p.ej. "LA GUAJIRA"
  contrato?: string;        // p.ej. "44847_04_PGP"
  vigencia?: string;        // p.ej. "01/01/2025-01/12/2025"
  responsable?: string;     // p.ej. "Dirección Nacional del Riesgo en Salud"
  periodo?: string;
}

export interface ReportData {
  header: HeaderInfo;
  months: MonthExecution[];       // 3 meses del trimestre
  band: ContractBand;             // banda 90%-110%
  anticipos: Anticipos80_20;      // esquema 80/20
  descuentosCOP?: number;         // opcional (si hubo descuentos)
  reconocimientosCOP?: number;    // opcional (si hubo reconocimiento adicional)
  objetivoTexto?: string;         // si se quiere sobreescribir el objetivo estándar
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
/**
 * Genera párrafos técnicos en español según los datos.
 * (Heurística: plantillas + umbrales, evita lenguaje florido.)
 */
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
    ? `La ejecución trimestral se mantuvo dentro de la banda de control ${pct(band.minPct)}–${pct(band.maxPct)} ` +
      `(rango: ${formatCOP(b.min)} – ${formatCOP(b.max)}), lo que indica estabilidad financiera ` +
      `y adherencia a la nota técnica.`
    : `La ejecución trimestral quedó fuera de la banda de control ${pct(band.minPct)}–${pct(band.maxPct)} ` +
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

  // Hallazgos simples: detectar mes pico de CUPS y de valor
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
        "Ajustar metas operativas y redistribuir oferta para volver a la banda de control.",
        "Revisar glosas/causales de no reconocimiento y trazabilidad de historias clínicas.",
        "Implementar micro‑planes de acceso para reducir variabilidad intermensual.",
      ];

  return { paragraphs: [p0, p1, p2, p3, p4, p5], recomendaciones, totalTrim, totalCUPS, bandHit: b.ok, bandMin: b.min, bandMax: b.max };
}

// ======= Datos por defecto (Ejemplo Uribia – Trimestre 2) =======
const defaultData: ReportData = {
  header: {
    informeNo: "INFORME Nº — FECHA 25/07/2025",
    empresa: "DUSAKAWI EPSI",
    nit: "901226064",
    municipio: "URIBIA",
    departamento: "LA GUAJIRA",
    contrato: "44847_04_PGP",
    vigencia: "01/01/2025–01/12/2025",
    responsable: "Dirección Nacional del Riesgo en Salud",
  },
  months: [
    { month: "ABRIL", cups: 4497, valueCOP: 410_494_560.21 },
    { month: "MAYO", cups: 4609, valueCOP: 418_866_468.86 },
    { month: "JUNIO", cups: 4567, valueCOP: 408_704_877.86 },
  ],
  band: {
    estimateCOP: 1_303_666_575.25, // valor de 3 meses
    minPct: 0.90,
    maxPct: 1.10,
  },
  anticipos: {
    anticipado80COP: 695_288_840.14,
    mes1_80COP: 347_644_420.07,
    mes2_80COP: 347_644_420.07,
    mes3_100COP: 434_555_525.08,
  },
  descuentosCOP: 0,
  reconocimientosCOP: 0,
};

// ======= Tooltip recharts (dinámico en COP) =======
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg bg-white/95 p-3 shadow-lg text-sm text-gray-900">
        <div className="font-semibold">{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex justify-between gap-4">
            <span>{p.name}:</span>
            <span>{typeof p.value === "number" ? formatCOP(p.value) : p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ======= Componente principal =======
export default function InformePGP({ data = defaultData }: { data?: ReportData }) {
  const [copied, setCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const summary = useMemo(() => generateNarrative(data), [data]);

  const barData = useMemo(
    () => data.months.map((m) => ({ Mes: m.month, "Valor ejecutado": m.valueCOP })),
    [data.months]
  );

  const cupsData = useMemo(
    () => data.months.map((m) => ({ Mes: m.month, CUPS: m.cups })),
    [data.months]
  );

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
      scale: 2, // Mejora la resolución
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
    
    const imgWidth = pdfWidth - 40; // Margen de 20pt por lado
    const imgHeight = imgWidth / ratio;
    
    let heightLeft = imgHeight;
    let position = 20; // Margen superior

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
    <div ref={reportRef} className="mx-auto max-w-6xl space-y-6 p-4">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">INFORME TRIMESTRAL – PGP</CardTitle>
              <div className="text-sm text-muted-foreground">
                {header.empresa} | NIT {header.nit} | {header.municipio} – {header.departamento}
              </div>
              <div className="text-sm text-muted-foreground">
                Contrato: <Badge variant="secondary">{header.contrato}</Badge> &nbsp; Vigencia: {header.vigencia}
              </div>
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
          {/* Estado de banda de control */}
          {band.ok ? (
            <Alert className="border-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Ejecución dentro de Rango</AlertTitle>
              <AlertDescription>
                Total trimestral {formatCOP(summary.totalTrim)} dentro de {formatCOP(summary.bandMin)}–{formatCOP(summary.bandMax)}.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ejecución fuera de Rango</AlertTitle>
              <AlertDescription>
                Total trimestral {formatCOP(summary.totalTrim)} fuera de {formatCOP(summary.bandMin)}–{formatCOP(summary.bandMax)}.
              </AlertDescription>
            </Alert>
          )}

          <section className="space-y-2">
            <h3 className="text-base font-semibold flex items-center gap-2"><FileText className="h-4 w-4"/> Objetivo</h3>
            <p className="leading-relaxed text-sm">{generateNarrative(data).paragraphs[0]}</p>
          </section>

          <Separator />

          <section className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gráfico 1. Consolidado de ejecución (COP) por mes</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="Mes" />
                    <YAxis tickFormatter={(v) => new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Valor ejecutado" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gráfico 2. CUPS reportados por mes</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cupsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="Mes" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="CUPS" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-base font-semibold flex items-center gap-2"><FileText className="h-4 w-4"/> Desarrollo del informe</h3>
            {generateNarrative(data).paragraphs.slice(1).map((p, i) => (
              <p key={i} className="leading-relaxed text-sm">{p}</p>
            ))}
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-base font-semibold">Recomendaciones</h3>
            <ul className="list-disc pl-6 text-sm space-y-1">
              {generateNarrative(data).recomendaciones.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
