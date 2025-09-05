
"use client";

import React, { useRef, useState, type ChangeEvent, type DragEvent, useCallback } from 'react';
import { UploadCloud, FileJson, DatabaseZap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import Papa, { type ParseResult } from 'papaparse';
import { Separator } from '@/components/ui/separator';

interface FileUploadProps {
  onFileLoad: (content: string, name: string) => void;
  onReset: () => void;
  disabled?: boolean;
}

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1Aajbs7d4dxfvd0Juxr6jrHobtQg1N4IA/edit?gid=895489820#gid=895489820";

export default function FileUpload({ onFileLoad, onReset, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (file: File) => {
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          onFileLoad(e.target.result as string, file.name);
          setFileName(file.name);
        }
      };
      reader.readAsText(file);
    } else {
      toast({ title: 'Error', description: 'Por favor, sube un archivo JSON válido.', variant: 'destructive'});
    }
  };
  
  const fetchAndParseSheetData = useCallback(async (url: string): Promise<any[]> => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error("URL de Google Sheets inválida.");

    const sheetId = match[1];
    const gidMatch = url.match(/gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    const fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`Error obteniendo Google Sheet: ${response.statusText}`);
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: 'greedy',
            dynamicTyping: true,
            complete: (results: ParseResult<any>) => {
                if (results.errors.length) {
                    console.warn("Errores de parseo:", results.errors);
                }
                // Limpieza simple de llaves
                const cleanedData = results.data.map(row => {
                    const newRow: {[key: string]: any} = {};
                    for (const key in row) {
                        const trimmedKey = key.trim();
                        if (trimmedKey) {
                            newRow[trimmedKey] = row[key];
                        }
                    }
                    return newRow;
                });
                resolve(cleanedData);
            },
            error: (error: Error) => reject(new Error(`Error parseando CSV: ${error.message}`))
        });
    });
  }, []);

  const handleLoadFromSheet = async () => {
    setLoadingSheet(true);
    toast({ title: "Cargando datos desde Google Sheets..." });
    try {
        const data = await fetchAndParseSheetData(GOOGLE_SHEET_URL);
        onFileLoad(JSON.stringify({sheetData: data}, null, 2), "Google Sheet Data.json");
        setFileName("Google Sheet Data.json");
        toast({ title: "Datos cargados exitosamente", description: `Se cargaron ${data.length} filas.` });
    } catch (error: any) {
        toast({ title: "Error al Cargar Datos", description: error.message, variant: "destructive" });
    } finally {
        setLoadingSheet(false);
    }
  };


  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || loadingSheet) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const triggerFileSelect = () => {
    if (loadingSheet) return;
    inputRef.current?.click();
  };
  
  const handleResetClick = () => {
    setFileName(null);
    onReset();
    if (inputRef.current) {
      inputRef.current.value = ''; // Reset file input
    }
  };

  if (fileName) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center p-6 border-2 border-dashed rounded-lg border-green-500 bg-green-50">
        <FileJson className="h-12 w-12 text-green-600" />
        <p className="font-medium text-green-800">Archivo cargado:</p>
        <p className="text-sm text-green-700">{fileName}</p>
        <Button variant="outline" onClick={handleResetClick} disabled={disabled}>Subir otro archivo</Button>
      </div>
    );
  }

  const isComponentDisabled = disabled || loadingSheet;

  return (
    <div className="space-y-4">
        <div
          className={cn(
            'relative flex w-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-300',
            isDragging ? 'border-accent bg-accent/10' : 'border-border',
            isComponentDisabled ? 'cursor-not-allowed bg-muted/50' : 'cursor-pointer hover:border-accent/70'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            className="hidden"
            disabled={isComponentDisabled}
          />
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="h-12 w-12" />
            <p className="font-semibold text-foreground">
              Arrastra y suelta tu archivo JSON aquí
            </p>
            <p className="text-sm">o</p>
            <Button type="button" variant="secondary" size="sm" disabled={isComponentDisabled}>
              Buscar archivos
            </Button>
          </div>
        </div>
        <div className="relative flex items-center justify-center">
            <Separator className="w-full" />
            <span className="absolute bg-card px-2 text-sm text-muted-foreground">O</span>
        </div>
         <Button onClick={handleLoadFromSheet} disabled={isComponentDisabled} className="w-full">
            {loadingSheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
            {loadingSheet ? "Cargando..." : "Cargar desde Google Sheets"}
        </Button>
    </div>
  );
}
