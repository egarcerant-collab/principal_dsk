
"use client";

import { useState, useEffect, useCallback } from 'react';
import FileUpload from "@/components/json-analyzer/FileUpload";
import DataVisualizer, { calculateSummary } from "@/components/json-analyzer/DataVisualizer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Building, Loader2, DatabaseZap, CheckCircle, RefreshCw, AlertTriangle, Users, Stethoscope, Microscope, Pill, Syringe, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { fetchSheetData, type PrestadorInfo } from '@/lib/sheets';
import { CupCountsMap } from '@/app/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FileState {
    jsonData: any | null;
    fileName: string | null;
    prestadorInfo: PrestadorInfo | null;
}

interface JsonAnalyzerPageProps {
  setUnifiedSummary: (summary: any | null) => void;
  setCupCounts: (cupCounts: CupCountsMap) => void;
  setJsonPrestadorCode: (code: string | null) => void;
}

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

export const calculateCupCounts = (jsonData: any | any[]): CupCountsMap => {
    const counts: CupCountsMap = new Map();
    const dataSources = Array.isArray(jsonData) ? jsonData : [jsonData];

    for (const data of dataSources) {
        if (!data || !data.usuarios) continue;

        data.usuarios.forEach((user: any) => {
            // Consultas
            user.servicios?.consultas?.forEach((c: any) => {
                if (c.codConsulta) {
                    counts.set(c.codConsulta, (counts.get(c.codConsulta) || 0) + 1);
                }
            });
            // Procedimientos
            user.servicios?.procedimientos?.forEach((p: any) => {
                if (p.codProcedimiento) {
                    counts.set(p.codProcedimiento, (counts.get(p.codProcedimiento) || 0) + 1);
                }
            });
            // Medicamentos
            user.servicios?.medicamentos?.forEach((m: any) => {
                if (m.codTecnologiaSalud) {
                    const quantity = Number(m.cantidadMedicamento) || 0;
                    counts.set(m.codTecnologiaSalud, (counts.get(m.codTecnologiaSalud) || 0) + quantity);
                }
            });
            // Otros Servicios
            user.servicios?.otrosServicios?.forEach((os: any) => {
                if (os.codTecnologiaSalud) {
                    const quantity = Number(os.cantidadOS) || 0;
                    counts.set(os.codTecnologiaSalud, (counts.get(os.codTecnologiaSalud) || 0) + quantity);
                }
            });
        });
    }

    return counts;
};


export default function JsonAnalyzerPage({ setUnifiedSummary, setCupCounts, setJsonPrestadorCode }: JsonAnalyzerPageProps) {
  const [files, setFiles] = useState<FileState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Map<string, PrestadorInfo> | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(true);
  const [isProvidersDataLoaded, setIsProvidersDataLoaded] = useState<boolean>(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));

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
  
  useEffect(() => {
    if(isClient) {
      handleLoadProviders();
    }
  }, [isClient, handleLoadProviders]);


  const handleFileLoad = useCallback((loadedFiles: File[]) => {
    setError(null);
    setShowDuplicateAlert(false);

    const newFiles: FileState[] = [];

    const filePromises = loadedFiles.map(file => {
        return new Promise<FileState>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                if (!e.target?.result) return reject(new Error("No se pudo leer el archivo."));
                
                try {
                    const content = e.target.result as string;
                    const parsedJson = JSON.parse(content);
                    
                    const nit = parsedJson?.numDocumentoIdObligado;
                    const prestadorInfo = (nit && providers?.get(String(nit).trim())) || null;

                    resolve({
                        jsonData: parsedJson,
                        fileName: file.name,
                        prestadorInfo: prestadorInfo,
                    });

                } catch (err: any) {
                    const errorMessage = err instanceof Error ? `Error al parsear ${file.name}: ${err.message}`: `Error inesperado al parsear ${file.name}.`;
                    setError(prev => prev ? `${prev}\\n${errorMessage}` : errorMessage);
                    toast({ title: "Error de Archivo", description: errorMessage, variant: "destructive" });
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    });

    Promise.all(filePromises).then(processedFiles => {
        setFiles(prevFiles => [...prevFiles, ...processedFiles]);
    });

  }, [providers, toast]);

  useEffect(() => {
    const loadedJsonData = files.map(f => f.jsonData).filter(Boolean);
    
    if (loadedJsonData.length > 0) {
        setCupCounts(calculateCupCounts(loadedJsonData));

        // Set prestador code from the first file
        const firstPrestadorCode = loadedJsonData[0]?.codPrestador;
        if (firstPrestadorCode) {
            setJsonPrestadorCode(String(firstPrestadorCode).trim());
        }

        const nits = loadedJsonData.map(d => d.numDocumentoIdObligado).filter(Boolean);
        const uniqueNits = new Set(nits);
        setShowDuplicateAlert(nits.length > uniqueNits.size);
    } else {
        setCupCounts(new Map());
        setJsonPrestadorCode(null);
    }

    if (loadedJsonData.length > 1) {
        const combinedSummary = loadedJsonData.reduce((acc, data) => {
            const summary = calculateSummary(data);
            acc.numUsuarios += summary.numUsuarios;
            acc.numConsultas += summary.numConsultas;
            acc.numProcedimientos += summary.numProcedimientos;
            acc.totalMedicamentos += summary.totalMedicamentos;
            acc.totalOtrosServicios += summary.totalOtrosServicios;
            return acc;
        }, {
            numFactura: 'Combinado',
            numUsuarios: 0,
            numConsultas: 0,
            numProcedimientos: 0,
            totalMedicamentos: 0,
            totalOtrosServicios: 0,
        });
        setUnifiedSummary(combinedSummary);
    } else if (loadedJsonData.length === 1) {
        setUnifiedSummary(calculateSummary(loadedJsonData[0]));
    } else {
        setUnifiedSummary(null);
    }
  }, [files, setUnifiedSummary, setCupCounts, setJsonPrestadorCode]);

  const handleReset = () => {
    setFiles([]);
    setError(null);
    setShowDuplicateAlert(false);
    setUnifiedSummary(null);
    setCupCounts(new Map());
    setJsonPrestadorCode(null);
  };
  
  if (!isClient) {
    return (
        <div className="flex items-center justify-center py-6">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <p>Cargando analizador...</p>
        </div>
    );
  }

  const anyFileLoaded = files.length > 0;
  const loadedFileNames = files.map(f => f.fileName).filter(Boolean) as string[];

  return (
    <div className="w-full space-y-8 mt-4">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <CardTitle>Carga tus Archivos JSON</CardTitle>
                    <CardDescription>
                        Selecciona el mes y carga hasta 3 archivos JSON para analizarlos.
                    </CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px]">
                            <Calendar className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Seleccionar mes..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Enero</SelectItem>
                            <SelectItem value="2">Febrero</SelectItem>
                            <SelectItem value="3">Marzo</SelectItem>
                            <SelectItem value="4">Abril</SelectItem>
                            <SelectItem value="5">Mayo</SelectItem>
                            <SelectItem value="6">Junio</SelectItem>
                            <SelectItem value="7">Julio</SelectItem>
                            <SelectItem value="8">Agosto</SelectItem>
                            <SelectItem value="9">Septiembre</SelectItem>
                            <SelectItem value="10">Octubre</SelectItem>
                            <SelectItem value="11">Noviembre</SelectItem>
                            <SelectItem value="12">Diciembre</SelectItem>
                        </SelectContent>
                    </Select>
                     {anyFileLoaded && (
                        <Button onClick={handleReset} variant="outline">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Limpiar
                        </Button>
                    )}
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <FileUpload 
                onFileLoad={handleFileLoad} 
                disabled={isLoadingProviders || !isProvidersDataLoaded || loadedFileNames.length >= 3} 
                loadedFileNames={loadedFileNames}
             />
          </CardContent>
        </Card>
      
        {showDuplicateAlert && (
             <Alert variant="destructive" className="bg-yellow-50 border-yellow-400 text-yellow-800 [&>svg]:text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Alerta de NIT Duplicado</AlertTitle>
                <AlertDescription>
                   Has cargado múltiples archivos que pertenecen al mismo prestador (NIT). El análisis combinará los datos.
                </AlertDescription>
            </Alert>
        )}

        {anyFileLoaded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {files.map((file, index) => file.jsonData && (
                    <Card key={index} className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Building className="h-5 w-5 text-primary" />
                                Prestador Archivo {index + 1}
                            </CardTitle>
                             <CardDescription>{file.fileName}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {file.prestadorInfo ? (
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-foreground">{file.prestadorInfo.PRESTADOR}</h3>
                                    <p className="text-sm text-muted-foreground">NIT: {file.prestadorInfo.NIT}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-foreground">Nombre no encontrado</h3>
                                    <p className="text-sm text-muted-foreground">NIT: {file.jsonData.numDocumentoIdObligado}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}


      {anyFileLoaded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {files.map((file, index) => file.jsonData && (
                 <div key={index} className="space-y-4">
                    <Card>
                        <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="text-xl">Análisis Archivo {index + 1}</span>
                        </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataVisualizer data={file.jsonData} />
                        </CardContent>
                    </Card>
                 </div>
            ))}
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

    