'use server';
/**
 * @fileOverview A PGP data analysis AI agent.
 *
 * - analyzePgpData - A function that handles the PGP data analysis process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PgpRowSchema = z.object({
  SUBCATEGORIA: z.string().optional(),
  AMBITO: z.string().optional(),
  'ID RESOLUCION 3100': z.string().optional(),
  'DESCRIPCION ID RESOLUCION': z.string().optional(),
  'CUP/CUM': z.string().optional().describe("El código del servicio o procedimiento."),
  'DESCRIPCION CUPS': z.string().optional().describe("La descripción del servicio o procedimiento."),
  'FRECUENCIA AÑO SERVICIO': z.number().optional(),
  'FRECUENCIA USO': z.number().optional(),
  'FRECUENCIA EVENTOS MES': z.number().optional().describe("La frecuencia con la que se espera que ocurra el evento en un mes."),
  'FRECUENCIA EVENTO DIA': z.number().optional(),
  'COSTO EVENTO MES': z.number().optional(),
  'COSTO EVENTO DIA': z.number().optional(),
  'FRECUENCIA MINIMA MES': z.number().optional().describe("La frecuencia mínima esperada para el evento en un mes."),
  'FRECUENCIA MAXIMA MES': z.number().optional().describe("La frecuencia máxima esperada para el evento en un mes."),
  'VALOR UNITARIO': z.number().optional(),
  'VALOR MINIMO MES': z.number().optional().describe("El costo mínimo aceptable para el evento en un mes."),
  'VALOR MAXIMO MES': z.number().optional().describe("El costo máximo aceptable para el evento en un mes."),
  'COSTO EVENTO MES (VALOR MES)': z.number().optional().describe('El costo total estimado del evento para un mes.'),
  OBSERVACIONES: z.string().optional(),
});
type PgpRow = z.infer<typeof PgpRowSchema>;

const AnalyzePgpDataInputSchema = z.object({
  jsonData: z.string(),
});
const AnalyzePgpDataOutputSchema = z.object({
    keyObservations: z.array(z.string()).describe("Una lista de 3 a 5 observaciones clave y concisas sobre los datos."),
    potentialRisks: z.array(z.string()).describe("Una lista de 2 a 3 riesgos potenciales identificados en los datos."),
    strategicRecommendations: z.array(z.string()).describe("Una lista de 2 a 3 recomendaciones estratégicas basadas en el análisis.")
});

export async function analyzePgpData(input: PgpRow[]): Promise<z.infer<typeof AnalyzePgpDataOutputSchema>> {
  return analyzePgpDataFlow({ jsonData: JSON.stringify(input, null, 2) });
}

const prompt = ai.definePrompt({
  name: 'pgpAnalysisPrompt',
  input: {schema: AnalyzePgpDataInputSchema},
  output: {schema: AnalyzePgpDataOutputSchema},
  prompt: `Eres un analista experto en contrats PGP (Pago Global Prospectivo) en el sector salud de Colombia.
  Analiza la siguiente muestra de datos de una nota técnica y proporciona un resumen conciso y profesional.
  Tu análisis debe ser estratégico y centrado en la toma de decisiones.

  Datos de la Nota Técnica:
  {{{jsonData}}}

  Basado en estos datos, por favor, genera:
  1.  **Observaciones Clave:** Identifica las tendencias más importantes. ¿Qué servicios tienen el mayor costo? ¿Hay alguna frecuencia que parezca inusual? ¿Existen grandes diferencias entre los valores mínimos y máximos?
  2.  **Riesgos Potenciales:** ¿Qué podría salir mal? ¿Hay riesgos de desviación financiera? ¿Hay servicios con alta variabilidad que podrían impactar el presupuesto?
  3.  **Recomendaciones Estratégicas:** ¿Qué acciones se deberían tomar? ¿Dónde se debería enfocar la gestión? ¿Hay oportunidades de optimización?

  Sé claro, conciso y profesional en tu respuesta. Proporciona los resultados en el formato JSON especificado.`,
});

const analyzePgpDataFlow = ai.defineFlow(
  {
    name: 'analyzePgpDataFlow',
    inputSchema: AnalyzePgpDataInputSchema,
    outputSchema: AnalyzePgpDataOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('El análisis de IA no pudo generar un resultado.');
    }
    return output;
  }
);
