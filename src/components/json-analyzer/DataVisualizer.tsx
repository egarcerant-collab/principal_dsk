
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, Stethoscope, Microscope, Pill, Syringe, Loader2, Search } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import StatCard from "@/components/shared/StatCard";
import { describeCie10, type Cie10Description } from "@/ai/flows/describe-cie10-flow";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';


interface DataVisualizerProps {
  data: any;
}

const Cie10Modal = ({ cie10Info, open, onOpenChange, isLoading }: { cie10Info: Cie10Description | null, open: boolean, onOpenChange: (open: boolean) => void, isLoading: boolean }) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isLoading ? "Buscando diagnóstico..." : `Resultado para: ${cie10Info?.code}`}
          </AlertDialogTitle>
        </AlertDialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <AlertDialogDescription>
            {cie10Info?.description || "No se encontró una descripción para este código."}
          </AlertDialogDescription>
        )}
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>Cerrar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const calculateSummary = (data: any) => {
    if (!data) {
        return {
            numFactura: 'N/A',
            numDocumentoIdObligado: 'N/A',
            numUsuarios: 0,
            numConsultas: 0,
            numProcedimientos: 0,
            totalMedicamentos: 0,
            totalOtrosServicios: 0
        };
    }
    const usuarios = data.usuarios || [];
    const numUsuarios = usuarios.length;
    let numConsultas = 0;
    let numProcedimientos = 0;
    let totalMedicamentos = 0;
    let totalOtrosServicios = 0;

    usuarios.forEach((u: any) => {
        numConsultas += u.servicios?.consultas?.length || 0;
        numProcedimientos += u.servicios?.procedimientos?.length || 0;
        
        if (u.servicios?.medicamentos) {
            totalMedicamentos += u.servicios.medicamentos.reduce((acc: number, med: any) => acc + (Number(med.cantidadMedicamento) || 0), 0);
        }
        if (u.servicios?.otrosServicios) {
             totalOtrosServicios += u.servicios.otrosServicios.reduce((acc: number, os: any) => acc + (Number(os.cantidadOS) || 0), 0);
        }
    });

    return {
        numFactura: data.numFactura || 'N/A',
        numDocumentoIdObligado: data.numDocumentoIdObligado || 'N/A',
        numUsuarios,
        numConsultas,
        numProcedimientos,
        totalMedicamentos,
        totalOtrosServicios,
    }
}

const UserDetails = ({ user }: { user: any }) => {
    return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="font-semibold">ID:</span> {user.tipoDocumentoIdentificacion} {user.numDocumentoIdentificacion}</div>
            <div><span className="font-semibold">Tipo Usuario:</span> {user.tipoUsuario}</div>
            <div><span className="font-semibold">Nacimiento:</span> {user.fechaNacimiento}</div>
            <div><span className="font-semibold">Sexo:</span> {user.codSexo}</div>
            <div><span className="font-semibold">Residencia:</span> {user.codMunicipioResidencia}, {user.codPaisResidencia}</div>
            <div><span className="font-semibold">Zona:</span> {user.codZonaTerritorialResidencia}</div>
            <div><span className="font-semibold">Incapacidad:</span> <Badge variant={user.incapacidad === 'NO' ? 'secondary' : 'destructive'}>{user.incapacidad}</Badge></div>
        </div>
      </CardContent>
    </Card>
    );
};


const ConsultationsTable = ({ consultations, onDiagnosticoClick }: { consultations: any[], onDiagnosticoClick: (code: string) => void }) => {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    return (
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cod. Consulta</TableHead>
                <TableHead>Diagnóstico</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Valor</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {consultations.map((c: any) => (
                <TableRow key={c.consecutivo}>
                <TableCell>{c.consecutivo}</TableCell>
                <TableCell>{isClient ? new Date(c.fechaInicioAtencion).toLocaleDateString() : ''}</TableCell>
                <TableCell>{c.codConsulta}</TableCell>
                <TableCell>{c.codDiagnosticoPrincipal}</TableCell>
                <TableCell>
                    <Button variant="outline" size="sm" onClick={() => onDiagnosticoClick(c.codDiagnosticoPrincipal)}>
                        <Search className="h-4 w-4 mr-2"/>
                        Buscar
                    </Button>
                </TableCell>
                <TableCell>{isClient ? `$${c.vrServicio.toLocaleString()}` : ''}</TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
    )
};

const ProceduresTable = ({ procedures, onDiagnosticoClick }: { procedures: any[], onDiagnosticoClick: (code: string) => void }) => {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);
    return (
        <Table>
        <TableHeader>
            <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cod. Procedimiento</TableHead>
            <TableHead>Diagnóstico</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Valor</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {procedures.map((p: any) => (
            <TableRow key={p.consecutivo}>
                <TableCell>{p.consecutivo}</TableCell>
                <TableCell>{isClient ? new Date(p.fechaInicioAtencion).toLocaleDateString() : ''}</TableCell>
                <TableCell>{p.codProcedimiento}</TableCell>
                <TableCell>{p.codDiagnosticoPrincipal}</TableCell>
                 <TableCell>
                    <Button variant="outline" size="sm" onClick={() => onDiagnosticoClick(p.codDiagnosticoPrincipal)}>
                        <Search className="h-4 w-4 mr-2"/>
                        Buscar
                    </Button>
                </TableCell>
                <TableCell>{isClient ? `$${p.vrServicio.toLocaleString()}`: ''}</TableCell>
            </TableRow>
            ))}
        </TableBody>
        </Table>
    )
};

export default function DataVisualizer({ data }: DataVisualizerProps) {
  const [isClient, setIsClient] = useState(false);
  const [cie10Info, setCie10Info] = useState<Cie10Description | null>(null);
  const [isCie10ModalOpen, setIsCie10ModalOpen] = useState(false);
  const [isCie10Loading, setIsCie10Loading] = useState(false);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const summary = useMemo(() => calculateSummary(data), [data]);
  
  const usuarios = data?.usuarios || [];

  const handleDiagnosticoLookup = async (code: string) => {
    if (!code) return;
    setIsCie10Loading(true);
    setIsCie10ModalOpen(true);
    try {
        const result = await describeCie10(code);
        setCie10Info(result);
    } catch (error) {
        setCie10Info({ code, description: "Error al buscar la descripción." });
        console.error("Error looking up CIE-10:", error);
    } finally {
        setIsCie10Loading(false);
    }
  }

  if (!isClient) {
    return (
        <div className="flex items-center justify-center py-6">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <p>Cargando visualización...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <StatCard title="Factura" value={summary.numFactura} icon={FileText} />
            <StatCard title="Total Usuarios" value={summary.numUsuarios} icon={Users} />
            <StatCard title="Total Consultas" value={summary.numConsultas} icon={Stethoscope} />
            <StatCard title="Total Procedimientos" value={summary.numProcedimientos} icon={Microscope} />
            <StatCard title="Total Medicamentos" value={summary.totalMedicamentos.toLocaleString()} icon={Pill} />
            <StatCard title="Total Otros Servicios" value={summary.totalOtrosServicios.toLocaleString()} icon={Syringe} />
        </div>

        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="full-details">
                <AccordionTrigger>Ver Detalle Completo por Usuario</AccordionTrigger>
                <AccordionContent>
                     <Card>
                        <CardHeader>
                            <CardTitle>Detalle por Usuario</CardTitle>
                             <CardDescription>Análisis individual de cada usuario en el archivo.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                {usuarios.map((user: any) => (
                                    <AccordionItem value={`user-${user.consecutivo}`} key={user.consecutivo}>
                                        <AccordionTrigger>
                                            <div className="flex items-center gap-4">
                                                <span className="font-semibold">Usuario #{user.consecutivo}</span>
                                                <span className="text-muted-foreground">{user.tipoDocumentoIdentificacion} {user.numDocumentoIdentificacion}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="space-y-4">
                                            <UserDetails user={user} />
                                            <Tabs defaultValue="consultations" className="w-full">
                                                <TabsList className="grid w-full grid-cols-2">
                                                    <TabsTrigger value="consultations">
                                                        <Stethoscope className="w-4 h-4 mr-2" />
                                                        Consultas ({user.servicios?.consultas?.length || 0})
                                                    </TabsTrigger>
                                                    <TabsTrigger value="procedures">
                                                        <Microscope className="w-4 h-4 mr-2" />
                                                        Procedimientos ({user.servicios?.procedimientos?.length || 0})
                                                    </TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="consultations">
                                                    {user.servicios?.consultas?.length > 0 ? (
                                                        <ConsultationsTable consultations={user.servicios.consultas} onDiagnosticoClick={handleDiagnosticoLookup} />
                                                    ) : (
                                                        <p className="text-muted-foreground text-center p-4">No hay consultas para este usuario.</p>
                                                    )}
                                                </TabsContent>
                                                <TabsContent value="procedures">
                                                    {user.servicios?.procedimientos?.length > 0 ? (
                                                        <ProceduresTable procedures={user.servicios.procedimientos} onDiagnosticoClick={handleDiagnosticoLookup} />
                                                    ) : (
                                                        <p className="text-muted-foreground text-center p-4">No hay procedimientos para este usuario.</p>
                                                    )}
                                                </TabsContent>
                                            </Tabs>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
        <Cie10Modal 
            cie10Info={cie10Info}
            open={isCie10ModalOpen}
            onOpenChange={setIsCie10ModalOpen}
            isLoading={isCie10Loading}
        />
    </div>
  );
}
