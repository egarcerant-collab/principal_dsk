
"use client";

import { useState, useEffect } from 'react';
import FileUpload from "@/components/json-analyzer/FileUpload";
import DataVisualizer from "@/components/json-analyzer/DataVisualizer";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [jsonData, setJsonData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleFileLoad = (content: string, name: string) => {
    try {
      const parsedJson = JSON.parse(content);
      setJsonData(parsedJson);
      setFileName(name);
      setError(null);
    } catch (e: any)      {
        if (e instanceof Error) {
            setError(`Error al parsear el archivo JSON: ${e.message}`);
        } else {
            setError('Ocurrió un error inesperado al parsear el archivo JSON.');
        }
      setJsonData(null);
      setFileName(null);
    }
  };

  const handleReset = () => {
    setJsonData(null);
    setError(null);
    setFileName(null);
  };

  if (!isClient) {
    return null; // O un esqueleto de carga
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-6xl space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-foreground sm:text-5xl">
            Visor y Analizador de Datos
          </h1>
          <p className="text-lg text-muted-foreground">
            Carga un archivo JSON o importa desde Google Sheets para visualizar y analizar tus datos.
          </p>
          <Button asChild variant="outline">
            <Link href="/pgp-search">Ir al Buscador PGP (Prueba)</Link>
          </Button>
        </header>

        {!jsonData ? (
          <Card className="w-full shadow-lg">
            <CardHeader>
              <CardTitle>Carga tus datos</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload onFileLoad={handleFileLoad} onReset={handleReset} />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Visualización de Datos: <span className="font-normal text-muted-foreground">{fileName}</span></span>
                        <button
                            onClick={handleReset}
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            Cargar otro archivo
                        </button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <DataVisualizer data={jsonData} />
                </CardContent>
            </Card>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}
