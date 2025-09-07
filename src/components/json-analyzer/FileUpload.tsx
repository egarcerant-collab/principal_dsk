
"use client";

import React, { useRef, useState, type ChangeEvent, type DragEvent, useEffect } from 'react';
import { UploadCloud, FileJson, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileLoad: (content: string, name: string) => void;
  disabled?: boolean;
  fileSlot: 'file1' | 'file2'; // To identify the uploader instance
  loadedFileName: string | null;
}

export default function FileUpload({ onFileLoad, disabled, fileSlot, loadedFileName }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (file: File) => {
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          onFileLoad(e.target.result as string, file.name);
        }
      };
      reader.readAsText(file);
    } else {
      toast({ title: 'Error', description: 'Por favor, sube un archivo JSON válido.', variant: 'destructive'});
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
     if (e.target) {
      e.target.value = ''; // Allow re-uploading the same file
    }
  };

  const triggerFileSelect = () => {
    if (!loadedFileName) {
        inputRef.current?.click();
    }
  };
  
  if (loadedFileName) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center p-6 border-2 border-dashed rounded-lg border-green-500 bg-green-50 h-[178px]">
        <FileJson className="h-12 w-12 text-green-600" />
        <p className="font-medium text-green-800">Archivo cargado:</p>
        <p className="text-sm text-green-700 truncate max-w-full px-2">{loadedFileName}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex w-full h-[178px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-300',
        isDragging ? 'border-accent bg-accent/10' : 'border-border',
        disabled ? 'cursor-not-allowed bg-muted/50' : 'cursor-pointer hover:border-accent/70'
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
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <UploadCloud className="h-12 w-12" />
        <p className="font-semibold text-foreground">
          Arrastra o selecciona un archivo
        </p>
        <p className="text-sm">o</p>
        <Button type="button" variant="secondary" size="sm" disabled={disabled}>
          Buscar archivos
        </Button>
      </div>
    </div>
  );
}
