"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { UploadCloud, FileJson } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileLoad: (content: string) => void;
  disabled?: boolean;
}

export default function FileUpload({ onFileLoad, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          onFileLoad(e.target.result as string);
          setFileName(file.name);
        }
      };
      reader.readAsText(file);
    } else {
      // Basic validation feedback
      alert('Por favor, sube un archivo JSON válido.');
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
  };

  const triggerFileSelect = () => {
    inputRef.current?.click();
  };
  
  const handleReset = () => {
    setFileName(null);
    onFileLoad(''); // Pass empty string to reset to default JSON
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
        <Button variant="outline" onClick={handleReset} disabled={disabled}>Subir otro archivo</Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex w-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-300',
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
          Arrastra y suelta tu archivo JSON aquí
        </p>
        <p className="text-sm">o</p>
        <Button type="button" variant="secondary" size="sm" disabled={disabled}>
          Busca en tus Archivos
        </Button>
      </div>
    </div>
  );
}
