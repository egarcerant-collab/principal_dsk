"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import FileUpload from "@/components/json-analyzer/FileUpload";
import JsonViewer from "@/components/json-analyzer/JsonViewer";


export default function Home() {
  const [parsedJson, setParsedJson] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileLoad = (content: string) => {
    setError(null);
    setParsedJson(null);
    if (content) {
      try {
        const parsed = JSON.parse(content);
        setParsedJson(parsed);
      } catch (e) {
        setError("Invalid JSON file. Please upload a valid JSON file.");
        setParsedJson(null);
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-4xl space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-foreground sm:text-5xl">
            JSON Viewer
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload your JSON files to visualize them.
          </p>
        </header>

        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>Upload Your File</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload onFileLoad={handleFileLoad} />
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