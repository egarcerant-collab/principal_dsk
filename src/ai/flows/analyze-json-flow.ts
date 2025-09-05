'use server';
/**
 * @fileOverview An AI flow for analyzing JSON data.
 *
 * - analyzeJson - A function that analyzes a JSON string.
 * - AnalyzeJsonInput - The input type for the analyzeJson function.
 * - AnalyzeJsonOutput - The return type for the analyzeJson function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnalyzeJsonInputSchema = z.object({
  json: z.string().describe('The JSON data to analyze, as a string.'),
});
export type AnalyzeJsonInput = z.infer<typeof AnalyzeJsonInputSchema>;

const AnalyzeJsonOutputSchema = z.object({
  summary: z.string().describe('A brief, one-paragraph summary of the JSON structure.'),
  insights: z.array(z.string()).describe('A list of key insights or interesting facts about the data.'),
});
export type AnalyzeJsonOutput = z.infer<typeof AnalyzeJsonOutputSchema>;

export async function analyzeJson(
  input: AnalyzeJsonInput
): Promise<AnalyzeJsonOutput> {
  return analyzeJsonFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeJsonPrompt',
  input: { schema: AnalyzeJsonInputSchema },
  output: { schema: AnalyzeJsonOutputSchema },
  prompt: `You are an expert data analyst. Your task is to analyze the provided JSON data and provide a concise summary and key insights.

Analyze the following JSON content:
\`\`\`json
{{{json}}}
\`\`\`

Based on the data:
1.  Provide a short, high-level summary of what the JSON data represents. Mention the main keys and the general structure.
2.  Generate a list of 2-4 bullet-point insights. These could include the number of records in arrays, interesting patterns, or potential data quality issues.
`,
});

const analyzeJsonFlow = ai.defineFlow(
  {
    name: 'analyzeJsonFlow',
    inputSchema: AnalyzeJsonInputSchema,
    outputSchema: AnalyzeJsonOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
