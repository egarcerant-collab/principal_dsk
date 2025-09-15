
'use server';
/**
 * @fileOverview A flow to generate professional analysis text for a PGP report.
 * - generateReportAnalysis - A function that returns AI-generated text for the report sections.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReportAnalysisInputSchema = z.object({
    sumaMensual: z.number().describe("El valor total ejecutado en el periodo."),
    valorNotaTecnica: z.number().describe("El valor presupuestado en la nota técnica para el periodo."),
    diffVsNota: z.number().describe("La diferencia monetaria entre lo ejecutado y lo presupuestado."),
    porcentajeEjecucion: z.number().describe("El porcentaje de ejecución (ejecutado / presupuestado)."),
    totalCups: z.number().describe("La cantidad total de CUPS ejecutados."),
    unitAvg: z.number().describe("El costo unitario promedio (valor total / cantidad de CUPS)."),
    overExecutedCount: z.number().describe("La cantidad de CUPS que fueron sobre-ejecutados."),
    unexpectedCount: z.number().describe("La cantidad de CUPS ejecutados que no estaban en la nota técnica."),
});
export type ReportAnalysisInput = z.infer<typeof ReportAnalysisInputSchema>;

const ReportAnalysisOutputSchema = z.object({
  financialAnalysis: z.string().describe("Texto del análisis de ejecución financiera y presupuestal."),
  epidemiologicalAnalysis: z.string().describe("Texto del análisis del comportamiento epidemiológico y de servicios (CUPS)."),
  deviationAnalysis: z.string().describe("Texto del análisis de desviaciones (CUPS sobre-ejecutados e inesperados)."),
});
export type ReportAnalysisOutput = z.infer<typeof ReportAnalysisOutputSchema>;


export async function generateReportAnalysis(input: ReportAnalysisInput): Promise<ReportAnalysisOutput> {
  return generateReportAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReportAnalysisPrompt',
  input: {schema: ReportAnalysisInputSchema},
  output: {schema: ReportAnalysisOutputSchema},
  prompt: `Eres un analista financiero y gerente de salud experto en el sistema de salud colombiano, especializado en contratos de Pago Global Prospectivo (PGP).
  Tu tarea es redactar los textos de análisis para un informe ejecutivo basado en los siguientes KPIs.
  Usa un lenguaje profesional, claro, y directo, enfocado en la toma de decisiones gerenciales.

  KPIs del Periodo:
  - Valor Total Ejecutado: {{sumaMensual}}
  - Presupuesto (Nota Técnica): {{valorNotaTecnica}}
  - Diferencia vs Presupuesto: {{diffVsNota}}
  - Porcentaje de Ejecución: {{porcentajeEjecucion}}%
  - Total CUPS Ejecutados: {{totalCups}}
  - Costo Unitario Promedio (COP/CUPS): {{unitAvg}}
  - Cantidad de CUPS Sobre-ejecutados (>111%): {{overExecutedCount}}
  - Cantidad de CUPS Inesperados (No en NT): {{unexpectedCount}}

  Genera los siguientes tres bloques de texto en el formato JSON especificado, cada uno con una extensión de entre 1200 y 1500 caracteres:

  1.  **financialAnalysis**: Análisis de Ejecución Financiera y Presupuestal.
      - Compara la ejecución con el presupuesto y las bandas de control (90%-110%).
      - Evalúa la estabilidad, predictibilidad y disciplina del gasto.
      - Analiza la desviación absoluta y relativa y su impacto en la sostenibilidad.
      - Proyecta el comportamiento anualizado si la tendencia se mantiene.

  2.  **epidemiologicalAnalysis**: Análisis del Comportamiento Epidemiológico y de Servicios (CUPS).
      - Analiza el volumen total de CUPS y su consistencia mensual.
      - Interpreta el costo unitario promedio como un indicador de complejidad.
      - Relaciona la estabilidad de la demanda con el acceso a servicios y la capacidad de la red.
      - Proyecta las necesidades de recursos futuros (financieros, humanos, etc.) basado en la operación.

  3.  **deviationAnalysis**: Análisis de Desviaciones: CUPS Sobre-ejecutados e Inesperados.
      - Enfatiza que estos dos grupos son el principal foco de riesgo financiero y operativo.
      - Explica las posibles causas de la sobre-ejecución (aumento de incidencia, cambios en guías clínicas, ineficiencias).
      - Explica las implicaciones de los CUPS inesperados (impacto en la prima, necesidad de actualizar la nota técnica).
      - Recomienda acciones concretas como auditoría concurrente, análisis de causa raíz y validación de pertinencia médica.
  `,
  model: 'googleai/gemini-2.5-flash',
});

const generateReportAnalysisFlow = ai.defineFlow(
  {
    name: 'generateReportAnalysisFlow',
    inputSchema: ReportAnalysisInputSchema,
    outputSchema: ReportAnalysisOutputSchema,
  },
  async (input) => {
    try {
        const {output} = await prompt(input);
        if (!output) {
            throw new Error('La IA no pudo generar el análisis del informe.');
        }
        return output;
    } catch (error) {
        console.error("Error en generateReportAnalysisFlow:", error);
        throw new Error('El servicio de IA no pudo generar el análisis para el informe.');
    }
  }
);
