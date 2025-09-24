

"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Info, Activity, Stamp, Loader2, DownloadCloud, X, BarChart2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
import type { DeviatedCupInfo, ComparisonSummary, UnexpectedCupInfo, AdjustedData } from "@/components/pgp-search/PgPsearchForm";
import { generateReportAnalysis } from "@/ai/flows/generate-report-analysis-flow";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";

// ======= Tipos =======
export interface MonthExecution {
  month: string;
  cups: number; // cantidad (no dinero)
  valueCOP: number; // valor ejecutado COP
}

export interface ReportHeader {
  empresa: string;
  nit: string;
  ipsNombre: string;
  ipsNit: string;
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
  underExecutedCups?: DeviatedCupInfo[];
  missingCups?: DeviatedCupInfo[];
  unexpectedCups?: UnexpectedCupInfo[];
  adjustedData?: AdjustedData;
}

interface ReportAnalysisInput {
    sumaMensual: number;
    valorNotaTecnica: number;
    diffVsNota: number;
    porcentajeEjecucion: number;
    totalCups: number;
    unitAvg: number;
    overExecutedCount: number;
    unexpectedCount: number;
    overExecutedCups: (DeviatedCupInfo & { comment?: string })[];
    underExecutedCups: DeviatedCupInfo[];
    missingCups: DeviatedCupInfo[];
    unexpectedCups: UnexpectedCupInfo[];
    valorNetoFinal: number; 
    descuentoAplicado: number;
    additionalConclusions?: string;
    additionalRecommendations?: string;
}

interface ReportAnalysisOutput {
  financialAnalysis: string;
  epidemiologicalAnalysis: string;
  deviationAnalysis: string;
  clinicalAnalysis: string;
}

const EditableTextsModal = ({
    open,
    onOpenChange,
    onSave,
    initialConclusions,
    initialRecommendations,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (conclusions: string, recommendations: string) => void;
    initialConclusions: string;
    initialRecommendations: string;
}) => {
    const [conclusions, setConclusions] = useState(initialConclusions);
    const [recommendations, setRecommendations] = useState(initialRecommendations);

    useEffect(() => {
        if(open) {
            setConclusions(initialConclusions);
            setRecommendations(initialRecommendations);
        }
    }, [open, initialConclusions, initialRecommendations]);

    const handleSave = () => {
        onSave(conclusions, recommendations);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Editar Conclusiones y Recomendaciones</DialogTitle>
                    <DialogDescription>
                        Añade o modifica el análisis final que aparecerá en el informe PDF.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="conclusions-text">Conclusiones Adicionales</Label>
                        <Textarea
                            id="conclusions-text"
                            value={conclusions}
                            onChange={(e) => setConclusions(e.target.value)}
                            placeholder="Escribe tus conclusiones finales aquí..."
                            className="min-h-[150px]"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="recommendations-text">Recomendaciones Adicionales</Label>
                        <Textarea
                            id="recommendations-text"
                            value={recommendations}
                            onChange={(e) => setRecommendations(e.target.value)}
                            placeholder="Escribe tus recomendaciones finales aquí..."
                            className="min-h-[150px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave}>Guardar Textos</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


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

// ======= Componente (fusionado y reforzado) =======
export default function InformePGP({ data }: { data?: ReportData | null }) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const [conclusions, setConclusions] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const financialChartRef = useRef<HTMLDivElement>(null);
  const cupsChartRef = useRef<HTMLDivElement>(null);
  const unitChartRef = useRef<HTMLDivElement>(null);
  
  // Derivados y KPIs
  const sumaMensual = useMemo(() => data?.months.reduce((acc, m) => acc + m.valueCOP, 0) ?? 0, [data?.months]);
  const totalCups = useMemo(() => data?.months.reduce((a, m) => a + m.cups, 0) ?? 0, [data?.months]);
  
  const descuentoAplicadoTotal = useMemo(() => {
    if (!data || !data.adjustedData) return 0;
    return Object.values(data.adjustedData.adjustedValues || {}).reduce((sum, val) => sum + val, 0);
  }, [data]);
  
  const valorNetoFinalAuditoria = useMemo(() => {
     if (!data) return 0;
     const valorEjecutadoTotal = data.months.reduce((acc, m) => acc + m.valueCOP, 0) ?? 0;
     return valorEjecutadoTotal - descuentoAplicadoTotal;
  }, [data, descuentoAplicadoTotal]);


  const diffVsNota = useMemo(() => valorNetoFinalAuditoria - (data?.notaTecnica?.valor3m || 0), [data?.notaTecnica?.valor3m, valorNetoFinalAuditoria]);
  
  const unitAvg = useMemo(() => {
    if (!data || !data.months || data.months.length === 0 || totalCups === 0) return 0;
    const mean = valorNetoFinalAuditoria / totalCups;
    return Number.isFinite(mean) ? mean : 0;
  }, [data?.months, valorNetoFinalAuditoria, totalCups]);

  const valorNotaTecnica = useMemo(() => data?.notaTecnica?.valor3m || 0, [data]);

  const porcentajeEjecucion = useMemo(() => (valorNotaTecnica > 0 ? (valorNetoFinalAuditoria / valorNotaTecnica) * 100 : 0), [valorNetoFinalAuditoria, valorNotaTecnica]);


    const reportTitle = useMemo(() => {
    if (!data || !data.months || data.months.length === 0) {
      return "INFORME PGP";
    }

    const numMonths = data.months.length;
    const monthNames = data.months.map(m => m.month.substring(0, 3)).join('–');

    switch (numMonths) {
      case 1:
        return `INFORME PGP – MENSUAL (${monthNames})`;
      case 2:
        return `INFORME PGP – BIMESTRAL (${monthNames})`;
      case 3:
        return `INFORME PGP – TRIMESTRAL (${monthNames})`;
      default:
        return `INFORME PGP – PERIODO (${monthNames})`;
    }
  }, [data]);


  // Series para gráficas
  const barData = useMemo(() => data?.months.map((m) => ({ Mes: m.month, Valor: m.valueCOP })) ?? [], [data?.months]);
  const cupsData = useMemo(() => data?.months.map((m) => ({ Mes: m.month, CUPS: m.cups })) ?? [], [data?.months]);
  const unitData = useMemo(() => data?.months.map((m) => ({ Mes: m.month, Unit: m.cups > 0 ? m.valueCOP / m.cups : 0, Promedio: unitAvg })) ?? [], [data?.months, unitAvg]);

  const getInformeData = (reportData: ReportData, charts: { [key: string]: string }, analysisTexts: ReportAnalysisOutput, auditorConclusions: string, auditorRecommendations: string): InformeDatos => {
    
    const periodoAnalizado = reportTitle.split('–')[1]?.trim() || 'Periodo Analizado';


    const kpis = [
        { label: 'Nota Técnica (Presupuesto)', value: formatCOP(valorNotaTecnica) },
        { label: 'Valor Ejecutado (Bruto)', value: formatCOP(sumaMensual) },
        { label: 'Descuento Aplicado (Auditoría)', value: formatCOP(descuentoAplicadoTotal), color: 'red' },
        { label: 'Valor Final a Pagar (Post-Auditoría)', value: formatCOP(valorNetoFinalAuditoria), bold: true },
        { label: 'Diferencia vs. Presupuesto', value: formatCOP(diffVsNota) },
        { label: 'Porcentaje de Ejecución Final', value: `${porcentajeEjecucion.toFixed(2)}%` },
        { label: 'Total CUPS Ejecutados', value: totalCups.toLocaleString('es-CO') },
        { label: 'Costo Unitario Promedio (Post-Auditoría)', value: formatCOP(unitAvg) },
    ];
    
    const topOverExecuted = (reportData.overExecutedCups ?? [])
        .sort((a,b) => b.deviation - a.deviation)
        .slice(0, 5);

    const topUnexpected = (reportData.unexpectedCups ?? [])
        .sort((a, b) => b.realFrequency - a.realFrequency)
        .slice(0, 5);
    
    const adjustmentsForPdf = Object.entries(reportData.adjustedData?.comments || {})
      .map(([cup, comment]) => {
        const overExecutedCup = reportData.overExecutedCups?.find(c => c.cup === cup);
        if (!overExecutedCup || !comment) return null;

        const validatedQty = reportData.adjustedData?.adjustedQuantities[cup] ?? overExecutedCup.realFrequency;
        
        return {
          cup: cup,
          description: overExecutedCup.description || 'N/A',
          originalQty: overExecutedCup.realFrequency,
          validatedQty: validatedQty,
          adjustmentValue: reportData.adjustedData?.adjustedValues[cup] || 0,
          comment: comment,
        };
      })
      .filter(Boolean) as InformeDatos['ajustesGlosas'];


    return {
        titulo: `INFORME PGP: ${reportData.header.ipsNombre}`,
        subtitulo: `Auditoría para: ${reportData.header.empresa}`,
        referencia: `Contrato: ${reportData.header.contrato} | Vigencia: ${reportData.header.vigencia} | Período Analizado: ${periodoAnalizado}`,
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
              text: analysisTexts.financialAnalysis,
            },
            { 
              title: 'Análisis del Comportamiento Epidemiológico y de Servicios (CUPS)', 
              chartImage: charts.cups,
              text: analysisTexts.epidemiologicalAnalysis,
            },
             {
              title: 'Análisis de Costo Unitario (Complejidad Promedio)',
              chartImage: charts.unit,
              text: 'El análisis del costo unitario (COP/CUPS) nos ofrece una visión sobre la complejidad promedio de los servicios prestados. Un costo unitario estable sugiere una mezcla de servicios consistente, mientras que fluctuaciones pueden indicar cambios en el perfil de complejidad de los pacientes o en las prácticas de tratamiento. En este periodo, el costo unitario ha mostrado una tendencia estable, lo que refuerza la conclusión de una operación predecible.'
            },
            {
              title: 'Análisis de Desviaciones: CUPS Sobre-ejecutados e Inesperados',
              text: analysisTexts.deviationAnalysis,
            },
            {
              title: 'Análisis Clínico y de Pertinencia Médica',
              text: analysisTexts.clinicalAnalysis,
            },
        ],
        topOverExecuted,
        topUnexpected,
        ajustesGlosas: adjustmentsForPdf,
        auditorConclusions: auditorConclusions,
        auditorRecommendations: auditorRecommendations,
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
    if(action === 'preview') setPdfPreviewUrl(null);

    toast({ title: 'Generando informe...', description: 'La IA está redactando el análisis. Esto puede tardar un momento.' });

    try {
        
        const overExecutedCupsWithComments = (data.overExecutedCups ?? []).map(cup => ({
            ...cup,
            comment: data.adjustedData?.comments[cup.cup] || undefined,
        }));

        const analysisInput: ReportAnalysisInput = {
            sumaMensual,
            valorNotaTecnica,
            diffVsNota,
            porcentajeEjecucion,
            totalCups,
            unitAvg,
            overExecutedCount: data.overExecutedCups?.length ?? 0,
            unexpectedCount: data.unexpectedCups?.length ?? 0,
            overExecutedCups: overExecutedCupsWithComments,
            underExecutedCups: data.underExecutedCups ?? [],
            missingCups: data.missingCups ?? [],
            unexpectedCups: data.unexpectedCups ?? [],
            valorNetoFinal: valorNetoFinalAuditoria,
            descuentoAplicado: descuentoAplicadoTotal,
            additionalConclusions: conclusions,
            additionalRecommendations: recommendations,
        };

        const analysisTexts = await generateReportAnalysis(analysisInput);

        toast({ title: 'Análisis completo.', description: 'Generando gráficos y PDF.' });

        const backgroundImage = await loadImageAsBase64('/imagenes pdf/IMAGENEN UNIFICADA.jpg');

        const getChartImage = async (ref: React.RefObject<HTMLDivElement>) => {
            if (ref.current) {
                const canvas = await html2canvas(ref.current, { backgroundColor: '#FFFFFF', scale: 2 });
                return canvas.toDataURL('image/png');
            }
            return '';
        };
        
        const chartImages = {
            financial: await getChartImage(financialChartRef),
            cups: await getChartImage(cupsChartRef),
            unit: await getChartImage(unitChartRef),
        };

        const informeData = getInformeData(data, chartImages, analysisTexts, conclusions, recommendations);
        
        if(action === 'preview') {
            const url = await generarURLInformePDF(informeData, backgroundImage);
            setPdfPreviewUrl(url);
        } else if (action === 'download') {
            await descargarInformePDF(informeData, backgroundImage);
            setPdfPreviewUrl(null); // Cierra el modal si estaba abierto
        }

    } catch (error: any) {
        console.error("Error generating PDF:", error);
        toast({ title: 'Error al generar el informe', description: error.message, variant: 'destructive' });
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  if (!data || !barData.length) {
    return null;
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generación de Informe Ejecutivo PDF</CardTitle>
           <CardDescription>
                Genera un informe PDF completo con análisis de IA y tus conclusiones personalizadas.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
             <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Conclusiones y Recomendaciones
            </Button>
            <Button variant="default" onClick={() => handleGeneratePdf('preview')} disabled={isGeneratingPdf}>
                {isGeneratingPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin"/> : <DownloadCloud className="h-4 w-4 mr-1"/>}
                Generar Informe PDF
            </Button>
        </CardContent>
      </Card>
      

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
      
      <EditableTextsModal
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            initialConclusions={conclusions}
            initialRecommendations={recommendations}
            onSave={(newConclusions, newRecommendations) => {
                setConclusions(newConclusions);
                setRecommendations(newRecommendations);
            }}
        />
      
      {/* Hidden container for rendering charts for PDF */}
      <div className="absolute -left-[9999px] top-0 w-[600px] space-y-8 bg-white p-4">
          <section ref={financialChartRef}>
             <h3 className="text-center font-semibold text-sm mb-2">Ejecución Financiera Mensual</h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Mes" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${new Intl.NumberFormat("es-CO", { notation: "compact" }).format(v as number)}`} />
                  <Tooltip formatter={(value) => formatCOP(value as number)} />
                  <Bar dataKey="Valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
           <section ref={cupsChartRef}>
            <h3 className="text-center font-semibold text-sm mb-2">Volumen de CUPS Mensual</h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cupsData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Mes" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => `${(value as number).toLocaleString('es-CO')} CUPS`} />
                  <Line type="monotone" dataKey="CUPS" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section ref={unitChartRef}>
           <h3 className="text-center font-semibold text-sm mb-2">Costo Unitario Promedio</h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={unitData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Mes" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={['dataMin - 1000', 'dataMax + 1000']} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCOP(v as number)} />
                  <Tooltip formatter={(value) => formatCOP(value as number)} />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey="Unit" name="Costo Unitario" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                  <ReferenceLine y={unitAvg} name="Promedio" stroke="hsl(var(--foreground))" strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
      </div>

    </div>
  );
}

    
