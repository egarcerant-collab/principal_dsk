
"use client";

import { useState, useEffect } from 'react';
import FileUpload from "@/components/json-analyzer/FileUpload";
import DataVisualizer from "@/components/json-analyzer/DataVisualizer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Building, Link as LinkIcon, Loader2 } from 'lucide-react';
import Papa from 'papaparse';

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
                            PRESTADOR: row.PRESTADOR.trim(),
                            WEB: row.WEB.trim()
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
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This ensures the component is mounted on the client before doing anything else.
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Fetch providers only on the client side
    if (isClient) {
      const loadProviders = async () => {
          try {
              const providersMap = await fetchProvidersData();
              setProviders(providersMap);
          } catch (e: any) {
              setError('Error al cargar la base de datos de prestadores: ' + e.message);
          } finally {
              setIsLoadingProviders(false);
          }
      };
      loadProviders();
    }
  }, [isClient]);

  const handleFileLoad = (content: string, name: string) => {
    try {
      const parsedJson = JSON.parse(content);
      setJsonData(parsedJson);
      setFileName(name);
      setError(null);
      
      const nit = parsedJson?.numDocumentoIdObligado;
      if (nit && providers) {
        const info = providers.get(nit);
        setPrestadorInfo(info || null);
      } else {
        setPrestadorInfo(null);
      }

    } catch (e: any) {
      if (e instanceof Error) {
        setError(`Error al parsear el archivo JSON: ${e.message}`);
      } else {
        setError('Ocurrió un error inesperado al parsear el archivo JSON.');
      }
      setJsonData(null);
      setFileName(null);
      setPrestadorInfo(null);
    }
  };

  const handleReset = () => {
    setJsonData(null);
    setError(null);
    setFileName(null);
    setPrestadorInfo(null);
  };

  if (!isClient || isLoadingProviders) {
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-2">
            <Loader2 className="animate-spin h-12 w-12 text-primary" />
            <p className="text-muted-foreground">Cargando datos de prestadores...</p>
        </div>
    );
  }

  return (
    <div className="w-full space-y-8 mt-4">
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
