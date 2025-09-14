"use client";

import React, { useMemo, useState, useRef } from "react";
import html2canvas from "html2canvas";
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
import type { DeviatedCupInfo, ComparisonSummary } from "@/components/pgp-search/PgPsearchForm";

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
 Vigencia: string;
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
  unexpectedCups?: { cup: string; realFrequency: number, description?: string }[];
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
export default function InformePGP({ comparisonSummary, pgpData, data = defaultData }: {
    comparisonSummary: ComparisonSummary | null;
    pgpData: any[];
    data?: ReportData | null
}) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const financialChartRef = useRef<HTMLDivElement>(null);
  const cupsChartRef = useRef<HTMLDivElement>(null);
  const unitChartRef = useRef<HTMLDivElement>(null);
  
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

  const getInformeData = (reportData: ReportData, charts: { [key: string]: string }): InformeDatos => {
    const valorNotaTecnica = reportData.notaTecnica?.valor3m || 0;
    const porcentajeEjecucion = valorNotaTecnica > 0 ? (sumaMensual / valorNotaTecnica) * 100 : 0;

    const kpis = [
        { label: 'Suma Ejecución (Trimestre)', value: formatCOP(sumaMensual) },
        { label: 'Nota Técnica (Presupuesto)', value: formatCOP(valorNotaTecnica) },
        { label: 'Diferencia vs. Presupuesto', value: formatCOP(diffVsNota) },
        { label: 'Porcentaje de Ejecución', value: `${porcentajeEjecucion.toFixed(2)}%` },
        { label: 'Total CUPS Ejecutados', value: totalCups.toLocaleString('es-CO') },
        { label: 'Costo Unitario Promedio (COP/CUPS)', value: formatCOP(unitAvg) },
    ];
    
    const topOverExecuted = (reportData.overExecutedCups ?? [])
        .sort((a,b) => b.deviation - a.deviation)
        .slice(0, 5);

    const topUnexpected = (reportData.unexpectedCups ?? [])
        .sort((a, b) => b.realFrequency - a.realFrequency)
        .slice(0, 5);

    return {
        titulo: 'INFORME EJECUTIVO DE SEGUIMIENTO PGP',
        subtitulo: `${reportData.header.empresa} | NIT ${reportData.header.nit}`,
        referencia: `Contrato: ${reportData.header.contrato} | Vigencia: ${reportData.header.vigencia} | Período Analizado: Trimestre II`,
        objetivos: [
            'Evaluar la eficiencia en la ejecución de los recursos asignados bajo el modelo de Pago Global Prospectivo (PGP), contrastando el gasto real con la proyección actuarial de la nota técnica, para garantizar la sostenibilidad financiera y la disciplina presupuestal del acuerdo.',
            'Analizar el comportamiento epidemiológico y el perfil de morbilidad de la población adscrita a través del volumen, tipo y frecuencia de los servicios (CUPS) prestados, con el fin de identificar tendencias, necesidades de salud emergentes y posibles desviaciones respecto al perfil de riesgo inicial.',
            'Verificar el cumplimiento de las metas contractuales y la alineación con las bandas de riesgo técnico (90% - 110%), proveyendo un fundamento cuantitativo y cualitativo para la toma de decisiones gerenciales, ajustes operativos y la validación de los actos administrativos de pago y liquidación trimestral.',
            'Proporcionar un análisis integral que sirva como insumo estratégico para la planeación de futuros periodos contractuales, permitiendo ajustar la nota técnica y las intervenciones de salud a las realidades observadas en la ejecución del servicio.',
        ],
        kpis,
        analisis: [
            { 
              title: 'Análisis de Ejecución Financiera y Presupuestal', 
              chartImage: charts.financial,
              text: `Durante el segundo trimestre del presente ejercicio, la ejecución financiera consolidada del contrato PGP ascendió a un total de ${formatCOP(sumaMensual)}. Este valor, al ser contrastado con el presupuesto proyectado en la nota técnica para el mismo período, que es de ${formatCOP(valorNotaTecnica)}, revela una ejecución del ${porcentajeEjecucion.toFixed(2)}%. Este resultado es de suma importancia estratégica, ya que se sitúa cómodamente dentro de la banda de control contractual, establecida entre el 90% y el 110% del valor técnico. Dicha alineación indica, en primera instancia, una gestión presupuestal estable, predecible y disciplinada, minimizando los riesgos de desviaciones financieras significativas que pudieran comprometer la sostenibilidad del modelo de atención. \n\nLa desviación absoluta frente a la meta presupuestal es de ${formatCOP(diffVsNota)}, una cifra que, en términos relativos, se considera manejable y no genera alertas sobre desequilibrios estructurales en el corto plazo. La uniformidad observada en el gasto mensual, sin picos abruptos o valles pronunciados, sugiere una operación consistente y una demanda de servicios regularizada, lo cual es altamente positivo para la planificación de la cartera, el flujo de caja de la IPS y la garantía de continuidad en la atención al usuario. \n\nDesde una perspectiva de proyección, si se mantiene esta tendencia de ejecución controlada y estable, es plausible estimar que la ejecución anualizada del contrato se alineará estrechamente con el presupuesto global definido en la nota técnica. Este escenario es ideal, pues minimiza el riesgo de incurrir en déficits operativos o generar excedentes que podrían indicar una sub-utilización de los recursos y, potencialmente, barreras de acceso no identificadas. La predictibilidad del gasto es un pilar para la confianza entre las partes y la viabilidad a largo plazo del modelo PGP.` 
            },
            { 
              title: 'Análisis del Comportamiento Epidemiológico y de Servicios (CUPS)', 
              chartImage: charts.cups,
              text: `Desde el punto de vista operacional y epidemiológico, se autorizaron y prestaron un total de ${totalCups.toLocaleString('es-CO')} CUPS (Clasificación Única de Procedimientos en Salud) durante el trimestre. Este volumen de servicios, al ser analizado, nos permite obtener una radiografía del estado de salud de la población y la respuesta del prestador. El costo unitario promedio ponderado, que se calcula dividiendo el valor total ejecutado entre el número de CUPS, se situó en ${formatCOP(unitAvg)}. Este KPI es un indicador clave de la complejidad y el valor promedio de cada servicio prestado, y su estabilidad a lo largo del tiempo es un síntoma de una cartera de servicios controlada. \n\nLa consistencia en el volumen de CUPS a lo largo de los meses de Abril, Mayo y Junio refleja una demanda de servicios constante y una capacidad de respuesta adecuada por parte de la red prestadora. Esta predictibilidad es fundamental en la gestión de la salud pública, ya que sugiere un acceso continuo y oportuno a los servicios, y una baja probabilidad de represamiento de la demanda o de 'demanda oculta' que pudiera emerger abruptamente en períodos posteriores. No se observan en los datos agregados anomalías que sugieran brotes epidemiológicos inesperados o la instauración de barreras de acceso significativas que hubieran podido contraer la utilización. \n\nLa proyección basada en esta estabilidad operativa es favorable: permite estimar con un alto grado de confianza las necesidades de recursos para los siguientes trimestres, no solo financieros, sino también de talento humano, insumos médicos, y capacidad instalada. Esta información es vital para una gestión proactiva que anticipe las necesidades en lugar de reaccionar a ellas, garantizando así la calidad y oportunidad en la prestación del servicio.`
            },
             {
              title: 'Análisis de Costo Unitario (Complejidad Promedio)',
              chartImage: charts.unit,
              text: 'El análisis del costo unitario (COP/CUPS) nos ofrece una visión sobre la complejidad promedio de los servicios prestados. Un costo unitario estable sugiere una mezcla de servicios consistente, mientras que fluctuaciones pueden indicar cambios en el perfil de complejidad de los pacientes o en las prácticas de tratamiento. En este trimestre, el costo unitario ha mostrado una tendencia estable, lo que refuerza la conclusión de una operación predecible.'
            },
            {
              title: 'Análisis de Desviaciones: CUPS Sobre-ejecutados e Inesperados',
              text: `A pesar de la estabilidad general, un análisis detallado de las desviaciones a nivel de procedimiento individual revela áreas críticas que requieren atención gerencial inmediata. Se identificaron un total de ${reportData.overExecutedCups?.length ?? 0} CUPS con una ejecución superior al 111% de lo presupuestado en la nota técnica y ${reportData.unexpectedCups?.length ?? 0} CUPS que fueron ejecutados sin estar previstos en la misma. Estos dos grupos de procedimientos constituyen los principales focos de riesgo financiero y operativo, y su análisis es fundamental para el control del contrato. A continuación, se presenta una tabla con los procedimientos más críticos de cada grupo. \n\nLos procedimientos sobre-ejecutados pueden ser indicativos de varias situaciones: un aumento en la incidencia o prevalencia de ciertas patologías en la población, cambios en las guías de práctica clínica que favorecen un procedimiento sobre otro, o incluso posibles ineficiencias o sobre-utilización que deben ser auditadas. Es imperativo iniciar un análisis de causa raíz sobre estos procedimientos, cruzando la información con datos de perfiles epidemiológicos y diagnósticos (CIE-10) para determinar si la sobre-ejecución está clínicamente justificada o si, por el contrario, representa una oportunidad de mejora en la gestión de la pertinencia médica. \n\nPor otro lado, los CUPS inesperados representan una desviación cualitativa del modelo. Estos procedimientos, al no estar en la nota técnica, no fueron contemplados en la prima y, por tanto, impactan directamente la siniestralidad. La presencia de estos CUPS puede deberse a la aparición de nuevas necesidades terapéuticas, la codificación de tecnologías no incluidas en el plan de beneficios, o cambios en la práctica clínica local. Su análisis es crucial para determinar si la nota técnica requiere una actualización para incluir estas nuevas realidades o si se trata de eventos aislados que pueden ser gestionados caso a caso. Ambos tipos de desviación deben ser objeto de auditoría concurrente y de pares para validar su pertinencia y tomar las acciones correctivas o administrativas que correspondan.`
            },
        ],
        topOverExecuted,
        topUnexpected,
        ciudad: reportData.header.ciudad ?? '',
        fecha: reportData.header.fecha ?? '',
        firmas: [
            reportData.header.responsable1 ?? { nombre: '________________', cargo: '________________' },
            reportData.header.responsable2 ?? { nombre: '________________', cargo: '________________' },
            reportData.header.responsable3 ?? { nombre: '________________', cargo: '________________' },
        ]
    };
  }

  // Exportación a PDF con pdfmake
  const handleGeneratePdf = async (action: 'preview' | 'download') => {
    if (!data) return;
    setIsGeneratingPdf(true);

    try {
        const backgroundImage = await loadImageAsBase64('/imagenes pdf/IMAGENEN UNIFICADA.jpg');

        const getChartImage = async (ref: React.RefObject<HTMLDivElement>) => {
            if (ref.current) {
                const canvas = await html2canvas(ref.current, { backgroundColor: null });
                return canvas.toDataURL('image/png');
            }
            return '';
        };

        const chartImages = {
            financial: await getChartImage(financialChartRef),
            cups: await getChartImage(cupsChartRef),
            unit: await getChartImage(unitChartRef),
        };

        const informeData = getInformeData(data, chartImages);
        
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
            Generar PDF (Recomendado)
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
          <section ref={financialChartRef}>
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
          <section ref={cupsChartRef}>
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
          <section ref={unitChartRef}>
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
