
'use server';
/**
 * @fileOverview A flow to describe a medical diagnosis code (CIE-10).
 * - describeCie10 - A function that returns the description of a CIE-10 code.
 * - Cie10Description - The return type for the describeCie10 function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DescribeCie10InputSchema = z.string().describe("El código de diagnóstico médico (CIE-10) a describir.");

const DescribeCie10OutputSchema = z.object({
  code: z.string().describe("El código de diagnóstico médico (CIE-10) que se buscó."),
  description: z.string().describe("La descripción del diagnóstico correspondiente al código CIE-10."),
});

export type Cie10Description = z.infer<typeof DescribeCie10OutputSchema>;

export async function describeCie10(cie10Code: string): Promise<Cie10Description> {
  return describeCie10Flow(cie10Code);
}

const prompt = ai.definePrompt({
  name: 'describeCie10Prompt',
  input: {schema: DescribeCie10InputSchema},
  output: {schema: DescribeCie10OutputSchema},
  prompt: `Eres un experto en la Clasificación Internacional de Enfermedades (CIE-10).
  Dado el siguiente código CIE-10, proporciona una descripción clara y concisa del diagnóstico al que corresponde.

  Código CIE-10: {{{input}}}

  Tu respuesta debe ser únicamente la descripción del diagnóstico. No incluyas el código en la respuesta.`,
});

const describeCie10Flow = ai.defineFlow(
  {
    name: 'describeCie10Flow',
    inputSchema: DescribeCie10InputSchema,
    outputSchema: DescribeCie10OutputSchema,
  },
  async (cie10Code) => {
    try {
        const {output} = await prompt(cie10Code);
        if (!output) {
        throw new Error('La IA no pudo generar una descripción para el código CIE-10.');
        }
        return {
            code: cie10Code,
            description: output.description
        };
    } catch (error) {
        console.error(`Error en el flujo describeCie10Flow para el código ${cie10Code}:`, error);
        return {
            code: cie10Code,
            description: "El servicio de IA no está disponible en este momento. Por favor, inténtalo de nuevo más tarde."
        };
    }
  }
);
