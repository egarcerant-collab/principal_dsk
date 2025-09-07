
"use client";

import React, { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { UploadCloud, FileJson } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileLoad: (files: File[]) => void;
  disabled?: boolean;
  loadedFileNames: string[];
}

export default function FileUpload({ onFileLoad, disabled, loadedFileNames }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const jsonFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach(file => {
        if (file && file.type === 'application/json') {
            jsonFiles.push(file);
        } else {
            invalidFiles.push(file.name);
        }
    });

    if (invalidFiles.length > 0) {
        toast({ 
            title: 'Archivos no válidos', 
            description: `Los siguientes archivos no son JSON y serán ignorados: ${invalidFiles.join(', ')}`, 
            variant: 'destructive'
        });
    }

    if (jsonFiles.length > 0) {
        onFileLoad(jsonFiles);
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
    if (disabled) return;
    
    handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset the input value to allow re-uploading the same file
    if (e.target) {
        e.target.value = '';
    }
  };

  const triggerFileSelect = () => {
    inputRef.current?.click();
  };
  
  const hasFiles = loadedFileNames.length > 0;

  return (
    <div
      className={cn(
        'relative flex w-full h-[178px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-300',
        isDragging ? 'border-accent bg-accent/10' : 'border-border',
        disabled ? 'cursor-not-allowed bg-muted/50' : 'cursor-pointer hover:border-accent/70',
        hasFiles && 'border-green-500 bg-green-50'
      )}
      onClick={disabled ? undefined : triggerFileSelect}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
        multiple // Allow multiple files
      />

      {hasFiles ? (
        <div className="flex flex-col items-center justify-center gap-2 text-center">
            <FileJson className="h-10 w-10 text-green-600" />
            <p className="font-medium text-green-800">Archivos cargados:</p>
            <ul className="text-sm text-green-700 list-none p-0 m-0">
            {loadedFileNames.map((name, index) => (
                 <li key={index} className="truncate max-w-xs">{name}</li>
            ))}
            </ul>
             {loadedFileNames.length < 2 && !disabled && (
                 <Button type="button" variant="secondary" size="sm" className="mt-2">Añadir otro archivo</Button>
            )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="h-12 w-12" />
            <p className="font-semibold text-foreground">
            Arrastra o selecciona hasta 2 archivos
            </p>
            <p className="text-sm">o</p>
            <Button type="button" variant="secondary" size="sm" disabled={disabled}>
            Buscar archivos
            </Button>
        </div>
      )}
    </div>
  );
}

    