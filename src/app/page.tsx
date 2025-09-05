"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { summarizeJsonFields } from "@/ai/flows/summarize-json-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUpload from "@/components/json-analyzer/FileUpload";
import JsonViewer from "@/components/json-analyzer/JsonViewer";
import AnalysisResults from "@/components/json-analyzer/AnalysisResults";

type Summaries = Record<string, string>;

export default function Home() {
  const [jsonContent, setJsonContent] = useState<string | null>(null);
  const [parsedJson, setParsedJson] = useState<any | null>(null);
  const [summaries, setSummaries] = useState<Summaries | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFileLoad = (content: string) => {
    setJsonContent(content);
    setSummaries(null);
    setError(null);
    try {
      const parsed = JSON.parse(content);
      setParsedJson(parsed);
    } catch (e) {
      setError("Invalid JSON file. Please upload a valid JSON file.");
      setParsedJson(null);
    }
  };

  const handleAnalyze = () => {
    if (!jsonContent) return;

    startTransition(async () => {
      setError(null);
      try {
        const result = await summarizeJsonFields({ jsonString: jsonContent });
        setSummaries(result.fieldSummaries);
      } catch (e) {
        setError("Failed to analyze JSON. Please try again.");
        setSummaries(null);
      }
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-4xl space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-foreground sm:text-5xl">
            JSON Insights Analyzer
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload a JSON file to visualize its structure and get AI-powered insights.
          </p>
        </header>

        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>1. Upload Your File</CardTitle>
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
            <div className="flex justify-center">
              <Button onClick={handleAnalyze} disabled={isPending} size="lg">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "2. Analyze with AI"
                )}
              </Button>
            </div>

            <Tabs defaultValue="tree" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tree">JSON Tree</TabsTrigger>
                <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
              </TabsList>
              <TabsContent value="tree">
                <Card className="mt-2 shadow-lg">
                  <CardHeader>
                    <CardTitle>JSON Structure</CardTitle>
                  </CardHeader>
                  <CardContent className="font-code text-sm max-h-[60vh] overflow-auto">
                    <JsonViewer data={parsedJson} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="analysis">
                 <AnalysisResults summaries={summaries} isLoading={isPending} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </main>
  );
}
