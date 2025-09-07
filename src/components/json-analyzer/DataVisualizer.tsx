
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, Stethoscope, Microscope, Pill, Syringe, Loader2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

interface DataVisualizerProps {
  data: any;
}

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

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
);

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


const ConsultationsTable = ({ consultations }: { consultations: any[] }) => {
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
                <TableCell>{isClient ? `$${c.vrServicio.toLocaleString()}` : ''}</TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
    )
};

const ProceduresTable = ({ procedures }: { procedures: any[] }) => {
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
                <TableCell>{isClient ? `$${p.vrServicio.toLocaleString()}`: ''}</TableCell>
            </TableRow>
            ))}
        </TableBody>
        </Table>
    )
};

export default function DataVisualizer({ data }: DataVisualizerProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const summary = useMemo(() => calculateSummary(data), [data]);
  
  const usuarios = data?.usuarios || [];

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
                                                        <ConsultationsTable consultations={user.servicios.consultas} />
                                                    ) : (
                                                        <p className="text-muted-foreground text-center p-4">No hay consultas para este usuario.</p>
                                                    )}
                                                </TabsContent>
                                                <TabsContent value="procedures">
                                                    {user.servicios?.procedimientos?.length > 0 ? (
                                                        <ProceduresTable procedures={user.servicios.procedimientos} />
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
    </div>
  );
}
