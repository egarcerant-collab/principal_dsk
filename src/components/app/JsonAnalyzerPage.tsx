
"use client";

import { useState, useEffect, useCallback } from 'react';
import FileUpload from "@/components/json-analyzer/FileUpload";
import DataVisualizer from "@/components/json-analyzer/DataVisualizer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Building, Loader2, DatabaseZap, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { fetchSheetData, type PrestadorInfo } from '@/lib/sheets';

interface FileState {
    jsonData: any | null;
    fileName: string | null;
    prestadorInfo: PrestadorInfo | null;
}

const initialFileState: FileState = {
    jsonData: null,
    fileName: null,
    prestadorInfo: null,
};


const PROVIDERS_SHEET_URL = "https://docs.google.com/spreadsheets/d/10Icu1DO4llbolO60VsdFcN5vxuYap1vBZs6foZ-XD04/gviz/tq?tqx=out:csv&sheet=Hoja1";

async function fetchProvidersData(): Promise<Map<string, PrestadorInfo>> {
    const providersList = await fetchSheetData<PrestadorInfo>(PROVIDERS_SHEET_URL);
    const map = new Map<string, PrestadorInfo>();
    providersList.forEach(provider => {
        if (provider.NIT) {
            const cleanNit = String(provider.NIT).trim();
            map.set(cleanNit, {
                ...provider,
                NIT: cleanNit,
                PRESTADOR: provider.PRESTADOR ? String(provider.PRESTADOR).trim() : 'Nombre no encontrado',
                WEB: provider.WEB ? String(provider.WEB).trim() : ''
            });
        }
    });
    return map;
}


export default function JsonAnalyzerPage() {
  const [file1, setFile1] = useState<FileState>(initialFileState);
  const [file2, setFile2] = useState<FileState>(initialFileState);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Map<string, PrestadorInfo> | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(false);
  const [isProvidersDataLoaded, setIsProvidersDataLoaded] = useState<boolean>(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLoadProviders = useCallback(async () => {
    setIsLoadingProviders(true);
    setError(null);
    toast({ title: "Accediendo a la Base de Datos de Prestadores...", description: "Espere un momento, por favor." });
    try {
        const providersMap = await fetchProvidersData();
        if (providersMap.size === 0) {
            throw new Error("No se encontraron datos de prestadores. Verifique la hoja de cálculo.");
        }
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


  const handleFileLoad = useCallback((files: File[]) => {
    setError(null);
    setShowDuplicateAlert(false);
    
    const processFile = (file: File, fileSetter: React.Dispatch<React.SetStateAction<FileState>>) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            if (!e.target?.result) return;
            
            try {
                const content = e.target.result as string;
                const parsedJson = JSON.parse(content);

                const nit = parsedJson?.numDocumentoIdObligado;
                let prestadorInfo: PrestadorInfo | null = null;
                if (nit && providers) {
                    prestadorInfo = providers.get(String(nit).trim()) || null;
                }

                const newState: FileState = {
                    jsonData: parsedJson,
                    fileName: file.name,
                    prestadorInfo: prestadorInfo,
                };
                
                fileSetter(newState);

            } catch (err: any) {
                const errorMessage = err instanceof Error ? `Error al parsear ${file.name}: ${err.message}`: `Error inesperado al parsear ${file.name}.`;
                setError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage);
                toast({ title: "Error de Archivo", description: errorMessage, variant: "destructive" });
            }
        };
        reader.readAsText(file);
    };

    if (files.length > 0) {
        if (!file1.jsonData) {
            processFile(files[0], setFile1);
            if (files.length > 1) {
                 processFile(files[1], setFile2);
            }
        } else if (!file2.jsonData) {
            processFile(files[0], setFile2);
        }
    }
  }, [providers, toast, file1.jsonData]);

  useEffect(() => {
    if (file1.jsonData && file2.jsonData) {
        const nit1 = file1.jsonData.numDocumentoIdObligado;
        const nit2 = file2.jsonData.numDocumentoIdObligado;
        if (nit1 && nit2 && nit1 === nit2) {
            setShowDuplicateAlert(true);
        } else {
            setShowDuplicateAlert(false);
        }
    }
  }, [file1.jsonData, file2.jsonData]);

  const handleReset = () => {
    setFile1(initialFileState);
    setFile2(initialFileState);
    setError(null);
    setShowDuplicateAlert(false);
  };
  
  if (!isClient) {
    return (
        <div className="flex items-center justify-center py-6">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <p>Cargando analizador...</p>
        </div>
    );
  }

  const anyFileLoaded = file1.jsonData || file2.jsonData;
  const loadedFileNames = [file1.fileName, file2.fileName].filter(Boolean) as string[];

  return (
    <div className="w-full space-y-8 mt-4">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <CardTitle>Carga y Compara tus Archivos JSON</CardTitle>
                    <CardDescription>
                        Carga la base de prestadores y luego sube hasta dos archivos JSON para analizarlos lado a lado.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleLoadProviders} disabled={isLoadingProviders || isProvidersDataLoaded} className={cn("w-full sm:w-auto", isProvidersDataLoaded && "bg-green-600 hover:bg-green-700")}>
                        {isLoadingProviders ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isProvidersDataLoaded ? <CheckCircle className="mr-2 h-4 w-4"/> : <DatabaseZap className="mr-2 h-4 w-4" />}
                        {isLoadingProviders ? "Cargando..." : isProvidersDataLoaded ? "Prestadores Cargados" : "1. Cargar Prestadores"}
                    </Button>
                     {anyFileLoaded && (
                        <Button onClick={handleReset} variant="outline">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Limpiar Todo
                        </Button>
                    )}
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <FileUpload 
                onFileLoad={handleFileLoad} 
                disabled={!isProvidersDataLoaded || loadedFileNames.length >= 2} 
                loadedFileNames={loadedFileNames}
             />
          </CardContent>
        </Card>
      
        {showDuplicateAlert && (
             <Alert variant="destructive" className="bg-yellow-50 border-yellow-400 text-yellow-800 [&>svg]:text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Alerta de Archivo Duplicado</AlertTitle>
                <AlertDescription>
                   Has cargado dos archivos que pertenecen al mismo prestador (NIT: {file1.jsonData.numDocumentoIdObligado}). El análisis comparativo podría no ser útil.
                </AlertDescription>
            </Alert>
        )}

      {anyFileLoaded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Visualizer 1 */}
            <div className="space-y-4">
               {file1.jsonData && (
                <>
                
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Building className="h-5 w-5 text-primary" />
                                Prestador Archivo 1
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {file1.prestadorInfo ? (
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-foreground">{file1.prestadorInfo.PRESTADOR}</h3>
                                    <p className="text-sm text-muted-foreground">NIT: {file1.prestadorInfo.NIT}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-foreground">Nombre no encontrado</h3>
                                    <p className="text-sm text-muted-foreground">NIT: {file1.jsonData.numDocumentoIdObligado}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="text-xl">Análisis Archivo 1: <span className="font-normal text-muted-foreground">{file1.fileName}</span></span>
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataVisualizer data={file1.jsonData} />
                    </CardContent>
                </Card>
                </>
               )}
            </div>
            
            {/* Visualizer 2 */}
            <div className="space-y-4">
               {file2.jsonData && (
                <>
                
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Building className="h-5 w-5 text-primary" />
                                Prestador Archivo 2
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {file2.prestadorInfo ? (
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-foreground">{file2.prestadorInfo.PRESTADOR}</h3>
                                    <p className="text-sm text-muted-foreground">NIT: {file2.prestadorInfo.NIT}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-foreground">Nombre no encontrado</h3>
                                    <p className="text-sm text-muted-foreground">NIT: {file2.jsonData.numDocumentoIdObligado}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                         <span className="text-xl">Análisis Archivo 2: <span className="font-normal text-muted-foreground">{file2.fileName}</span></span>
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataVisualizer data={file2.jsonData} />
                    </CardContent>
                </Card>
                </>
               )}
            </div>
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
