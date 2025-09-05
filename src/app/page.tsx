"use client";

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import FileUpload from "@/components/json-analyzer/FileUpload";
import JsonViewer from "@/components/json-analyzer/JsonViewer";

const initialJsonData = {
    "numDocumentoIdObligado": "901226064",
    "numFactura": "7366",
    "tipoNota": null,
    "numNota": null,
    "usuarios": [
        {
            "tipoDocumentoIdentificacion": "CC",
            "numDocumentoIdentificacion": "1122410110",
            "tipoUsuario": "01",
            "fechaNacimiento": "1994-07-11",
            "codSexo": "F",
            "codPaisResidencia": "170",
            "codMunicipioResidencia": "44001",
            "codZonaTerritorialResidencia": "02",
            "incapacidad": "NO",
            "consecutivo": 1,
            "codPaisOrigen": "170",
            "servicios": {
                "consultas": [
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-25 00:00",
                        "numAutorizacion": "null",
                        "codConsulta": "890308",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "01",
                        "codServicio": 344,
                        "finalidadTecnologiaSalud": "44",
                        "causaMotivoAtencion": "38",
                        "codDiagnosticoPrincipal": "X830",
                        "codDiagnosticoRelacionado1": null,
                        "codDiagnosticoRelacionado2": null,
                        "codDiagnosticoRelacionado3": null,
                        "tipoDiagnosticoPrincipal": "01",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1122414387",
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 1
                    },
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-01 00:00",
                        "numAutorizacion": "null",
                        "codConsulta": "890201",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "01",
                        "codServicio": 328,
                        "finalidadTecnologiaSalud": "44",
                        "causaMotivoAtencion": "38",
                        "codDiagnosticoPrincipal": "F322",
                        "codDiagnosticoRelacionado1": null,
                        "codDiagnosticoRelacionado2": null,
                        "codDiagnosticoRelacionado3": null,
                        "tipoDiagnosticoPrincipal": "01",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1120741156",
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 2
                    },
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-01 00:00",
                        "numAutorizacion": "null",
                        "codConsulta": "890206",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "01",
                        "codServicio": 333,
                        "finalidadTecnologiaSalud": "44",
                        "causaMotivoAtencion": "38",
                        "codDiagnosticoPrincipal": "F322",
                        "codDiagnosticoRelacionado1": null,
                        "codDiagnosticoRelacionado2": null,
                        "codDiagnosticoRelacionado3": null,
                        "tipoDiagnosticoPrincipal": "01",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1122809770",
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 3
                    },
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-01 00:00",
                        "numAutorizacion": "null",
                        "codConsulta": "890209",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "01",
                        "codServicio": 356,
                        "finalidadTecnologiaSalud": "44",
                        "causaMotivoAtencion": "38",
                        "codDiagnosticoPrincipal": "F322",
                        "codDiagnosticoRelacionado1": null,
                        "codDiagnosticoRelacionado2": null,
                        "codDiagnosticoRelacionado3": null,
                        "tipoDiagnosticoPrincipal": "01",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1192813878",
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 4
                    }
                ],
                "procedimientos": [
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-01 00:00",
                        "idMIPRES": null,
                        "numAutorizacion": null,
                        "codProcedimiento": "943102",
                        "viaIngresoServicioSalud": "04",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "02",
                        "codServicio": 344,
                        "finalidadTecnologiaSalud": "44",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1122414387",
                        "codDiagnosticoPrincipal": "F322",
                        "codDiagnosticoRelacionado": null,
                        "codComplicacion": null,
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 1
                    },
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-04 00:00",
                        "idMIPRES": null,
                        "numAutorizacion": null,
                        "codProcedimiento": "943102",
                        "viaIngresoServicioSalud": "04",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "02",
                        "codServicio": 344,
                        "finalidadTecnologiaSalud": "44",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1122414387",
                        "codDiagnosticoPrincipal": "F322",
                        "codDiagnosticoRelacionado": null,
                        "codComplicacion": null,
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 2
                    },
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-05 00:00",
                        "idMIPRES": null,
                        "numAutorizacion": null,
                        "codProcedimiento": "943102",
                        "viaIngresoServicioSalud": "04",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "02",
                        "codServicio": 344,
                        "finalidadTecnologiaSalud": "44",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1122414387",
                        "codDiagnosticoPrincipal": "F322",
                        "codDiagnosticoRelacionado": null,
                        "codComplicacion": null,
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 3
                    },
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-06 00:00",
                        "idMIPRES": null,
                        "numAutorizacion": null,
                        "codProcedimiento": "943102",
                        "viaIngresoServicioSalud": "04",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "02",
                        "codServicio": 344,
                        "finalidadTecnologiaSalud": "44",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1122414387",
                        "codDiagnosticoPrincipal": "F322",
                        "codDiagnosticoRelacionado": null,
                        "codComplicacion": null,
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 4
                    },
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-10 00:00",
                        "idMIPRES": null,
                        "numAutorizacion": null,
                        "codProcedimiento": "943102",
                        "viaIngresoServicioSalud": "04",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "02",
                        "codServicio": 344,
                        "finalidadTecnologiaSalud": "44",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1122414387",
                        "codDiagnosticoPrincipal": "F322",
                        "codDiagnosticoRelacionado": null,
                        "codComplicacion": null,
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 5
                    },
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-11 00:00",
                        "idMIPRES": null,
                        "numAutorizacion": null,
                        "codProcedimiento": "943102",
                        "viaIngresoServicioSalud": "04",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "02",
                        "codServicio": 344,
                        "finalidadTecnologiaSalud": "44",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1122414387",
                        "codDiagnosticoPrincipal": "F322",
                        "codDiagnosticoRelacionado": null,
                        "codComplicacion": null,
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 6
                    },
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-12 00:00",
                        "idMIPRES": null,
                        "numAutorizacion": null,
                        "codProcedimiento": "943102",
                        "viaIngresoServicioSalud": "04",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "02",
                        "codServicio": 344,
                        "finalidadTecnologiaSalud": "44",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1122414387",
                        "codDiagnosticoPrincipal": "F322",
                        "codDiagnosticoRelacionado": null,
                        "codComplicacion": null,
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 7
                    },
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-13 00:00",
                        "idMIPRES": null,
                        "numAutorizacion": null,
                        "codProcedimiento": "943102",
                        "viaIngresoServicioSalud": "04",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "02",
                        "codServicio": 344,
                        "finalidadTecnologiaSalud": "44",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1122414387",
                        "codDiagnosticoPrincipal": "F322",
                        "codDiagnosticoRelacionado": null,
                        "codComplicacion": null,
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 8
                    },
                    {
                        "codPrestador": "440010113601",
                        "fechaInicioAtencion": "2025-06-17 00:00",
                        "idMIPRES": null,
                        "numAutorizacion": null,
                        "codProcedimiento": "943102",
                        "viaIngresoServicioSalud": "04",
                        "modalidadGrupoServicioTecSal": "01",
                        "grupoServicios": "02",
                        "codServicio": 344,
                        "finalidadTecnologiaSalud": "44",
                        "tipoDocumentoIdentificacion": "CC",
                        "numDocumentoIdentificacion": "1122414387",
                        "codDiagnosticoPrincipal": "F322",
                        "codDiagnosticoRelacionado": null,
                        "codComplicacion": null,
                        "vrServicio": 0,
                        "conceptoRecaudo": "05",
                        "valorPagoModerador": 0,
                        "numFEVPagoModerador": "null",
                        "consecutivo": 9
                    }
                ]
            }
        }
    ]
};

export default function Home() {
  const [jsonContent, setJsonContent] = useState<string | null>(null);
  const [parsedJson, setParsedJson] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setJsonContent(JSON.stringify(initialJsonData, null, 2));
    setParsedJson(initialJsonData);
  }, []);

  const handleFileLoad = (content: string) => {
    setJsonContent(content);
    setError(null);
    if (content) {
      try {
        const parsed = JSON.parse(content);
        setParsedJson(parsed);
      } catch (e) {
        setError("Invalid JSON file. Please upload a valid JSON file.");
        setParsedJson(null);
      }
    } else {
      setParsedJson(null);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-4xl space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-foreground sm:text-5xl">
            JSON Viewer
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload a JSON file to visualize its structure.
          </p>
        </header>

        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>Upload Your File</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload onFileLoad={handleFileLoad} disabled={isPending} />
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {parsedJson && !error && (
          <Card className="mt-2 shadow-lg">
            <CardHeader>
              <CardTitle>JSON Structure</CardTitle>
            </CardHeader>
            <CardContent className="font-code text-sm max-h-[60vh] overflow-auto">
              <JsonViewer data={parsedJson} />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
