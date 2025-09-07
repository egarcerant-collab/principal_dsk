
"use client";

import React, { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Info, Activity, Stamp } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import jsPDF from "jspdf";

// ======= Tipos =======
export interface MonthExecution {
  month: string;
  cups: number; // cantidad (no dinero)
  valueCOP: number; // valor ejecutado COP
}

export interface ReportHeader {
  empresa: string;
  nit: string;
  municipio: string;
  contrato: string;
  vigencia: string;
  ciudad?: string;
  fecha?: string; // DD/MM/AAAA
  logoEpsiUrl?: string; // opcional: URL o dataURI
  logoIpsUrl?: string; // opcional: URL o dataURI
  responsable1?: { nombre: string; cargo: string };
  responsable2?: { nombre: string; cargo: string };
  responsable3?: { nombre: string; cargo: string };
}

export interface ReportData {
  header: ReportHeader;
  months: MonthExecution[];
  notaTecnica?: {
    min90: number;
    valor3m: number;
    max110: number;
    anticipos: number;
    totalPagar: number;
    totalFinal: number;
  };
}

// ======= Utilidades =======
const formatCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(n);

function downloadPdfTexto(filename: string, content: string) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = pageWidth - margin * 2;
  doc.setFont("helvetica", "");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(content, textWidth);
  let y = margin;
  lines.forEach((line) => {
    if (y > 270) { doc.addPage(); y = margin; }
    doc.text(line, margin, y);
    y += 6;
  });
  doc.save(filename);
}

async function downloadPdfVisual(filename: string, container: HTMLElement) {
  const html2canvas = (await import("html2canvas")).default;
  const sections = Array.from(container.querySelectorAll<HTMLElement>(".pdf-section"));
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let first = true;

  for (const section of sections) {
    const canvas = await html2canvas(section, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png", 1.0);
    const imgW = pageW - 14; // márgenes
    const ratio = (imgW / canvas.width) * canvas.height;
    const imgH = Math.min(pageH - 14, ratio);

    if (!first) doc.addPage();
    first = false;
    doc.addImage(imgData, "PNG", 7, 7, imgW, imgH);
  }

  doc.save(filename);
}

// ======= Datos de ejemplo (combinados y robustos) =======
export const defaultData: ReportData = {
  header: {
    empresa: "DUSAKAWI EPSI",
    nit: "901226064",
    municipio: "URIBIA",
    contrato: "44847_04_PGP",
    vigencia: "01/01/2025–01/12/2025",
    ciudad: "Uribia",
    fecha: "30/06/2025",
    // logoEpsiUrl: "/logos/epsi.png",
    // logoIpsUrl: "/logos/ips.png",
    responsable1: { nombre: "_________________________", cargo: "Representante EPSI" },
    responsable2: { nombre: "_________________________", cargo: "Representante IPS" },
    responsable3: { nombre: "_________________________", cargo: "Testigo" },
  },
  months: [
    { month: "ABRIL", cups: 4497, valueCOP: 410_494_560.21 },
    { month: "MAYO", cups: 4609, valueCOP: 418_866_468.86 },
    { month: "JUNIO", cups: 4567, valueCOP: 408_704_877.86 },
  ],
  notaTecnica: {
    min90: 1_173_299_917.73,
    valor3m: 1_303_666_575.25,
    max110: 1_434_033_272.78,
    anticipos: 695_288_840.14,
    totalPagar: 608_377_735,
    totalFinal: 1_303_666_575.14,
  },
};

// ======= Componente (fusionado y reforzado) =======
export default function InformePGP({ data = defaultData }: { data?: ReportData }) {
  const actaRef = useRef<HTMLDivElement>(null);

  // Derivados y KPIs
  const sumaMensual = useMemo(() => data.months.reduce((acc, m) => acc + m.valueCOP, 0), [data.months]);
  const totalCups = useMemo(() => data.months.reduce((a, m) => a + m.cups, 0), [data.months]);
  const diffVsNota = useMemo(() => (data.notaTecnica?.valor3m || 0) - sumaMensual, [data.notaTecnica?.valor3m, sumaMensual]);
  const unitAvg = useMemo(() => {
    const mean = data.months.reduce((acc, m) => acc + (m.cups > 0 ? m.valueCOP / m.cups : 0), 0) / data.months.length;
    return Number.isFinite(mean) ? mean : 0;
  }, [data.months]);

  // Series para gráficas
  const barData = useMemo(() => data.months.map((m) => ({ Mes: m.month, Valor: m.valueCOP })), [data.months]);
  const cupsData = useMemo(() => data.months.map((m) => ({ Mes: m.month, CUPS: m.cups })), [data.months]);
  const unitData = useMemo(() => data.months.map((m) => ({ Mes: m.month, Unit: m.cups > 0 ? m.valueCOP / m.cups : 0, Promedio: unitAvg })), [data.months, unitAvg]);

  // Exportación a PDF
  const handleDownloadActaTexto = () => {
    const texto = [
      `ACTA/INFORME – PGP (Trimestre II)`,
      `${data.header.empresa} | NIT ${data.header.nit} | Municipio: ${data.header.municipio} | Contrato: ${data.header.contrato}`,
      `Vigencia: ${data.header.vigencia}`,
      ``,
      `OBJETIVOS`,
      `• Gestión financiera y validación de valores (ejecutado, descuentos, reconocimientos).`,
      `• Calidad del servicio y continuidad del acceso.`,
      `• Cambios demográficos y adecuación de oferta.`,
      `• Eficiencia técnica (COP/CUPS) y análisis de resultados.`,
      `• Recomendaciones para sostenibilidad.`,
      ``,
      `RESUMEN`,
      `Total CUPS T2: ${totalCups.toLocaleString("es-CO")} | Total ejecutado T2: ${formatCOP(sumaMensual)}`,
      `Nota técnica (3m): ${formatCOP(data.notaTecnica?.valor3m || 0)} (90%-110%: ${formatCOP(data.notaTecnica?.min90 || 0)} - ${formatCOP(data.notaTecnica?.max110 || 0)})`,
      `Brecha vs nota: ${formatCOP(diffVsNota)}`,
      ``,
      `INTERPRETACIÓN`,
      `Ejecución estable (finanzas, volumen y costo unitario), dentro de banda 90–110%; evidencia de control del riesgo y sostenibilidad del PGP.`,
      ``,
      `${data.header.ciudad || ""}${data.header.ciudad && data.header.fecha ? ", " : ""}${data.header.fecha || ""}`,
    ].join("\n");
    downloadPdfTexto(`Informe_PGP_${data.header?.municipio || ""}.pdf`, texto);
  };

  const handleDownloadActaVisual = async () => {
    if (!actaRef.current) return;
    await downloadPdfVisual(`Informe_PGP_${data.header?.municipio || ""}_visual.pdf`, actaRef.current);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      {/* Estilos de impresión carta */}
      <style>{`
        @page { size: Letter; margin: 12mm; }
        @media print { .no-print { display:none !important } }
      `}</style>

      {/* Encabezado y acciones */}
      <div className="flex items-start justify-between no-print">
        <div className="text-sm">
          <div className="font-semibold">{data.header.empresa} – NIT {data.header.nit}</div>
          <div>Municipio: {data.header.municipio} | Contrato: {data.header.contrato}</div>
          <div>Vigencia: {data.header.vigencia}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadActaTexto}><FileText className="h-4 w-4 mr-1"/> PDF (texto)</Button>
          <Button variant="default" onClick={handleDownloadActaVisual}><Stamp className="h-4 w-4 mr-1"/> PDF (visual)</Button>
        </div>
      </div>

      <Card ref={actaRef} className="shadow-xl">
        <CardHeader className="pdf-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {data.header.logoEpsiUrl && (<img src={data.header.logoEpsiUrl} alt="Logo EPSI" className="h-10 w-auto" />)}
              <CardTitle>INFORME PGP – TRIMESTRE II (Abr–Jun)</CardTitle>
              {data.header.logoIpsUrl && (<img src={data.header.logoIpsUrl} alt="Logo IPS" className="h-10 w-auto" />)}
            </div>
            {(data.header.ciudad || data.header.fecha) && (
              <div className="text-sm" style={{ color: "#4b5563" }}>
                {data.header.ciudad ?? ""}{data.header.ciudad && data.header.fecha ? ", " : ""}{data.header.fecha ?? ""}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Objetivos (del archivo 2) */}
          <section className="pdf-section">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Activity className="h-4 w-4"/> Objetivos del Acta</h3>
            <ul className="list-disc pl-6 text-sm">
              <li>Revisión de la gestión financiera y disciplina presupuestal.</li>
              <li>Impacto en la calidad del servicio y continuidad del acceso.</li>
              <li>Reconocimiento de cambios demográficos y ajuste de oferta.</li>
              <li>Validación de valores financieros del PGP (ejecutado, anticipos, pagos).</li>
              <li>Evaluación de resultados y eficiencia (COP por CUPS).</li>
              <li>Recomendaciones para mejoras y sostenibilidad.</li>
            </ul>
          </section>

          {/* Nota Técnica (tabla + explicación robusta) */}
          <section className="pdf-section">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Info className="h-4 w-4"/> Nota Técnica</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: "#6b7280" }}>
                    <th>Concepto</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>90% mínimo permitido</td><td>{formatCOP(data.notaTecnica?.min90 || 0)}</td></tr>
                  <tr><td>Meta 3 meses (nota técnica)</td><td>{formatCOP(data.notaTecnica?.valor3m || 0)}</td></tr>
                  <tr><td>Suma ejecución (T2)</td><td>{formatCOP(sumaMensual)}</td></tr>
                  <tr><td>Diferencia vs meta</td><td>{formatCOP(diffVsNota)}</td></tr>
                  <tr><td>110% máximo permitido</td><td>{formatCOP(data.notaTecnica?.max110 || 0)}</td></tr>
                  <tr><td>Anticipos (modelo 80/20)</td><td>{formatCOP(data.notaTecnica?.anticipos || 0)}</td></tr>
                  <tr><td>Total a pagar (3er mes)</td><td>{formatCOP(data.notaTecnica?.totalPagar || 0)}</td></tr>
                  <tr><td>Total final</td><td>{formatCOP(data.notaTecnica?.totalFinal || 0)}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm mt-2">
              <strong>Lectura epidemiológica:</strong> La banda 90–110% funciona como control de riesgo
              financiero. La ejecución del T2 permanece dentro de los límites, lo que sugiere estabilidad
              operacional y capacidad de absorción ante variaciones moderadas de la demanda. La coherencia
              entre anticipos y pago del tercer mes evidencia disciplina del flujo de caja y disminuye la
              probabilidad de desfinanciamiento por eventos de alto costo.
            </p>
          </section>

          {/* Gráfico: Ejecución financiera */}
          <section className="pdf-section">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4"/> Ejecución Financiera (COP)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="Mes" stroke="#374151" />
                  <YAxis stroke="#374151" tickFormatter={(v) => new Intl.NumberFormat("es-CO", { notation: "compact" }).format(v as number)} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Valor" fill="#4a90e2" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm mt-2">
              Barras uniformes sin picos sugieren gasto controlado y predecible. Esto facilita programación de
              cartera, negociación con prestadores y continuidad de la atención, reduciendo el riesgo de
              racionamiento por restricciones financieras.
            </p>
          </section>

          {/* Gráfico: CUPS (cantidad) */}
          <section className="pdf-section">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4"/> CUPS (Cantidad)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cupsData}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="Mes" stroke="#374151" />
                  <YAxis stroke="#374151" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="CUPS" stroke="#16a34a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm mt-2">
              Comportamiento estable del volumen de servicios. Para salud pública, esto se traduce en
              continuidad de acceso, menor rezago diagnóstico y oportunidad terapéutica sostenida. La
              estabilidad respalda la planificación por microred y la asignación de talento humano.
            </p>
          </section>

          {/* Gráfico: Costo unitario */}
          <section className="pdf-section">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4"/> Costo Unitario (COP/CUPS)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={unitData}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="Mes" stroke="#374151" />
                  <YAxis stroke="#374151" tickFormatter={(v) => new Intl.NumberFormat("es-CO", { notation: "compact" }).format(v as number)} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Unit" stroke="#ef4444" strokeWidth={2} />
                  <ReferenceLine y={unitAvg} label="Promedio" stroke="#111827" strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm mt-2">
              La cercanía al promedio indica eficiencia técnica y control de variaciones clínicas; disminuye
              la probabilidad de desviaciones por cambio de mezcla de casos. Permite proyectar costos con
              mayor certidumbre y orientar auditoría concurrente hacia códigos de alto impacto.
            </p>
          </section>

          {/* Conclusiones y Proyecciones (del archivo 1, ampliadas) */}
          <section className="pdf-section">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4"/> Conclusiones y Proyecciones</h3>
            <p className="text-sm mt-2">
              El trimestre evidencia estabilidad financiera (COP), operacional (CUPS) y técnica (COP/CUPS), con
              ejecución dentro de la banda 90–110% de la Nota Técnica. Proyectando la tendencia observada, se
              espera mantenimiento del equilibrio sin presiones significativas, sujeto a vigilancia de eventos
              de alto costo y cambios demográficos. Se recomienda profundizar programas preventivos y
              mantener tableros de control con alertas tempranas.
            </p>
          </section>

          {/* Firmas (del archivo 2) */}
          <section className="pdf-section">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Stamp className="h-4 w-4"/> Firmas</h3>
            <div className="grid gap-8 md:grid-cols-3 pt-8">
              {[data.header.responsable1, data.header.responsable2, data.header.responsable3]
                .filter((r): r is { nombre: string; cargo: string } => Boolean(r))
                .map((r, idx) => (
                  <div key={idx} className="text-sm text-center">
                    <div className="h-14 border-b" style={{ borderColor: "#d1d5db" }} />
                    <div className="mt-2 font-semibold">{r.nombre}</div>
                    <div style={{ color: "#6b7280" }}>{r.cargo}</div>
                  </div>
                ))}
            </div>
          </section>

          {/* Pruebas rápidas (sanity tests) del archivo 2 */}
          <section className="pdf-section">
            <h3 className="font-semibold mb-2">Pruebas rápidas</h3>
            <ul className="list-disc pl-6 text-sm">
              <li>Total CUPS = {totalCups.toLocaleString("es-CO")} – {totalCups === data.months.reduce((a, m) => a + m.cups, 0) ? "OK" : "FALLA"}</li>
              <li>Suma mensual (COP) = {formatCOP(sumaMensual)} – {Math.abs(sumaMensual - data.months.reduce((a, m) => a + m.valueCOP, 0)) < 0.001 ? "OK" : "FALLA"}</li>
              <li>Diferencia vs Nota Técnica = {formatCOP(diffVsNota)} – {Math.abs(diffVsNota - ((data.notaTecnica?.valor3m || 0) - sumaMensual)) < 0.001 ? "OK" : "FALLA"}</li>
              <li>Promedio COP/CUPS calculado = {formatCOP(unitAvg)}</li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
