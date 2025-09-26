

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, DollarSign, Filter, Stethoscope, Microscope, Pill, Syringe, WalletCards, TrendingDown, CheckCircle, MessageSquarePlus, Download, Eraser, Wallet } from "lucide-react";
import { Button } from '@/components/ui/button';
import { formatCurrency } from './PgPsearchForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ExecutionDataByMonth } from '@/app/page';
import { CupDetailsModal } from '../report/InformeDesviaciones';
import type { DeviatedCupInfo } from './PgPsearchForm';
import { Textarea } from '../ui/textarea';
import { getNumericValue } from '../app/JsonAnalyzerPage';


export type ServiceType = "Consulta" | "Procedimiento" | "Medicamento" | "Otro Servicio" | "Desconocido";

export interface DiscountMatrixRow {
    CUPS: string;
    Descripcion?: string;
    Cantidad_Ejecutada: number;
    Valor_Unitario: number;
    Valor_Ejecutado: number;
    Valor_a_Reconocer: number;
    Valor_a_Descontar: number;
    Clasificacion: string;
    Tipo_Servicio: ServiceType;
    // Add all properties from DeviatedCupInfo to allow passing it to the modal
    expectedFrequency: number;
    realFrequency: number;
    uniqueUsers: number;
    repeatedAttentions: number;
    sameDayDetections: number;
    sameDayDetectionsCost: number;
    deviation: number;
    deviationValue: number;
    totalValue: number;
    valorReconocer: number;
    activityDescription?: string;
    unitValueFromNote?: number;
}

export interface AdjustedData {
  adjustedQuantities: Record<string, number>;
  adjustedValues: Record<string, number>;
  comments: Record<string, string>;
}

interface DiscountMatrixProps {
  data: DiscountMatrixRow[];
  executionDataByMonth: ExecutionDataByMonth;
  pgpData: any[]; // PgpRow[]
  onAdjustmentsChange: (adjustments: AdjustedData) => void;
  storageKey: string; // Unique key for localStorage
}

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

const serviceTypeIcons: Record<ServiceType, React.ElementType> = {
    "Consulta": Stethoscope,
    "Procedimiento": Microscope,
    "Medicamento": Pill,
    "Otro Servicio": Syringe,
    "Desconocido": DollarSign,
};

const CommentModal = ({ open, onOpenChange, onSave, initialComment }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (comment: string) => void;
  initialComment: string;
}) => {
  const [comment, setComment] = useState(initialComment);

  useEffect(() => {
    if (open) {
      setComment(initialComment);
    }
  }, [open, initialComment]);

  const handleSave = () => {
    onSave(comment);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Comentario de Glosa</DialogTitle>
          <DialogDescription>
            Justifica el ajuste realizado en la cantidad validada. Este comentario es obligatorio.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Escribe aquí tu justificación..."
          className="min-h-[120px]"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar Comentario</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const DiscountMatrix: React.FC<DiscountMatrixProps> = ({ data, executionDataByMonth, pgpData, onAdjustmentsChange, storageKey }) => {
    const [selectedCupForDetail, setSelectedCupForDetail] = useState<DeviatedCupInfo | null>(null);
    const [isCupModalOpen, setIsCupModalOpen] = useState(false);
    const [executionDetails, setExecutionDetails] = useState<any[]>([]);
    
    // States for adjustments
    const [adjustedQuantities, setAdjustedQuantities] = useState<Record<string, number>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
    
    // Modals
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [currentCupForComment, setCurrentCupForComment] = useState<string | null>(null);
    
    // Filters
    const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceType | 'all'>('all');


     // Load initial state from localStorage
    const initializeStateFromData = useCallback(() => {
        const initialQuantities: Record<string, number> = {};
        
        data.forEach(row => {
            initialQuantities[row.CUPS] = row.Cantidad_Ejecutada;
        });

        setAdjustedQuantities(initialQuantities);
        setComments({});
        setSelectedRows({});
    }, [data]);

    useEffect(() => {
        if (!storageKey) return;
        try {
            const savedState = localStorage.getItem(storageKey);
            if (savedState) {
                const { adjustedQuantities: sq, comments: sc, selectedRows: sr } = JSON.parse(savedState);
                if(sq) setAdjustedQuantities(sq);
                if(sc) setComments(sc);
                if(sr) setSelectedRows(sr);
            } else {
                 initializeStateFromData();
            }
        } catch (error) {
            console.error("Error loading state from localStorage", error);
            initializeStateFromData();
        }
    }, [storageKey, initializeStateFromData]);
    
    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (!storageKey) return;
        try {
            const stateToSave = {
                adjustedQuantities,
                comments,
                selectedRows
            };
            localStorage.setItem(storageKey, JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Error saving state to localStorage", error);
        }
    }, [adjustedQuantities, comments, selectedRows, storageKey]);


    useEffect(() => {
        const adjustedValues: Record<string, number> = {};
        data.forEach(row => {
            const validatedQuantity = adjustedQuantities[row.CUPS] ?? row.Cantidad_Ejecutada;
            const recalculatedValorReconocer = validatedQuantity * row.Valor_Unitario;
            const discountValue = row.Valor_Ejecutado - recalculatedValorReconocer;
            adjustedValues[row.CUPS] = discountValue > 0 ? discountValue : 0;
        });
      onAdjustmentsChange({ adjustedQuantities, adjustedValues, comments });
    }, [adjustedQuantities, comments, data, onAdjustmentsChange]);
    
    const handleClearAdjustments = () => {
        if (storageKey) localStorage.removeItem(storageKey);
        initializeStateFromData();
    };

    const filteredData = useMemo(() => {
        if (serviceTypeFilter === 'all') return data;
        return data.filter(row => row.Tipo_Servicio === serviceTypeFilter);
    }, [data, serviceTypeFilter]);
    
    const handleCupClick = (cupInfo: DiscountMatrixRow) => {
        const details: any[] = [];
        executionDataByMonth.forEach((monthData) => {
            monthData.rawJsonData.usuarios?.forEach((user: any) => {
                const userId = `${user.tipoDocumentoIdentificacion}-${user.numDocumentoIdentificacion}`;
                const processServices = (services: any[], codeField: string, type: string, valueField: string = 'vrServicio', unitValueField?: string, qtyField?: string) => {
                    if (!services) return;
                    services.forEach((service: any) => {
                        if (service[codeField] === cupInfo.CUPS) {
                            let serviceValue = 0;
                             if (unitValueField && qtyField) {
                                serviceValue = getNumericValue(service[unitValueField]) * getNumericValue(service[qtyField]);
                            } else {
                                serviceValue = getNumericValue(service[valueField]);
                            }

                            details.push({
                                tipoServicio: type,
                                idUsuario: userId,
                                fechaAtencion: service.fechaInicioAtencion ? new Date(service.fechaInicioAtencion).toLocaleDateString() : 'N/A',
                                diagnosticoPrincipal: service.codDiagnosticoPrincipal,
                                valorServicio: serviceValue,
                            });
                        }
                    });
                };
                processServices(user.servicios?.consultas, 'codConsulta', 'Consulta');
                processServices(user.servicios?.procedimientos, 'codProcedimiento', 'Procedimiento');
                processServices(user.servicios?.medicamentos, 'codTecnologiaSalud', 'Medicamento', undefined, 'vrUnitarioMedicamento', 'cantidadMedicamento');
                processServices(user.servicios?.otrosServicios, 'codTecnologiaSalud', 'Otro Servicio', 'vrServicio', undefined, 'cantidadOS');
            });
        });
        setExecutionDetails(details);
        setSelectedCupForDetail(cupInfo as DeviatedCupInfo);
        setIsCupModalOpen(true);
    };


    const handleSelectAll = (checked: boolean) => {
        const newSelections: Record<string, boolean> = {};
        filteredData.forEach(row => {
            newSelections[row.CUPS] = checked;
        });
        setSelectedRows(prev => ({...prev, ...newSelections}));
    };

    const handleSelectRow = (cup: string, checked: boolean) => {
        setSelectedRows(prev => ({ ...prev, [cup]: checked }));
    };
    
    const handleQuantityChange = (cup: string, value: string) => {
        const numericValue = parseInt(value.replace(/[^0-9]+/g,""), 10) || 0;
        const rowData = data.find(r => r.CUPS === cup);
        if (rowData && numericValue > rowData.Cantidad_Ejecutada) {
            // Prevent setting a value higher than executed
            setAdjustedQuantities(prev => ({ ...prev, [cup]: rowData.Cantidad_Ejecutada }));
        } else {
            setAdjustedQuantities(prev => ({ ...prev, [cup]: numericValue }));
        }
    };
    
    const handleSaveComment = (comment: string) => {
      if (currentCupForComment) {
        setComments(prev => ({ ...prev, [currentCupForComment]: comment }));
      }
    };

    const totalEjecutadoBruto = useMemo(() => {
        return data.reduce((sum, row) => sum + row.Valor_Ejecutado, 0);
    }, [data]);
    
    const totalEjecutadoAjustado = useMemo(() => {
      return filteredData.reduce((sum, row) => {
        const validatedQuantity = adjustedQuantities[row.CUPS] ?? row.Cantidad_Ejecutada;
        return sum + validatedQuantity * row.Valor_Unitario;
      }, 0);
    }, [filteredData, adjustedQuantities]);

    const descuentoAplicado = useMemo(() => {
      const totalDiscount = filteredData.reduce((sum, row) => {
        if (selectedRows[row.CUPS]) {
          const validatedQuantity = adjustedQuantities[row.CUPS] ?? row.Cantidad_Ejecutada;
          const recalculatedValorReconocer = validatedQuantity * row.Valor_Unitario;
          const discountValue = row.Valor_Ejecutado - recalculatedValorReconocer;
          return sum + (discountValue > 0 ? discountValue : 0);
        }
        return sum;
      }, 0);
      return totalDiscount;
    }, [filteredData, selectedRows, adjustedQuantities]);

    const valorNetoFinal = useMemo(() => totalEjecutadoAjustado, [totalEjecutadoAjustado]);


    const allSelected = useMemo(() => filteredData.length > 0 && filteredData.every(row => selectedRows[row.CUPS]), [filteredData, selectedRows]);
    
    if (!data || data.length === 0) {
        return null;
    }

    const getRowClass = (classification: string) => {
        switch (classification) {
            case "Sobre-ejecutado": return "text-red-600";
            case "Sub-ejecutado": return "text-blue-600";
            case "Inesperado": return "text-purple-600";
            default: return "";
        }
    };
    
    const generateDownloadData = () => {
        return filteredData.map(r => {
            const validatedQuantity = adjustedQuantities[r.CUPS] ?? r.Cantidad_Ejecutada;
            const recalculatedValorReconocer = validatedQuantity * r.Valor_Unitario;
            const discountValue = r.Valor_Ejecutado - recalculatedValorReconocer;

            return {
                CUPS: r.CUPS,
                Descripcion: r.Descripcion,
                Tipo_Servicio: r.Tipo_Servicio,
                Clasificacion: r.Clasificacion,
                Cantidad_Esperada: r.expectedFrequency,
                Cantidad_Ejecutada: r.Cantidad_Ejecutada,
                Cantidad_Validada: validatedQuantity,
                Valor_Unitario: r.Valor_Unitario,
                Valor_Ejecutado: r.Valor_Ejecutado,
                Valor_a_Reconocer_Ajustado: recalculatedValorReconocer,
                Valor_a_Descontar_Ajustado: discountValue > 0 ? discountValue : 0,
                Seleccionado_Para_Descuento: selectedRows[r.CUPS] || false,
                Comentario_Glosa: comments[r.CUPS] || '',
            }
        });
    };
    
    const renderTable = (tableData: DiscountMatrixRow[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-12 px-2">
                        <Checkbox 
                            checked={allSelected} 
                            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                            aria-label="Seleccionar todo"
                        />
                    </TableHead>
                    <TableHead className="w-28">CUPS</TableHead>
                    <TableHead>Tipo Servicio</TableHead>
                    <TableHead className="max-w-[150px]">Descripción</TableHead>
                    <TableHead className="text-center">Cant. Esperada</TableHead>
                    <TableHead className="text-center">Cant. Ejecutada</TableHead>
                    <TableHead className="text-center w-32">Cant. Validada</TableHead>
                    <TableHead className="text-right">Valor Ejecutado</TableHead>
                    <TableHead className="text-right">Valor a Reconocer</TableHead>
                    <TableHead className="text-right text-red-500 font-bold w-40">Valor a Descontar</TableHead>
                    <TableHead className="w-24 text-center">Glosa</TableHead>

                </TableRow>
            </TableHeader>
            <TableBody>
                {tableData.map((row, index) => {
                    const validatedQuantity = adjustedQuantities[row.CUPS] ?? row.Cantidad_Ejecutada;
                    const recalculatedValorReconocer = validatedQuantity * row.Valor_Unitario;
                    const discountValue = row.Valor_Ejecutado - recalculatedValorReconocer;
                    const finalDiscount = discountValue > 0 ? discountValue : 0;
                    
                    const commentIsRequired = validatedQuantity !== row.Cantidad_Ejecutada;
                    const comment = comments[row.CUPS] || '';
                    const Icon = serviceTypeIcons[row.Tipo_Servicio] || DollarSign;
                    
                    return (
                        <TableRow key={index} className={getRowClass(row.Clasificacion)}>
                            <TableCell className="px-2">
                               <Checkbox 
                                    checked={selectedRows[row.CUPS] || false}
                                    onCheckedChange={(checked) => handleSelectRow(row.CUPS, Boolean(checked))}
                               />
                            </TableCell>
                            <TableCell>
                                <Button variant="link" className="p-0 h-auto font-mono text-sm" onClick={() => handleCupClick(row)}>
                                    {row.CUPS}
                                </Button>
                            </TableCell>
                            <TableCell className="text-xs">
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <span>{row.Tipo_Servicio}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate" title={row.Descripcion}>{row.Descripcion}</TableCell>
                            <TableCell className="text-center">{row.expectedFrequency.toFixed(0)}</TableCell>
                            <TableCell className="text-center">{row.Cantidad_Ejecutada}</TableCell>
                             <TableCell className="text-center">
                                <Input
                                    type="text"
                                    value={new Intl.NumberFormat('es-CO').format(validatedQuantity)}
                                    onChange={(e) => handleQuantityChange(row.CUPS, e.target.value)}
                                    className="h-8 text-center border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(row.Valor_Ejecutado)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(recalculatedValorReconocer)}</TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                                 {formatCurrency(finalDiscount)}
                            </TableCell>
                            <TableCell className="text-center">
                                {commentIsRequired && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => {
                                        setCurrentCupForComment(row.CUPS);
                                        setIsCommentModalOpen(true);
                                      }}
                                    >
                                        <MessageSquarePlus className={cn("h-5 w-5", comment ? "text-blue-500" : "text-muted-foreground")} />
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    );
    
    const serviceTypes: ServiceType[] = ["Consulta", "Procedimiento", "Medicamento", "Otro Servicio"];

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center">
                                <DollarSign className="h-6 w-6 mr-3 text-red-500" />
                                Matriz de Descuentos (Análisis de Valor)
                            </CardTitle>
                            <CardDescription>
                               Análisis financiero interactivo para calcular los descuentos por sobre-ejecución e imprevistos.
                            </CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <Button variant="outline" size="sm" className="h-8">
                                        <Eraser className="mr-2 h-4 w-4" />
                                        Limpiar Ajustes
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción eliminará permanentemente todos los ajustes (cantidades, valores y comentarios) que has realizado en esta matriz. Se perderá el progreso guardado.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClearAdjustments}>Sí, Limpiar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Button onClick={() => handleDownloadXls(generateDownloadData(), 'matriz_descuentos_ajustada.xls')} variant="outline" size="sm" className="h-8">
                                <Download className="mr-2 h-4 w-4" />
                                Descargar XLS
                            </Button>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-right w-full mt-4">
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200">
                            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1"><WalletCards className="h-4 w-4"/> Valor Ejecutado Total</p>
                            <p className="text-lg font-bold text-blue-600">{formatCurrency(totalEjecutadoAjustado)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200">
                            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1"><TrendingDown className="h-4 w-4"/> Descuento Aplicado</p>
                            <p className="text-lg font-bold text-red-500">{formatCurrency(descuentoAplicado)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200">
                            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1"><CheckCircle className="h-4 w-4"/> Valor Neto Final</p>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(valorNetoFinal)}</p>
                        </div>
                    </div>
                     <div className="flex flex-wrap items-center gap-2 pt-4">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Button 
                            variant={serviceTypeFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setServiceTypeFilter('all')}
                        >
                            Todos
                        </Button>
                        {serviceTypes.map(type => (
                             <Button 
                                key={type}
                                variant={serviceTypeFilter === type ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setServiceTypeFilter(type)}
                            >
                                {React.createElement(serviceTypeIcons[type], { className: "mr-2 h-4 w-4"})}
                                {type}s
                            </Button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                        {renderTable(filteredData)}
                    </ScrollArea>
                </CardContent>
            </Card>

            <CupDetailsModal
                cup={selectedCupForDetail}
                open={isCupModalOpen}
                onOpenChange={setIsCupModalOpen}
                executionDetails={executionDetails}
            />

            <CommentModal
              open={isCommentModalOpen}
              onOpenChange={setIsCommentModalOpen}
              initialComment={currentCupForComment ? comments[currentCupForComment] || '' : ''}
              onSave={handleSaveComment}
            />
        </>
    );
};

export default DiscountMatrix;

    

    

    







