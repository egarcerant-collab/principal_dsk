'use server';

/**
 * @fileOverview Summarizes the key aspects of each top-level field in a JSON file.
 *
 * - summarizeJsonFields - A function that takes a JSON string as input and returns a summary of each top-level field.
 * - SummarizeJsonFieldsInput - The input type for the summarizeJsonFields function.
 * - SummarizeJsonFieldsOutput - The return type for the summarizeJsonFields function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeJsonFieldsInputSchema = z.object({
  jsonString: z
    .string()
    .describe('The JSON string to summarize.  Must be a valid JSON format.'),
});
export type SummarizeJsonFieldsInput = z.infer<typeof SummarizeJsonFieldsInputSchema>;

const SummarizeJsonFieldsOutputSchema = z.object({
  fieldSummaries: z.record(z.string()).describe('A map of field names to summaries.'),
});
export type SummarizeJsonFieldsOutput = z.infer<typeof SummarizeJsonFieldsOutputSchema>;

export async function summarizeJsonFields(input: SummarizeJsonFieldsInput): Promise<SummarizeJsonFieldsOutput> {
  return summarizeJsonFieldsFlow(input);
}

const summarizeJsonFieldsPrompt = ai.definePrompt({
  name: 'summarizeJsonFieldsPrompt',
  input: {schema: SummarizeJsonFieldsInputSchema},
  output: {schema: SummarizeJsonFieldsOutputSchema},
  prompt: `You are an expert JSON analyzer. You will receive a JSON string, and you will provide a summary of each top-level field.

    Consider the data types within the field to provide relevant insights. Be concise.

    The JSON string is:
    \`\`\`
    {{{jsonString}}}
    \`\`\`

    Format your response as a JSON object where the keys are the top-level field names from the input JSON, and the values are the summaries. For example, given the JSON:\n    \`\`\`json\n    {
      "Transaction": {
        "idTransaccion": "123456",
        "fechaTransaccion": "2024-08-15 10:30",
        "tipoDocumentoEntidad": "NI",
        "numDocumentoEntidad": "800123456-7",
        "codEntidadResponsablePago": "EPS001",
        "numFactura": "FV-2024-001",
        "valorFactura": 1500000,
        "moneda": "COP"
      },
      "Usuario": {
        "tipoDocumentoIdentificacion": "CC",
        "numDocumentoIdentificacion": "1017345840",
        "fechaNacimiento": "2000-01-01",
        "codSexo": "M",
        "codPaisResidencia": "170",
        "codEtnia": "6",
        "codDiscapacidad": null
      },
      "Servicios": {
        "Consultas": [
          {
            "codConsulta": "890101",
            "finalidadConsulta": "01",
            "causaExterna": "13",
            "codDiagnosticoPrincipal": "J209",
            "codDiagnosticoRelacionado": null,
            "valorConsulta": 45000
          }
        ],
        "Procedimientos": [
          {
            "codProcedimiento": "890201",
            "ambitoRealizacion": "02",
            "finalidadProcedimiento": "03",
            "personalAtendio": "02",
            "codDiagnosticoPrincipal": "K029",
            "valorProcedimiento": 120000
          }
        ],
        "Medicamentos": [
          {
            "codMedicamento": "M000123",
            "descripcion": "Amoxicilina 500mg",
            "cantidad": 20,
            "valorUnitario": 1500,
            "valorTotal": 30000
          }
        ],
        "OtrosServicios": [
          {
            "codServicio": "OS001",
            "descripcion": "Transporte asistencial básico",
            "cantidad": 1,
            "valorTotal": 80000
          }
        ]
      }
    }
    \`\`\`

    Your response should be:

    \`\`\`json
    {
      "Transaction": "Details about the transaction, including ID, date, entity information, invoice details, and monetary values.",
      "Usuario": "Information about the user, including identification details, demographics, and ethnicity.",
      "Servicios": "Details about services provided, including consultations, procedures, medications, and other services, with codes and values for each."
    }
    \`\`\`

    Output:
  `,
});

const summarizeJsonFieldsFlow = ai.defineFlow(
  {
    name: 'summarizeJsonFieldsFlow',
    inputSchema: SummarizeJsonFieldsInputSchema,
    outputSchema: SummarizeJsonFieldsOutputSchema,
  },
  async input => {
    try {
      JSON.parse(input.jsonString);
    } catch (e: any) {
      throw new Error("Invalid JSON string: " + e.message);
    }
    const {output} = await summarizeJsonFieldsPrompt(input);
    return output!;
  }
);
