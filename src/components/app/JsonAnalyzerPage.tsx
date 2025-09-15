
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import FileUpload from "@/components/json-analyzer/FileUpload";
import DataVisualizer, { calculateSummary } from "@/components/json-analyzer/DataVisualizer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Building, Loader2, RefreshCw, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { fetchSheetData, type PrestadorInfo } from '@/lib/sheets';
import { CupCountsMap, ExecutionDataByMonth } from '@/app/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getNumericValue } from '../pgp-search/PgPsearchForm';

interface FileState {
  jsonData: any | null;
  fileName: string | null;
  prestadorInfo: PrestadorInfo | null;
  month: string;
}

export interface MonthlyExecutionData {
  cupCounts: CupCountsMap;
  summary: any;
}

interface JsonAnalyzerPageProps {
  setExecutionData: (data: ExecutionDataByMonth) => void;
  setJsonPrestadorCode: (code: string | null) => void;
  setUniqueUserCount: (count: number) => void;
}

const PROVIDERS_SHEET_URL = "https://docs.google.com/spreadsheets/d/10Icu1DO4llbolO60VsdFcN5vxuYap1vBZs6foZ-XD04/gviz/tq?tqx=out:csv&sheet=Hoja1";

const normalizeString = (v: unknown): string => String(v ?? "").trim();

/** Sanitiza para usar en nombres de archivo (sin espacios/acentos/caracteres raros) */
const sanitizeForFilename = (v: string): string =>
  v
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quita tildes
    .replace(/[^\w.-]/g, '_')                         // deja solo [a-zA-Z0-9_ .-]
    .replace(/_+/g, '_')                              // colapsa guiones bajos
    .replace(/^_+|_+$/g, '');                         // sin guiones bajos al borde

/** Devuelve el nombre final a mostrar/gestionar: CODPRESTADOR__NombreOriginal */
const buildFileNameWithPrestador = (originalName: string, prestadorCodeRaw: string | null): string => {
  const code = sanitizeForFilename(normalizeString(prestadorCodeRaw ?? ''));
  if (!code) return originalName;

  // evita duplicar si ya está
  const lowerOrig = originalName.toLowerCase();
  if (lowerOrig.startsWith(`${code.toLowerCase()}__`) || lowerOrig.includes(`${code.toLowerCase()}__`)) {
    return originalName;
  }
  return `${code}__${originalName}`;
};

async function fetchProvidersData(): Promise<Map<string, PrestadorInfo>> {
  const providersList = await fetchSheetData<PrestadorInfo>(PROVIDERS_SHEET_URL);
  const map = new Map<string, PrestadorInfo>();
  providersList.forEach(provider => {
    const key = normalizeString(provider['ID DE ZONA']);
    if (key) {
      const cleanedProvider: PrestadorInfo = {
        'NIT': normalizeString(provider.NIT),
        'PRESTADOR': normalizeString(provider.PRESTADOR),
        'ID DE ZONA': key,
        'WEB': normalizeString(provider.WEB),
        'POBLACION': getNumericValue(provider.POBLACION),
      };
      map.set(key, cleanedProvider);
    }
  });
  return map;
}

const findValueByKeyCaseInsensitive = (obj: any, key: string): string | null => {
  if (!obj || typeof obj !== 'object') return null;
  const keyToFind = key.toLowerCase();
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && k.toLowerCase() === keyToFind) {
      return obj[k];
    }
  }
  return null;
};

// **FIXED**: Extracts codPrestador from the correct nested location.
const getCodPrestadorFromJson = (jsonData: any): string | null => {
  if (!jsonData || !Array.isArray(jsonData.usuarios) || jsonData.usuarios.length === 0) {
    return null;
  }

  // Attempt to get it from the first consultation of the first user
  try {
    const prestadorCode = jsonData.usuarios[0]?.servicios?.consultas?.[0]?.codPrestador;
    if (prestadorCode) {
      return normalizeString(prestadorCode);
    }
  } catch (e) {
    // Could fail if structure is not as expected, ignore and try next method.
  }
  
  // Fallback for other services if consultations is empty
  try {
     const prestadorCode = jsonData.usuarios[0]?.servicios?.procedimientos?.[0]?.codPrestador;
     if (prestadorCode) {
      return normalizeString(prestadorCode);
    }
  } catch (e) {
     // Ignore and continue
  }

  // Last resort: search the whole object (less efficient)
  return findValueByKeyCaseInsensitive(jsonData, 'codPrestador');
};


export const calculateCupCounts = (jsonData: any): CupCountsMap => {
  const counts: CupCountsMap = new Map();
  if (!jsonData || !jsonData.usuarios) return counts;

  jsonData.usuarios.forEach((user: any) => {
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

  return counts;
};

export default function JsonAnalyzerPage({ setExecutionData, setJsonPrestadorCode, setUniqueUserCount }: JsonAnalyzerPageProps) {
  const [files, setFiles] = useState<FileState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Map<string, PrestadorInfo> | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(true);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));

  const filesByMonth = useMemo(() => {
    return files.reduce((acc, file) => {
      const monthFiles = acc.get(file.month) || [];
      monthFiles.push(file);
      acc.set(file.month, monthFiles);
      return acc;
    }, new Map<string, FileState[]>());
  }, [files]);

  const loadedMonthsCount = filesByMonth.size;
  const filesInCurrentMonth = filesByMonth.get(selectedMonth)?.length || 0;
  const canUploadForCurrentMonth = filesInCurrentMonth < 2;
  const canSelectNewMonth = loadedMonthsCount < 3 || filesByMonth.has(selectedMonth);

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
    if (isClient) {
      handleLoadProviders();
    }
  }, [isClient, handleLoadProviders]);

  const handleFileLoad = useCallback((loadedFiles: File[]) => {
    setError(null);
    setShowDuplicateAlert(false);

    if (filesInCurrentMonth + loadedFiles.length > 2) {
      toast({ title: 'Límite de archivos excedido', description: `Solo puedes cargar un máximo de 2 archivos por mes.`, variant: 'destructive' });
      return;
    }

    if (loadedMonthsCount >= 3 && !filesByMonth.has(selectedMonth)) {
      toast({ title: 'Límite de meses alcanzado', description: `Solo puedes cargar archivos para un máximo de 3 meses distintos.`, variant: 'destructive' });
      return;
    }

    const filePromises = loadedFiles.map(file => {
      return new Promise<FileState>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          if (!e.target?.result) return reject(new Error("No se pudo leer el archivo."));
          try {
            const content = e.target.result as string;
            const parsedJson = JSON.parse(content);
            
            // **FIXED**: Use the new robust function to get the code
            const prestadorCode = getCodPrestadorFromJson(parsedJson);
            const prestadorInfo = (prestadorCode && providers?.get(prestadorCode)) || null;

            // *** NOMBRE FINAL CON codPrestador ***
            const finalName = buildFileNameWithPrestador(file.name, prestadorCode);

            resolve({
              jsonData: parsedJson,
              fileName: finalName,
              prestadorInfo: prestadorInfo,
              month: selectedMonth
            });

          } catch (err: any) {
            const errorMessage = err instanceof Error ? `Error al parsear ${file.name}: ${err.message}` : `Error inesperado al parsear ${file.name}.`;
            setError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage);
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
  }, [providers, toast, selectedMonth, filesInCurrentMonth, loadedMonthsCount, filesByMonth]);

  useEffect(() => {
    const dataByMonth: ExecutionDataByMonth = new Map();
    const allNits: string[] = [];
    const uniqueUserIdentifiers = new Set<string>();


    files.forEach(file => {
      if (file.jsonData) {
        const nit = findValueByKeyCaseInsensitive(file.jsonData, 'numDocumentoIdObligado');
        if (nit) {
            allNits.push(nit);
        }
         // Contar usuarios únicos
        file.jsonData.usuarios?.forEach((user: any) => {
            const id = `${user.tipoDocumentoIdentificacion}-${user.numDocumentoIdentificacion}`;
            uniqueUserIdentifiers.add(id);
        });
      }
    });

    setUniqueUserCount(uniqueUserIdentifiers.size);


    const uniqueNits = new Set(allNits);
    setShowDuplicateAlert(allNits.length > uniqueNits.size);

    if (files.length > 0) {
      const firstPrestadorCode = getCodPrestadorFromJson(files[0].jsonData);
      if (firstPrestadorCode) {
        setJsonPrestadorCode(firstPrestadorCode);
      }
    } else {
      setJsonPrestadorCode(null);
    }

    filesByMonth.forEach((monthFiles, month) => {
      const monthCupCounts: CupCountsMap = new Map();

      const combinedSummary = monthFiles.reduce((acc, file) => {
        const summary = calculateSummary(file.jsonData);
        const fileCupCounts = calculateCupCounts(file.jsonData);

        fileCupCounts.forEach((count, cup) => {
          monthCupCounts.set(cup, (monthCupCounts.get(cup) || 0) + count);
        });

        acc.numUsuarios += summary.numUsuarios;
        acc.numConsultas += summary.numConsultas;
        acc.numProcedimientos += summary.numProcedimientos;
        acc.totalMedicamentos += summary.totalMedicamentos;
        acc.totalOtrosServicios += summary.totalOtrosServicios;
        return acc;
      }, {
        numFactura: monthFiles.length > 1 ? `Combinado (${monthFiles.length} archivos)` : monthFiles[0].fileName,
        numUsuarios: 0,
        numConsultas: 0,
        numProcedimientos: 0,
        totalMedicamentos: 0,
        totalOtrosServicios: 0,
      });

      dataByMonth.set(month, {
        cupCounts: monthCupCounts,
        summary: combinedSummary
      });
    });

    setExecutionData(dataByMonth);
  }, [files, filesByMonth, setExecutionData, setJsonPrestadorCode, setUniqueUserCount]);

  const handleReset = () => {
    setFiles([]);
    setError(null);
    setShowDuplicateAlert(false);
    setExecutionData(new Map());
    setJsonPrestadorCode(null);
    setUniqueUserCount(0);
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <p>Cargando analizador...</p>
      </div>
    );
  }

  const isUploadDisabled = isLoadingProviders || !canUploadForCurrentMonth || !canSelectNewMonth;
  const anyFileLoaded = files.length > 0;

  const getMonthName = (monthNumber: string) => {
    const date = new Date();
    date.setMonth(parseInt(monthNumber) - 1);
    const name = date.toLocaleString('es-CO', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="w-full space-y-8 mt-4">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Carga tus Archivos JSON</CardTitle>
              <CardDescription>
                Selecciona el mes y carga hasta 2 archivos JSON. Puedes añadir hasta 3 meses.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!canSelectNewMonth}>
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
            disabled={isUploadDisabled}
            loadedFileNames={filesByMonth.get(selectedMonth)?.map(f => f.fileName as string) || []}
            maxFiles={2}
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
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-center">Resultados de Archivos Cargados</h3>
          {files.map((file, index) => file.jsonData && (
            <Card key={index} className="shadow-md">
              <Accordion type="single" collapsible>
                <AccordionItem value={`item-${index}`}>
                  <AccordionTrigger className="p-6">
                    <div className="flex flex-col items-start text-left">
                      <h4 className="text-lg font-bold text-foreground">
                        <Building className="inline-block mr-2 h-5 w-5 text-primary" />
                        {file.prestadorInfo ? file.prestadorInfo.PRESTADOR : `Prestador no encontrado para código ${getCodPrestadorFromJson(file.jsonData) || 'desconocido'}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        NIT: {file.prestadorInfo?.NIT || findValueByKeyCaseInsensitive(file.jsonData, 'numDocumentoIdObligado')} | Archivo: {file.fileName} | Mes: {getMonthName(file.month)}
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 pt-0">
                    <DataVisualizer data={file.jsonData} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
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
