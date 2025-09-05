"use client";

import { useState } from "react";
import { AlertCircle, Bot, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/json-analyzer/FileUpload";
import JsonViewer from "@/components/json-analyzer/JsonViewer";
import { analyzeJson, type AnalyzeJsonOutput } from "@/ai/flows/analyze-json-flow";

export default function Home() {
  const [jsonContent, setJsonContent] = useState<string | null>(null);
  const [parsedJson, setParsedJson] = useState<any | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeJsonOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleFileLoad = (content: string) => {
    setJsonContent(content);
    setError(null);
    setAnalysis(null);
    if (content) {
      try {
        const parsed = JSON.parse(content);
        setParsedJson(parsed);
      } catch (e) {
        setError("Invalid JSON file. Please upload a valid JSON file.");
        setParsedJson(null);
      }
    } else {
      setParsedJson(null);
    }
  };

  const handleAnalyze = async () => {
    if (!jsonContent) return;
    setIsPending(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await analyzeJson({ json: jsonContent });
      setAnalysis(result);
    } catch (e) {
      console.error(e);
      setError("An error occurred during analysis. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-4xl space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-foreground sm:text-5xl">
            JSON Viewer & Analyzer
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload and analyze your JSON files with the power of AI.
          </p>
        </header>

        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>Upload Your File</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload onFileLoad={handleFileLoad} disabled={isPending} />
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {parsedJson && !error && (
          <>
            <Card className="shadow-lg">
              <CardHeader className="flex-row items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle>AI Analysis</CardTitle>
                  <CardDescription>
                    Get an AI-powered summary of your JSON data.
                  </CardDescription>
                </div>
                <Button onClick={handleAnalyze} disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Bot className="mr-2 h-4 w-4" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </CardHeader>
              {analysis && (
                <CardContent className="pt-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p>{analysis.summary}</p>
                    <h3 className="text-lg font-semibold mt-4">Key Insights:</h3>
                    <ul>
                      {analysis.insights.map((insight, index) => (
                        <li key={index}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>
            <Card className="mt-2 shadow-lg">
              <CardHeader>
                <CardTitle>JSON Structure</CardTitle>
              </CardHeader>
              <CardContent className="font-code text-sm max-h-[60vh] overflow-auto">
                <JsonViewer data={parsedJson} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
