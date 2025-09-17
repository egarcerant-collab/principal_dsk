

"use client";

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, AlertTriangle, Search, Target, Download, Loader2, X, Users, Repeat, AlertCircle } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { findColumnValue, formatCurrency, type ComparisonSummary } from '../pgp-search/PgPsearchForm';
import type { DeviatedCupInfo, UnexpectedCupInfo } from '../pgp-search/PgPsearchForm';
import type { CupDescription } from '@/ai/flows/describe-cup-flow';
import { describeCup } from '@/ai/flows/describe-cup-flow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ExecutionDataByMonth } from '@/app/page';

const handleDownloadXls = (data: any[], filename: string) => {
    const dataToExport = JSON.parse(JSON.stringify(data));

    const formattedData = dataToExport.map((row: any) => {
        for (const key in row) {
            if (typeof row[key] === 'number') {
                row[key] = row[key].toString().replace('.', ',');
            }
        }
        return row;
    });

    const csv = Papa.unparse(formattedData, { delimiter: ";" });
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const DeviatedCupsCard = ({ title, icon, data, badgeVariant, pgpData, onDownload, onDoubleClick, totalValue, valueLabel }: {
    title: string;
    icon: React.ElementType;
    data: DeviatedCupInfo[];
    badgeVariant: "destructive" | "default" | "success";
    pgpData: any[];
    onDownload: (data: any[], filename: string) => void;
    onDoubleClick: () => void;
    totalValue: number;
    valueLabel: string;
}) => {
    const Icon = icon;
    const hasData = data && data.length > 0;
    
    let colorClass = 'text-muted-foreground';
    if(hasData) {
        if (badgeVariant === 'destructive') colorClass = 'text-red-500';
        else if (badgeVariant === 'default') colorClass = 'text-blue-500';
        else if (badgeVariant === 'success') colorClass = 'text-green-500';
    }
    
    return (
        <Card className="w-full cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={onDoubleClick}>
            <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${colorClass}`} />
                    <CardTitle className="text-base font-medium">{title}</CardTitle>
                </div>
                <div className='flex items-center gap-4 pl-4'>
                    {hasData && (
                        <div className="text-right">
                             <p className={`text-sm font-bold ${colorClass}`}>{formatCurrency(totalValue)}</p>
                             <p className="text-xs text-muted-foreground">{valueLabel}</p>
                        </div>
                    )}
                    {hasData && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                const downloadData = data.map(item => ({
                                    ...item,
                                    deviation: item.deviation,
                                    deviationValue: item.deviationValue
                                }));
                                onDownload(downloadData, `${title.toLowerCase().replace(/ /g, '_')}.xls`);
                            }}
                            className="h-7 w-7"
                            aria-label={`Descargar ${title}`}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    )}
                    <Badge variant={hasData ? badgeVariant : 'secondary'}>{data.length}</Badge>
                </div>
            </CardHeader>
        </Card>
    )
};


const DiscrepancyCard = ({ title, icon, data, badgeVariant, onLookupClick, onDownload, emptyText, onDoubleClick, totalValue, valueLabel }: {
    title: string;
    icon: React.ElementType;
    data: any[];
    badgeVariant: "secondary" | "outline";
    onLookupClick?: (cup: string) => void;
    onDownload: (data: any[], filename: string) => void;
    emptyText: string;
    onDoubleClick: () => void;
    totalValue?: number;
    valueLabel?: string;
}) => {
    const Icon = icon;
    const hasData = data && data.length > 0;
    const hasValue = typeof totalValue === 'number';

    return (
        <Card className="w-full cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={onDoubleClick}>
            <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                    <CardTitle className="text-base font-medium">{title}</CardTitle>
                </div>
                 <div className='flex items-center gap-4 pl-4'>
                    {hasValue && (
                         <div className="text-right">
                             <p className="text-sm font-bold text-purple-600">{formatCurrency(totalValue)}</p>
                             <p className="text-xs text-muted-foreground">{valueLabel}</p>
                        </div>
                    )}
                    {hasData && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDownload(data, `${title.toLowerCase().replace(/ /g, '_')}.xls`);
                            }}
                            className="h-7 w-7"
                            aria-label={`Descargar ${title}`}
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    )}
                    <Badge variant={hasData ? badgeVariant : 'secondary'}>{data.length}</Badge>
                </div>
            </CardHeader>
        </Card>
    );
};


const CupDetailsModal = ({ cupData, uniqueUsersCount, totalFrequency, sameDayDetections, open, onOpenChange, executionDataByMonth }: { cupData: any | null, uniqueUsersCount: number, totalFrequency: number, sameDayDetections: number, open: boolean, onOpenChange: (open: boolean) => void, executionDataByMonth: ExecutionDataByMonth }) => {
    if (!cupData) return null;

    const averagePerUser = uniqueUsersCount > 0 ? (totalFrequency / uniqueUsersCount) : 0;
    const repeatedUsersAttention = totalFrequency - uniqueUsersCount;
    
    const filteredCupData = useMemo(() => {
        if (!cupData) return [];
        return Object.entries(cupData).filter(([key, value]) => {
            const val = String(value).trim();
            if (val === '' || val === '-' || val === '$0.00' || val === '0' || val === '$0') return false;
            if (/^_+\d*$/.test(val)) return false; // descarta _1, _2, etc.
            return true;
        });
    }, [cupData]);
    
    const handleDownloadDetails = () => {
        const cupToFind = findColumnValue(cupData, ['cup/cum', 'cups']);
        const executionDetails: any[] = [];

        executionDataByMonth.forEach((monthData) => {
            monthData.rawJsonData.usuarios?.forEach((user: any) => {
                const userId = `${user.tipoDocumentoIdentificacion}-${user.numDocumentoIdentificacion}`;

                const processServices = (services: any[], codeField: string, type: string) => {
                    if (!services) return;
                    services.forEach((service: any) => {
                        if (service[codeField] === cupToFind) {
                            executionDetails.push({
                                TIPO_SERVICIO: type,
                                ID_USUARIO: userId,
                                FECHA_ATENCION: service.fechaInicioAtencion,
                                CODIGO_SERVICIO: service[codeField],
                                DIAGNOSTICO_PRINCIPAL: service.codDiagnosticoPrincipal,
                                CANTIDAD: service.cantidadMedicamento || service.cantidadOS || 1,
                                VALOR_SERVICIO: service.vrServicio || (service.vrUnitarioMedicamento * (service.cantidadMedicamento || 1)),
                            });
                        }
                    });
                };
                
                processServices(user.servicios?.consultas, 'codConsulta', 'CONSULTA');
                processServices(user.servicios?.procedimientos, 'codProcedimiento', 'PROCEDIMIENTO');
                processServices(user.servicios?.medicamentos, 'codTecnologiaSalud', 'MEDICAMENTO');
                processServices(user.servicios?.otrosServicios, 'codTecnologiaSalud', 'OTRO_SERVICIO');
            });
        });

        handleDownloadXls(executionDetails, `matriz_detalle_${cupToFind}.xls`);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Detalles del CUPS: <span className="font-mono">{cupData['CUP/CUM']}</span></AlertDialogTitle>
                    <AlertDialogDescription>
                        {cupData['DESCRIPCION CUPS'] || "Información detallada de la nota técnica."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 <ScrollArea className="max-h-80 pr-6">
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-2 border-b pb-2">
                            <dt className="font-semibold text-muted-foreground flex items-center gap-2"><Repeat className="h-4 w-4" />Total de Atenciones</dt>
                            <dd className="text-right font-bold text-lg text-primary">{totalFrequency}</dd>
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-b pb-2">
                            <dt className="font-semibold text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Usuarios Únicos Atendidos</dt>
                            <dd className="text-right font-bold text-lg text-primary">{uniqueUsersCount}</dd>
                        </div>
                         <div className="grid grid-cols-2 gap-2 border-b pb-2">
                            <dt className="font-semibold text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4 opacity-70" />Atenciones a Usuarios Repetidos</dt>
                            <dd className="text-right font-bold text-lg text-primary">{repeatedUsersAttention}</dd>
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-b pb-2">
                            <dt className="font-semibold text-muted-foreground flex items-center gap-2"><Target className="h-4 w-4" />Promedio por Usuario</dt>
                            <dd className="text-right font-bold text-lg text-primary">{averagePerUser.toFixed(2)}</dd>
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-b pb-2">
                            <dt className="font-semibold text-red-600 flex items-center gap-2"><AlertCircle className="h-4 w-4" />Usuarios Atendidos &gt;1 Vez el Mismo Día</dt>
                            <dd className="text-right font-bold text-lg text-red-600">{sameDayDetections}</dd>
                        </div>

                        {filteredCupData.map(([key, value]) => (
                            <div key={key} className="grid grid-cols-2 gap-2 border-b pb-2">
                                <dt className="font-semibold text-muted-foreground">{key}</dt>
                                <dd className="text-right">{typeof value === 'number' ? formatCurrency(value) : String(value)}</dd>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <AlertDialogFooter>
                    <Button variant="secondary" onClick={handleDownloadDetails}>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Detalle
                    </Button>
                    <AlertDialogAction onClick={() => onOpenChange(false)}>Cerrar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export const LookedUpCupModal = ({ cupInfo, open, onOpenChange, isLoading }: { cupInfo: CupDescription | null, open: boolean, onOpenChange: (open: boolean) => void, isLoading: boolean }) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isLoading ? "Buscando información..." : `Resultado para: ${cupInfo?.cup}`}
          </AlertDialogTitle>
        </AlertDialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <AlertDialogDescription>
            {cupInfo?.description || "No se encontró una descripción para este código."}
          </AlertDialogDescription>
        )}
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>Cerrar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


const TableModal = ({ open, onOpenChange, title, content, data, downloadFilename, totals }: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    title: React.ReactNode; 
    content: React.ReactNode;
    data: any[];
    downloadFilename: string;
    totals?: {
        ejecutado: number;
        desviacion: number;
    }
}) => {
  if (!totals) return null;
  const valorSugerido = totals.ejecutado - totals.desviacion;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
         <DialogHeader>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <DialogTitle>{title}</DialogTitle>
             <div className="text-right space-y-1 text-sm">
                <p><span className="font-semibold text-green-600">Valor Ejecutado: </span>{formatCurrency(totals.ejecutado)}</p>
                <p><span className="font-semibold text-red-600">Valor Desviación: </span>{formatCurrency(totals.desviacion)}</p>
                <p><span className="font-semibold text-blue-600">Valor Sugerido a Revisión: </span>{formatCurrency(valorSugerido)}</p>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-grow overflow-hidden">
          {content}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => handleDownloadXls(data, downloadFilename)}>
            <Download className="mr-2 h-4 w-4" />
            Descargar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface InformeDesviacionesProps {
    comparisonSummary: ComparisonSummary | null;
    pgpData: any[];
    executionDataByMonth: ExecutionDataByMonth;
}


export default function InformeDesviaciones({ comparisonSummary, pgpData, executionDataByMonth }: InformeDesviacionesProps) {
    const [selectedCupData, setSelectedCupData] = useState<any | null>(null);
    const [isCupModalOpen, setIsCupModalOpen] = useState(false);
    const [lookedUpCupInfo, setLookedUpCupInfo] = useState<CupDescription | null>(null);
    const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
    const [isLookupLoading, setIsLookupLoading] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: React.ReactNode, data: any[], type: string, totals: {ejecutado: number, desviacion: number} } | null>(null);
    const [uniqueUsersCount, setUniqueUsersCount] = useState(0);
    const [totalFrequency, setTotalFrequency] = useState(0);
    const [sameDayDetections, setSameDayDetections] = useState(0);


    const calculateTotals = (items: DeviatedCupInfo[]) => {
        if (!items) return { ejecutado: 0, desviacion: 0 };
        const totalEjecutado = items.reduce((sum, cup) => sum + (cup.totalValue || 0), 0);
        const totalDesviacion = items.reduce((sum, cup) => sum + (cup.deviationValue || 0), 0);
        return {
            ejecutado: totalEjecutado,
            desviacion: totalDesviacion
        };
    }
    
    const overExecutionTotals = useMemo(() => calculateTotals(comparisonSummary?.overExecutedCups || []), [comparisonSummary]);
    const underExecutionTotals = useMemo(() => calculateTotals(comparisonSummary?.underExecutedCups || []), [comparisonSummary]);
    const normalExecutionTotals = useMemo(() => calculateTotals(comparisonSummary?.normalExecutionCups || []), [comparisonSummary]);

    const totalUnexpectedValue = useMemo(() => 
        (comparisonSummary?.unexpectedCups || []).reduce((sum, cup) => sum + cup.totalValue, 0),
    [comparisonSummary]);

    if (!comparisonSummary) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="uppercase">Análisis de Frecuencias y Desviaciones</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No hay datos de ejecución cargados para comparar.</p>
                </CardContent>
            </Card>
        )
    }

    const countUniqueUsersAndFrequencyForCup = (cup: string) => {
        const userIds = new Set<string>();
        let frequency = 0;
        
        executionDataByMonth.forEach(monthData => {
            const cupExecutionData = monthData.cupCounts.get(cup);
            if(cupExecutionData) {
                frequency += cupExecutionData.total;
            }

            const rawJsonData = monthData.rawJsonData;
            if (!rawJsonData || !rawJsonData.usuarios) return;

            rawJsonData.usuarios.forEach((user: any) => {
                let hasService = false;
                const checkService = (s: any, codeField: string) => {
                    if (s && s[codeField] === cup) hasService = true;
                };

                user.servicios?.consultas?.forEach((s:any) => checkService(s, 'codConsulta'));
                if (hasService) { userIds.add(`${user.tipoDocumentoIdentificacion}-${user.numDocumentoIdentificacion}`); return; }

                user.servicios?.procedimientos?.forEach((s:any) => checkService(s, 'codProcedimiento'));
                if (hasService) { userIds.add(`${user.tipoDocumentoIdentificacion}-${user.numDocumentoIdentificacion}`); return; }
                
                user.servicios?.medicamentos?.forEach((s:any) => checkService(s, 'codTecnologiaSalud'));
                if (hasService) { userIds.add(`${user.tipoDocumentoIdentificacion}-${user.numDocumentoIdentificacion}`); return; }
                
                user.servicios?.otrosServicios?.forEach((s:any) => checkService(s, 'codTecnologiaSalud'));
                if (hasService) { userIds.add(`${user.tipoDocumentoIdentificacion}-${user.numDocumentoIdentificacion}`); return; }
            });
        });
        
        return { uniqueUsers: userIds.size, totalFrequency: frequency };
    };

    const calculateSameDayDetections = (cup: string) => {
        const attentionMap = new Map<string, number>(); // key: "userId-date", value: count
        
        executionDataByMonth.forEach(monthData => {
            monthData.rawJsonData.usuarios?.forEach((user: any) => {
                const userId = `${user.tipoDocumentoIdentificacion}-${user.numDocumentoIdentificacion}`;

                const processServices = (services: any[], codeField: string) => {
                    if (!services) return;
                    services.forEach((service: any) => {
                        if (service[codeField] === cup) {
                            try {
                                const date = new Date(service.fechaInicioAtencion).toISOString().split('T')[0];
                                const key = `${userId}-${date}`;
                                attentionMap.set(key, (attentionMap.get(key) || 0) + 1);
                            } catch (e) {
                                // Invalid date, skip
                            }
                        }
                    });
                };
                
                processServices(user.servicios?.consultas, 'codConsulta');
                processServices(user.servicios?.procedimientos, 'codProcedimiento');
                processServices(user.servicios?.medicamentos, 'codTecnologiaSalud');
                processServices(user.servicios?.otrosServicios, 'codTecnologiaSalud');
            });
        });

        const usersWithMultipleSameDayAttentions = new Set<string>();
        attentionMap.forEach((count, key) => {
            if (count > 1) {
                const userId = key.split('-')[0];
                usersWithMultipleSameDayAttentions.add(userId);
            }
        });
        
        return usersWithMultipleSameDayAttentions.size;
    }

    const handleCupClick = (cup: string) => {
        const cupDetails = pgpData.find(row => findColumnValue(row, ['cup/cum', 'cups']) === cup);
        if (cupDetails) {
            const { uniqueUsers, totalFrequency } = countUniqueUsersAndFrequencyForCup(cup);
            const sameDayCount = calculateSameDayDetections(cup);
            setUniqueUsersCount(uniqueUsers);
            setTotalFrequency(totalFrequency);
            setSameDayDetections(sameDayCount);
            setSelectedCupData(cupDetails);
            setIsCupModalOpen(true);
        } else {
            handleLookupClick(cup);
        }
    };
    
    const handleLookupClick = async (cup: string) => {
        setIsLookupLoading(true);
        setIsLookupModalOpen(true);
        try {
            const result = await describeCup(cup);
            setLookedUpCupInfo(result);
        } catch (error) {
            setLookedUpCupInfo({ cup, description: "Error al buscar la descripción." });
            console.error("Error looking up CUP:", error);
        } finally {
            setIsLookupLoading(false);
        }
    };
    
    const handleDoubleClick = (type: string, title: React.ReactNode, data: any[], totals: {ejecutado: number, desviacion: number}) => {
        setModalContent({ type, title, data, totals });
    }
    
    const renderModalContent = () => {
        if (!modalContent) return null;

        const { type, data } = modalContent;

        const renderTableForDeviated = (items: DeviatedCupInfo[]) => (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>CUPS</TableHead>
                        <TableHead>Actividad</TableHead>
                        <TableHead className="text-center">Frec. Esperada</TableHead>
                        <TableHead className="text-center">Frec. Real</TableHead>
                        <TableHead className="text-center">Desviación</TableHead>
                        <TableHead className="text-right">Valor Desviación</TableHead>
                        <TableHead className="text-right">Valor Ejecutado (NT)</TableHead>
                        <TableHead className="text-right">Valor Sugerido a Revisión</TableHead>
                        <TableHead className="text-right">Valor a Reconocer</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item: DeviatedCupInfo) => {
                        const valorSugerido = item.totalValue - item.deviationValue;
                        return (
                            <TableRow key={item.cup}>
                                <TableCell>
                                    <Button variant="link" className="p-0 h-auto font-mono text-sm" onClick={() => handleCupClick(item.cup)}>
                                        {item.cup}
                                    </Button>
                                </TableCell>
                                <TableCell className="text-sm max-w-xs truncate">{item.activityDescription}</TableCell>
                                <TableCell className="text-center text-sm">{item.expectedFrequency.toFixed(0)}</TableCell>
                                <TableCell className="text-center text-sm">{item.realFrequency}</TableCell>
                                <TableCell className={`text-center font-bold text-sm ${item.deviation > 0 ? 'text-red-600' : 'text-blue-600'}`}>{item.deviation.toFixed(0)}</TableCell>
                                <TableCell className={`text-right font-bold text-sm text-red-600`}>{formatCurrency(item.deviationValue)}</TableCell>
                                <TableCell className={`text-right font-bold text-sm text-green-700`}>{formatCurrency(item.totalValue)}</TableCell>
                                <TableCell className={`text-right font-bold text-sm text-blue-700`}>{formatCurrency(valorSugerido)}</TableCell>
                                <TableCell className="text-right font-bold text-sm text-purple-600">{formatCurrency(item.valorReconocer)}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        );

        switch (type) {
            case 'over-executed':
            case 'under-executed':
            case 'normal-execution':
                return (
                    <ScrollArea className="h-full">
                       {renderTableForDeviated(data as DeviatedCupInfo[])}
                    </ScrollArea>
                )
             case 'missing':
                return (
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-sm">CUPS</TableHead>
                                    <TableHead className="text-sm">Descripción</TableHead>
                                    <TableHead className="text-center text-sm">Frec. Esperada</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item: any) => (
                                    <TableRow key={item.cup}>
                                        <TableCell className="font-mono text-sm">{item.cup}</TableCell>
                                        <TableCell className="text-sm">{item.description || 'N/A'}</TableCell>
                                        <TableCell className="text-center text-sm">{item.expectedFrequency}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                 )
             case 'unexpected':
                 return (
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-sm">CUPS</TableHead>
                                    <TableHead className="text-sm">Descripción</TableHead>
                                    <TableHead className="text-center text-sm">Frec. Real</TableHead>
                                    <TableHead className="text-right text-sm">Valor Ejecutado</TableHead>
                                    <TableHead className="text-center text-sm">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item: UnexpectedCupInfo) => (
                                    <TableRow key={item.cup}>
                                        <TableCell className="font-mono text-sm">{item.cup}</TableCell>
                                        <TableCell className="text-sm">N/A</TableCell>
                                        <TableCell className="text-center text-sm">{item.realFrequency}</TableCell>
                                        <TableCell className="text-right font-bold text-sm">{formatCurrency(item.totalValue)}</TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="outline" size="sm" className="text-sm" onClick={() => handleLookupClick(item.cup)}>
                                                <Search className="mr-2 h-3 w-3" /> Buscar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                 )
            default:
                return null;
        }
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="uppercase">Análisis de Frecuencias y Desviaciones</CardTitle>
                    <CardDescription>
                        Comparación entre la frecuencia de servicios esperada (nota técnica) y la real (archivos JSON). Doble clic para expandir la tabla.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <DeviatedCupsCard
                        title="CUPS Sobreejecutados (>111%)"
                        icon={TrendingUp}
                        data={comparisonSummary.overExecutedCups}
                        badgeVariant="destructive"
                        pgpData={pgpData}
                        onDownload={handleDownloadXls}
                        onDoubleClick={() => handleDoubleClick('over-executed', "CUPS Sobreejecutados (>111%)", comparisonSummary.overExecutedCups, overExecutionTotals)}
                        totalValue={overExecutionTotals.desviacion}
                        valueLabel="Valor Desviación"
                    />
                    <DeviatedCupsCard
                        title="Ejecución dentro del rango (90-111%)"
                        icon={Target}
                        data={comparisonSummary.normalExecutionCups}
                        badgeVariant="success"
                        pgpData={pgpData}
                        onDownload={handleDownloadXls}
                        onDoubleClick={() => handleDoubleClick('normal-execution', "Ejecución dentro del rango (90-111%)", comparisonSummary.normalExecutionCups, normalExecutionTotals)}
                        totalValue={normalExecutionTotals.ejecutado}
                        valueLabel="Valor Ejecutado"
                    />
                    <DeviatedCupsCard
                        title="CUPS Subejecutados (&lt;90%)"
                        icon={TrendingDown}
                        data={comparisonSummary.underExecutedCups}
                        badgeVariant="default"
                        pgpData={pgpData}
                        onDownload={handleDownloadXls}
                        onDoubleClick={() => handleDoubleClick('under-executed', "CUPS Subejecutados (<90%)", comparisonSummary.underExecutedCups, underExecutionTotals)}
                        totalValue={underExecutionTotals.desviacion}
                        valueLabel="Valor Desviación"
                    />
                     <DiscrepancyCard
                        title="CUPS Faltantes"
                        icon={AlertTriangle}
                        data={comparisonSummary.missingCups}
                        badgeVariant="secondary"
                        onDownload={handleDownloadXls}
                        emptyText="No hay CUPS planificados que falten en la ejecución."
                        onDoubleClick={() => handleDoubleClick('missing', 'CUPS Faltantes', comparisonSummary.missingCups, {ejecutado: 0, desviacion: 0})}
                    />
                     <DiscrepancyCard
                        title="CUPS Inesperados"
                        icon={Search}
                        data={comparisonSummary.unexpectedCups}
                        badgeVariant="outline"
                        onLookupClick={handleLookupClick}
                        onDownload={handleDownloadXls}
                        emptyText="No se encontraron CUPS ejecutados que no estuvieran en la nota técnica."
                        onDoubleClick={() => handleDoubleClick('unexpected', 'CUPS Inesperados', comparisonSummary.unexpectedCups, {ejecutado: totalUnexpectedValue, desviacion: totalUnexpectedValue})}
                        totalValue={totalUnexpectedValue}
                        valueLabel="Valor Ejecutado"
                    />
                </CardContent>
            </Card>

            <CupDetailsModal
                cupData={selectedCupData}
                uniqueUsersCount={uniqueUsersCount}
                totalFrequency={totalFrequency}
                sameDayDetections={sameDayDetections}
                open={isCupModalOpen}
                onOpenChange={setIsCupModalOpen}
                executionDataByMonth={executionDataByMonth}
            />
            
             <LookedUpCupModal
                cupInfo={lookedUpCupInfo}
                open={isLookupModalOpen}
                onOpenChange={setIsLookupModalOpen}
                isLoading={isLookupLoading}
            />

            {modalContent && (
                <TableModal
                    open={!!modalContent}
                    onOpenChange={() => setModalContent(null)}
                    title={modalContent.title}
                    content={renderModalContent()}
                    data={modalContent.data}
                    downloadFilename={`${String(modalContent.type).toLowerCase().replace(/ /g, '_')}.xls`}
                    totals={modalContent.totals}
                />
            )}
        </div>
    );
}
    

    

    

    

    

    

