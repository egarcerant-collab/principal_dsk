
"use client";

import { useState, useEffect, useCallback } from 'react';
import FileUpload from "@/components/json-analyzer/FileUpload";
import DataVisualizer from "@/components/json-analyzer/DataVisualizer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Building, Loader2, DatabaseZap, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

interface PrestadorInfo {
  NIT: string;
  PRESTADOR: string;
  WEB: string;
}

const PROVIDERS_SHEET_URL = "https://docs.google.com/spreadsheets/d/10Icu1DO4llbolO60VsdFcN5vxuYap1vBZs6foZ-XD04/gviz/tq?tqx=out:csv&sheet=Hoja1";

async function fetchProvidersData(): Promise<Map<string, PrestadorInfo>> {
    const response = await fetch(PROVIDERS_SHEET_URL);
    if (!response.ok) {
        throw new Error('No se pudo cargar la información de los prestadores.');
    }
    const csvText = await response.text();
    return new Promise((resolve, reject) => {
        Papa.parse<PrestadorInfo>(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const map = new Map<string, PrestadorInfo>();
                results.data.forEach(row => {
                    if (row.NIT) {
                        map.set(row.NIT.trim(), {
                            NIT: row.NIT.trim(),
                            PRESTADOR: row.PRESTADOR ? row.PRESTADOR.trim() : '',
                            WEB: row.WEB ? row.WEB.trim() : ''
                        });
                    }
                });
                resolve(map);
            },
            error: (error: Error) => {
                reject(error);
            }
        });
    });
}


export default function JsonAnalyzerPage() {
  const [jsonData, setJsonData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [providers, setProviders] = useState<Map<string, PrestadorInfo> | null>(null);
  const [prestadorInfo, setPrestadorInfo] = useState<PrestadorInfo | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(false);
  const [isProvidersDataLoaded, setIsProvidersDataLoaded] = useState<boolean>(false);
  const { toast } = useToast();

  const handleLoadProviders = useCallback(async () => {
    setIsLoadingProviders(true);
    setError(null);
    toast({ title: "Accediendo a la Base de Datos de Prestadores...", description: "Espere un momento, por favor." });
    try {
        const providersMap = await fetchProvidersData();
        setProviders(providersMap);
        setIsProvidersDataLoaded(true);
        toast({ title: "Datos de Prestadores Cargados", description: `Se cargaron ${providersMap.size} registros.` });
    } catch (e: any) {
        const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
        setError('Error al cargar la base de datos de prestadores: ' + errorMessage);
        toast({ title: "Error al Cargar Datos", description: errorMessage, variant: "destructive" });
    } finally {
        setIsLoadingProviders(false);
    }
  }, [toast]);


  const handleFileLoad = useCallback((content: string, name: string) => {
    try {
      const parsedJson = JSON.parse(content);
      setError(null);
      setFileName(name);
      
      const nit = parsedJson?.numDocumentoIdObligado;
      if (nit && providers) {
        const info = providers.get(String(nit));
        setPrestadorInfo(info || null);
      } else {
        setPrestadorInfo(null);
      }
      setJsonData(parsedJson);

    } catch (e: any) {
      const errorMessage = e instanceof Error ? `Error al parsear el archivo JSON: ${e.message}`: 'Ocurrió un error inesperado al parsear el archivo JSON.';
      setError(errorMessage);
      toast({ title: "Error de Archivo", description: errorMessage, variant: "destructive" });
      setJsonData(null);
      setFileName(null);
      setPrestadorInfo(null);
    }
  }, [providers, toast]);

  const handleReset = () => {
    setJsonData(null);
    setError(null);
    setFileName(null);
    setPrestadorInfo(null);
  };

  return (
    <div className="w-full space-y-8 mt-4">
      {!jsonData ? (
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>Carga tus datos</CardTitle>
            <CardDescription>
                Primero, carga la base de datos de prestadores para enriquecer los datos. Luego, sube tu archivo JSON.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <Button onClick={handleLoadProviders} disabled={isLoadingProviders || isProvidersDataLoaded} className={cn("w-full md:w-auto", isProvidersDataLoaded && "bg-green-600 hover:bg-green-700")}>
                {isLoadingProviders ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isProvidersDataLoaded ? <CheckCircle className="mr-2 h-4 w-4"/> : <DatabaseZap className="mr-2 h-4 w-4" />}
                {isLoadingProviders ? "Cargando..." : isProvidersDataLoaded ? "Base de Prestadores Cargada" : "Cargar Base de Datos de Prestadores"}
            </Button>
            <FileUpload onFileLoad={handleFileLoad} onReset={handleReset} disabled={!isProvidersDataLoaded} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
           {prestadorInfo && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-6 w-6 text-primary" />
                            Información del Prestador
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                            <h3 className="text-xl font-bold text-foreground">{prestadorInfo.PRESTADOR}</h3>
                            <p className="text-md text-muted-foreground">NIT: {prestadorInfo.NIT}</p>
                        </div>
                         <div className="aspect-video w-full rounded-lg border">
                           <iframe
                                src={prestadorInfo.WEB}
                                title={`Web de ${prestadorInfo.PRESTADOR}`}
                                className="h-full w-full rounded-md"
                                allow="fullscreen"
                            />
                        </div>

                    </CardContent>
                </Card>
            )}
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
  );
}
