

"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Info, Activity, Stamp, Loader2, DownloadCloud, X, BarChart2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { descargarInformePDF, type InformeDatos, generarURLInformePDF } from "@/lib/pdf-definitions";
import type { DeviatedCupInfo } from "@/components/pgp-search/PgPsearchForm";

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
  overExecutedCups?: DeviatedCupInfo[];
  unexpectedCups?: { cup: string; realFrequency: number }[];
}

// ======= Utilidades =======
const formatCOP = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

async function loadImageAsBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network response was not ok for ${url}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn(`Could not load image from ${url}:`, error);
        return ""; // Devuelve una cadena vacía si hay un error
    }
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
export default function InformePGP({ data = defaultData }: { data?: ReportData | null }) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  
  // Derivados y KPIs
  const sumaMensual = useMemo(() => data?.months.reduce((acc, m) => acc + m.valueCOP, 0) ?? 0, [data?.months]);
  const totalCups = useMemo(() => data?.months.reduce((a, m) => a + m.cups, 0) ?? 0, [data?.months]);
  const diffVsNota = useMemo(() => (data?.notaTecnica?.valor3m || 0) - sumaMensual, [data?.notaTecnica?.valor3m, sumaMensual]);
  const unitAvg = useMemo(() => {
    if (!data || !data.months || data.months.length === 0 || totalCups === 0) return 0;
    const mean = sumaMensual / totalCups;
    return Number.isFinite(mean) ? mean : 0;
  }, [data?.months, sumaMensual, totalCups]);

  // Series para gráficas
  const barData = useMemo(() => data?.months.map((m) => ({ Mes: m.month, Valor: m.valueCOP })) ?? [], [data?.months]);
  const cupsData = useMemo(() => data?.months.map((m) => ({ Mes: m.month, CUPS: m.cups })) ?? [], [data?.months]);
  const unitData = useMemo(() => data?.months.map((m) => ({ Mes: m.month, Unit: m.cups > 0 ? m.valueCOP / m.cups : 0, Promedio: unitAvg })) ?? [], [data?.months, unitAvg]);

  const getInformeData = (data: ReportData): InformeDatos => {
    const valorNotaTecnica = data.notaTecnica?.valor3m || 0;
    const porcentajeEjecucion = valorNotaTecnica > 0 ? (sumaMensual / valorNotaTecnica) * 100 : 0;

    const kpis = [
        { label: 'Suma Ejecución (Trimestre)', value: formatCOP(sumaMensual) },
        { label: 'Nota Técnica (Presupuesto)', value: formatCOP(valorNotaTecnica) },
        { label: 'Diferencia vs. Presupuesto', value: formatCOP(diffVsNota) },
        { label: 'Porcentaje de Ejecución', value: `${porcentajeEjecucion.toFixed(2)}%` },
        { label: 'Total CUPS Ejecutados', value: totalCups.toLocaleString('es-CO') },
        { label: 'Costo Unitario Promedio (COP/CUPS)', value: formatCOP(unitAvg) },
    ];
    
    const topOverExecuted = (data.overExecutedCups ?? [])
        .sort((a,b) => b.deviation - a.deviation)
        .slice(0, 5)
        .map(c => ({ name: c.cup, Desviación: c.deviation }));

    const topUnexpected = (data.unexpectedCups ?? [])
        .sort((a, b) => b.realFrequency - a.realFrequency)
        .slice(0, 5)
        .map(c => ({ name: c.cup, Frecuencia: c.realFrequency }));

    return {
        titulo: 'INFORME EJECUTIVO DE SEGUIMIENTO PGP',
        subtitulo: `${data.header.empresa} | NIT ${data.header.nit}`,
        referencia: `Contrato: ${data.header.contrato} | Vigencia: ${data.header.vigencia} | Período Analizado: Trimestre II`,
        objetivos: [
            'Evaluar la eficiencia en la ejecución de los recursos asignados bajo el modelo de Pago Global Prospectivo (PGP), contrastando el gasto real con la proyección actuarial de la nota técnica.',
            'Analizar el comportamiento epidemiológico de la población adscrita a través del volumen y tipo de servicios (CUPS) prestados, para identificar tendencias y necesidades de salud emergentes.',
            'Verificar la disciplina presupuestal y la sostenibilidad del modelo, asegurando que la ejecución financiera se mantenga dentro de las bandas de riesgo contractuales (90% - 110%).',
            'Proveer un fundamento técnico y cuantitativo para la toma de decisiones gerenciales, ajustes operativos y la validación de los actos administrativos de pago y liquidación.',
        ],
        kpis,
        analisis: [
            { 
              title: 'Análisis de Ejecución Financiera y Presupuestal', 
              text: `Durante el segundo trimestre, la ejecución financiera consolidada alcanzó un total de ${formatCOP(sumaMensual)}, lo que representa un ${porcentajeEjecucion.toFixed(2)}% del presupuesto asignado de ${formatCOP(valorNotaTecnica)} en la nota técnica. Este resultado se sitúa dentro de la banda de control contractual (90%-110%), indicando una gestión presupuestal estable y predecible. La desviación absoluta frente a la meta es de ${formatCOP(diffVsNota)}, una cifra que, en términos relativos, se considera manejable y no compromete la sostenibilidad del acuerdo. La uniformidad observada en el gasto mensual (ver gráfica de ejecución financiera) sugiere una operación sin sobresaltos ni picos de demanda inesperados, lo cual es positivo para la planificación de la cartera y la garantía de continuidad en la atención. Proyección: Si se mantiene esta tendencia, se estima que la ejecución anual se alineará estrechamente con el presupuesto global, minimizando el riesgo de déficits o excedentes significativos al cierre del ejercicio.` 
            },
            { 
              title: 'Análisis del Comportamiento Epidemiológico y de Servicios (CUPS)', 
              text: `Se ejecutaron un total de ${totalCups.toLocaleString('es-CO')} CUPS durante el trimestre, con un costo unitario promedio ponderado de ${formatCOP(unitAvg)}. Este costo unitario es un indicador clave de la complejidad y el valor promedio de los servicios prestados. La estabilidad en la gráfica de CUPS a lo largo de los meses (Abril, Mayo, Junio) refleja una demanda de servicios constante y una capacidad de respuesta adecuada por parte de la IPS. Esta predictibilidad es fundamental en salud pública, ya que sugiere un acceso continuo a los servicios y una baja probabilidad de represamiento de la demanda. No se observan anomalías que sugieran brotes epidemiológicos inesperados o barreras de acceso significativas. Proyección: La estabilidad en el volumen de CUPS permite proyectar con alta confianza las necesidades de recursos (humanos, insumos, infraestructura) para los siguientes trimestres, facilitando una gestión proactiva de la capacidad instalada.`
            },
            {
              title: 'Análisis de Desviaciones: CUPS Sobre-ejecutados e Inesperados',
              text: `El análisis de desviaciones revela áreas clave que requieren atención gerencial. Se identificaron ${data.overExecutedCups?.length ?? 0} CUPS con una ejecución superior al 111% de lo esperado y ${data.unexpectedCups?.length ?? 0} CUPS que fueron ejecutados sin estar previstos en la nota técnica. Estos eventos, aunque pueden estar justificados por necesidades de salud imprevistas, representan los principales focos de riesgo financiero y operativo. La sobre-ejecución puede indicar un aumento en la incidencia o prevalencia de ciertas patologías, mientras que los CUPS inesperados pueden señalar cambios en la práctica clínica o la aparición de nuevas necesidades terapéuticas no contempladas en el modelo inicial. Es crucial realizar un análisis de causa raíz sobre los CUPS con mayor desviación para determinar si se requieren ajustes en la nota técnica para futuros períodos o si es necesario implementar intervenciones de gestión de la demanda.`,
              barChartData: topOverExecuted,
              barChartDataKey: 'Desviación',
              barChartTitle: 'Top 5 CUPS Sobre-ejecutados (por desviación)',
              tableData: data.overExecutedCups,
              tableHeaders: ['CUPS', 'Descripción', 'Frec. Esperada', 'Frec. Real', 'Desviación'],
              tableBody: (data.overExecutedCups ?? []).map(item => [item.cup, item.description ?? 'N/A', item.expectedFrequency.toFixed(0), item.realFrequency, item.deviation.toFixed(0)]),
            },
            {
                title: '',
                text: '',
                barChartData: topUnexpected,
                barChartDataKey: 'Frecuencia',
                barChartTitle: 'Top 5 CUPS Inesperados (por frecuencia)',
                tableData: data.unexpectedCups,
                tableHeaders: ['CUPS', 'Frecuencia Real'],
                tableBody: (data.unexpectedCups ?? []).map(item => [item.cup, item.realFrequency]),
            },
            {
              title: 'Conclusiones y Recomendaciones Estratégicas',
              text: `El análisis integral del segundo trimestre demuestra un desempeño robusto y alineado con los objetivos del modelo PGP. La ejecución financiera y operacional se encuentra en un estado de equilibrio, cumpliendo las metas contractuales y garantizando la atención en salud de la población afiliada.\n\nRecomendaciones:\n1. Iniciar auditorías concurrentes y de pares sobre los CUPS con mayor sobre-ejecución y los inesperados más frecuentes para validar pertinencia médica y adherencia a guías de práctica clínica.\n2. Mantener la monitorización continua de los indicadores clave, con especial atención al costo unitario, para detectar cualquier desviación temprana en la complejidad de los casos atendidos.\n3. Iniciar la planificación del siguiente ciclo de negociación del PGP utilizando los datos de ejecución de este período como base actuarial para ajustar la nota técnica futura, asegurando que refleje con precisión el perfil de riesgo y las necesidades de la población.\n4. Realizar un análisis cualitativo de los CUPS más frecuentes para validar que la atención se está centrando en las prioridades de salud pública definidas para la región.`
            },
        ],
        ciudad: data.header.ciudad ?? '',
        fecha: data.header.fecha ?? '',
        firmas: [
            data.header.responsable1 ?? { nombre: '________________', cargo: '________________' },
            data.header.responsable2 ?? { nombre: '________________', cargo: '________________' },
            data.header.responsable3 ?? { nombre: '________________', cargo: '________________' },
        ]
    };
  }

  // Exportación a PDF con pdfmake
  const handleGeneratePdf = async (action: 'preview' | 'download') => {
    if (!data) return;
    setIsGeneratingPdf(true);
    try {
        const backgroundImage = await loadImageAsBase64('/imagenes pdf/IMAGENEN UNIFICADA.jpg');
        const informeData = getInformeData(data);
        
        if(action === 'preview') {
            const url = await generarURLInformePDF(informeData, backgroundImage);
            setPdfPreviewUrl(url);
        } else if (action === 'download') {
            await descargarInformePDF(informeData, backgroundImage);
            setPdfPreviewUrl(null); // Cierra el modal si estaba abierto
        }

    } catch (error) {
        console.error("Error generating PDF:", error);
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  if (!data) {
    return null; // O un placeholder si se prefiere
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      {/* Encabezado y acciones */}
      <div className="flex items-start justify-between no-print">
        <div className="text-sm">
          <div className="font-semibold">{data.header.empresa} – NIT {data.header.nit}</div>
          <div>Municipio: {data.header.municipio} | Contrato: {data.header.contrato}</div>
          <div>Vigencia: {data.header.vigencia}</div>
        </div>
        <div className="flex gap-2">
           <Button variant="default" onClick={() => handleGeneratePdf('preview')} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin"/> : <DownloadCloud className="h-4 w-4 mr-1"/>}
            Generar PDF
          </Button>
        </div>
      </div>

       <Dialog open={!!pdfPreviewUrl} onOpenChange={(isOpen) => !isOpen && setPdfPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista Previa del Informe</DialogTitle>
          </DialogHeader>
          <div className="flex-grow border rounded-md overflow-hidden">
            {pdfPreviewUrl && (
              <iframe src={pdfPreviewUrl} className="w-full h-full" title="Vista previa del PDF" />
            )}
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setPdfPreviewUrl(null)}>Cerrar</Button>
            <Button onClick={() => handleGeneratePdf('download')} disabled={isGeneratingPdf}>
              {isGeneratingPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <DownloadCloud className="h-4 w-4 mr-1" />}
              Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>INFORME PGP – TRIMESTRE II (Abr–Jun)</CardTitle>
            </div>
            {(data.header.ciudad || data.header.fecha) && (
              <div className="text-sm text-muted-foreground">
                {data.header.ciudad ?? ""}{data.header.ciudad && data.header.fecha ? ", " : ""}{data.header.fecha ?? ""}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Objetivos */}
          <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Activity className="h-4 w-4"/> Objetivos del Acta</h3>
            <ul className="list-disc pl-6 text-sm text-muted-foreground">
              <li>Revisión de la gestión financiera y disciplina presupuestal.</li>
              <li>Impacto en la calidad del servicio y continuidad del acceso.</li>
              <li>Reconocimiento de cambios demográficos y ajuste de oferta.</li>
              <li>Validación de valores financieros del PGP (ejecutado, anticipos, pagos).</li>
            </ul>
          </section>

          {/* Nota Técnica */}
          <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Info className="h-4 w-4"/> Nota Técnica y KPIs</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th>Concepto</th>
                    <th className="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="[&>tr>td]:py-1">
                  <tr><td>90% mínimo permitido</td><td className="text-right">{formatCOP(data.notaTecnica?.min90 || 0)}</td></tr>
                  <tr><td>Meta 3 meses (nota técnica)</td><td className="text-right">{formatCOP(data.notaTecnica?.valor3m || 0)}</td></tr>
                  <tr className="font-bold"><td>Suma ejecución (T2)</td><td className="text-right">{formatCOP(sumaMensual)}</td></tr>
                  <tr><td>Diferencia vs meta</td><td className="text-right">{formatCOP(diffVsNota)}</td></tr>
                  <tr><td>110% máximo permitido</td><td className="text-right">{formatCOP(data.notaTecnica?.max110 || 0)}</td></tr>
                  <tr className="border-t mt-2 pt-2"><td>Anticipos (modelo 80/20)</td><td className="text-right">{formatCOP(data.notaTecnica?.anticipos || 0)}</td></tr>
                  <tr><td>Total a pagar (3er mes)</td><td className="text-right">{formatCOP(data.notaTecnica?.totalPagar || 0)}</td></tr>
                  <tr className="font-bold"><td>Total final</td><td className="text-right">{formatCOP(data.notaTecnica?.totalFinal || 0)}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Gráfico: Ejecución financiera */}
          <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4"/> Ejecución Financiera (COP)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Mes" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${new Intl.NumberFormat("es-CO", { notation: "compact" }).format(v as number)}`} />
                  <Tooltip formatter={(value) => formatCOP(value as number)} />
                  <Bar dataKey="Valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Gráfico: CUPS (cantidad) */}
          <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4"/> CUPS (Cantidad)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cupsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Mes" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => `${(value as number).toLocaleString('es-CO')} CUPS`} />
                  <Line type="monotone" dataKey="CUPS" stroke="hsl(var(--accent))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Gráfico: Costo unitario */}
          <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><BarChart2 className="h-4 w-4"/> Costo Unitario (COP/CUPS)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={unitData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Mes" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCOP(v as number)} />
                  <Tooltip formatter={(value) => formatCOP(value as number)} />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey="Unit" name="Costo Unitario" stroke="hsl(var(--destructive))" strokeWidth={2} />
                  <ReferenceLine y={unitAvg} name="Promedio" label={{ value: `Promedio: ${formatCOP(unitAvg)}`, position: 'insideTopLeft' }} stroke="hsl(var(--foreground))" strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Conclusiones y Proyecciones */}
          <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Info className="h-4 w-4"/> Conclusiones y Proyecciones</h3>
            <p className="text-sm text-muted-foreground">
              El trimestre evidencia estabilidad financiera (COP), operacional (CUPS) y técnica (COP/CUPS), con
              ejecución dentro de la banda 90–110% de la Nota Técnica. Proyectando la tendencia observada, se
              espera mantenimiento del equilibrio sin presiones significativas.
            </p>
          </section>

          {/* Firmas */}
          <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Stamp className="h-4 w-4"/> Firmas</h3>
            <div className="grid gap-8 md:grid-cols-3 pt-8">
              {[data.header.responsable1, data.header.responsable2, data.header.responsable3]
                .filter((r): r is { nombre: string; cargo: string } => Boolean(r))
                .map((r, idx) => (
                  <div key={idx} className="text-sm text-center">
                    <div className="h-14 border-b border-muted" />
                    <div className="mt-2 font-semibold">{r.nombre}</div>
                    <div className="text-muted-foreground">{r.cargo}</div>
                  </div>
                ))}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
