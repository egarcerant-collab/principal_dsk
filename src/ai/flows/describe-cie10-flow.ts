
'use server';
/**
 * @fileOverview A flow to describe a medical diagnosis code (CIE-10).
 * - describeCie10 - A function that returns the description of a CIE-10 code.
 * - Cie10Description - The return type for the describeCie10 function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { findCie10Description } from '@/services/cie10-service';

const DescribeCie10InputSchema = z.string().describe("El código de diagnóstico médico (CIE-10) a describir.");

const DescribeCie10OutputSchema = z.object({
  code: z.string().describe("El código de diagnóstico médico (CIE-10) que se buscó."),
  description: z.string().describe("La descripción del diagnóstico correspondiente al código CIE-10."),
});

export type Cie10Description = z.infer<typeof DescribeCie10OutputSchema>;

export async function describeCie10(cie10Code: string): Promise<Cie10Description> {
  return describeCie10Flow(cie10Code);
}

// This flow now uses a local service instead of an AI prompt for better accuracy and performance.
const describeCie10Flow = ai.defineFlow(
  {
    name: 'describeCie10Flow',
    inputSchema: DescribeCie10InputSchema,
    outputSchema: DescribeCie10OutputSchema,
  },
  async (cie10Code) => {
    try {
        const description = await findCie10Description(cie10Code);
        if (!description) {
            return {
                code: cie10Code,
                description: `No se encontró una descripción para el código ${cie10Code}.`
            };
        }
        return {
            code: cie10Code,
            description: description
        };
    } catch (error) {
        console.error(`Error en el flujo describeCie10Flow para el código ${cie10Code}:`, error);
        return {
            code: cie10Code,
            description: "No se pudo realizar la búsqueda en este momento. Por favor, inténtalo de nuevo más tarde."
        };
    }
  }
);
