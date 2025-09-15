
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { Content, StyleDictionary, TDocumentDefinitions } from 'pdfmake/interfaces';

// Registra las fuentes necesarias para pdfmake.
// Se realiza una asignación segura para compatibilidad con diferentes entornos de módulos.
if (pdfFonts.pdfMake && pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
}


// --- Interfaces de Datos ---
export interface DeviatedCupInfo {
    cup: string;
    description?: string;
    activityDescription?: string;
    expectedFrequency: number;
    realFrequency: number;
    deviation: number;
}
export interface InformeDatos {
    titulo: string;
    subtitulo: string;
    referencia: string;
    objetivos: string[];
    kpis: { label: string; value: string; }[];
    analisis: { 
        title: string; 
        text: string;
        chartImage?: string; // Para la imagen del gráfico en base64
    }[];
    topOverExecuted: DeviatedCupInfo[];
    topUnexpected: { cup: string, realFrequency: number, description?: string }[];
    ciudad: string;
    fecha: string;
    firmas: { nombre: string; cargo: string; }[];
}

/**
 * Construye la definición del documento para pdfmake.
 * @param data Los datos formateados para el informe.
 * @param backgroundImageBase64 La imagen de fondo en formato base64.
 * @returns El objeto de definición del documento para pdfmake.
 */
function buildDocDefinition(data: InformeDatos, backgroundImageBase64: string): TDocumentDefinitions {
    const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [58, 110, 40, 70], // [left, top, right, bottom] - Ajustado

        // Imagen de fondo que se repite en cada página
        background: function (currentPage: number) {
            if (!backgroundImageBase64) return null;
            return {
                image: backgroundImageBase64,
                width: 595, // Ancho de A4 en puntos
                height: 842, // Alto de A4 en puntos
                absolutePosition: { x: 0, y: 0 }
            };
        },

        // Estilos de texto
        styles: {
            h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 10], color: '#1E3A8A' },
            h2: { fontSize: 12, bold: true, margin: [0, 15, 0, 5], color: '#1E3A8A' },
            p: { fontSize: 10, margin: [0, 0, 0, 8], alignment: 'justify', lineHeight: 1.25 },
            ref: { fontSize: 9, italic: true, margin: [0, 0, 0, 20], color: '#6B7280' },
            kpiLabel: { fontSize: 10, color: '#374151' },
            kpiValue: { fontSize: 10, bold: true, color: '#111827', alignment: 'right' },
            firmaNombre: { fontSize: 10, bold: true, margin: [0, 5, 0, 0] },
            firmaCargo: { fontSize: 9, color: '#6B7280' },
            tableHeader: { bold: true, fontSize: 9, color: 'black', fillColor: '#E5E7EB', margin: [0, 5, 0, 5] },
            tableCell: { fontSize: 8, margin: [0, 5, 0, 5] },
        },

        // Contenido del documento
        content: [
            { text: data.titulo, style: 'h1', alignment: 'center' },
            { text: data.subtitulo, style: 'p', alignment: 'center' },
            { text: data.referencia, style: 'ref', alignment: 'center' },

            { text: 'OBJETIVOS', style: 'h2' },
            { ul: data.objetivos.map(o => ({ text: o, style: 'p' })) },

            { text: 'INDICADORES CLAVE (KPIs)', style: 'h2' },
            {
                table: {
                    widths: ['*', 'auto'],
                    body: data.kpis.map(kpi => [
                        { text: kpi.label, style: 'kpiLabel', border: [false, false, false, true], borderColor: ['#E5E7EB', '#E5E7EB', '#E5E7EB', '#E5E7EB'] },
                        { text: kpi.value, style: 'kpiValue', border: [false, false, false, true], borderColor: ['#E5E7EB', '#E5E7EB', '#E5E7EB', '#E5E7EB'] }
                    ])
                },
                layout: 'noBorders'
            },
            
            ...data.analisis.flatMap((item): Content[] => {
                const contentBlock: Content[] = [];
                 contentBlock.push({ text: item.title, style: 'h2' });
                
                if (item.chartImage) {
                    contentBlock.push({
                        image: item.chartImage,
                        width: 480,
                        alignment: 'center',
                        margin: [0, 5, 0, 10],
                    });
                }
                if (item.text) {
                    contentBlock.push({ text: item.text, style: 'p' });
                }
                return contentBlock;
            }),
        ],

        // Pie de página
        footer: (currentPage: number, pageCount: number) => ({
            columns: [
                { text: `${data.ciudad}, ${data.fecha}`, alignment: 'left', style: 'p' },
                { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', style: 'p' }
            ],
            margin: [58, 20, 40, 0]
        }),
    };
    
    // TABLA DE SOBRE-EJECUTADOS
    if (data.topOverExecuted && data.topOverExecuted.length > 0) {
        (docDefinition.content as Content[]).push({
            text: 'Top 5 CUPS Sobre-ejecutados',
            style: 'h2',
            margin: [0, 15, 0, 5],
        });
        (docDefinition.content as Content[]).push({
            table: {
                headerRows: 1,
                widths: ['auto', '*', 'auto', 'auto', 'auto'],
                body: [
                    [
                        { text: 'CUPS', style: 'tableHeader' },
                        { text: 'Descripción', style: 'tableHeader' },
                        { text: 'Frec. Esperada', style: 'tableHeader', alignment: 'center' },
                        { text: 'Frec. Real', style: 'tableHeader', alignment: 'center' },
                        { text: 'Desviación', style: 'tableHeader', alignment: 'center' },
                    ],
                    ...data.topOverExecuted.map(c => [
                        { text: c.cup, style: 'tableCell' },
                        { text: c.description || 'N/A', style: 'tableCell' },
                        { text: c.expectedFrequency.toFixed(0), style: 'tableCell', alignment: 'center' },
                        { text: c.realFrequency, style: 'tableCell', alignment: 'center' },
                        { text: c.deviation.toFixed(0), style: 'tableCell', alignment: 'center', bold: true, color: 'red' },
                    ]),
                ]
            },
            layout: 'lightHorizontalLines'
        });
    }

    // TABLA DE INESPERADOS
    if (data.topUnexpected && data.topUnexpected.length > 0) {
        (docDefinition.content as Content[]).push({
            text: 'Top 5 CUPS Inesperados',
            style: 'h2',
            margin: [0, 15, 0, 5],
        });
        (docDefinition.content as Content[]).push({
            table: {
                headerRows: 1,
                widths: ['auto', '*', 'auto'],
                body: [
                     [
                        { text: 'CUPS', style: 'tableHeader' },
                        { text: 'Descripción', style: 'tableHeader' },
                        { text: 'Frecuencia Real', style: 'tableHeader', alignment: 'center' },
                    ],
                    ...data.topUnexpected.map(c => [
                        { text: c.cup, style: 'tableCell' },
                        { text: c.description || 'N/A', style: 'tableCell' },
                        { text: c.realFrequency, style: 'tableCell', alignment: 'center', bold: true },
                    ]),
                ]
            },
            layout: 'lightHorizontalLines'
        });
    }


    // Añadir sección de firmas al final del contenido
    (docDefinition.content as Content[]).push({
        id: 'firmas_section',
        stack: [
            { text: 'FIRMAS', style: 'h2', margin: [0, 50, 0, 20] },
            {
                columns: data.firmas.map(firma => ({
                    stack: [
                        { text: '___________________________', alignment: 'center' },
                        { text: firma.nombre, style: 'firmaNombre', alignment: 'center' },
                        { text: firma.cargo, style: 'firmaCargo', alignment: 'center' },
                    ],
                    width: '*',
                })),
                columnGap: 20
            }
        ],
        // Evita que la sección de firmas se separe entre páginas
        unbreakable: true,
    });


    return docDefinition;
}

const configurePdfMake = () => {
     pdfMake.fonts = {
        Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-MediumItalic.ttf'
        }
    };
}

/**
 * Genera y descarga el informe en PDF.
 * @param data Los datos formateados para el informe.
 * @param backgroundImageBase64 La imagen de fondo en formato base64.
 */
export async function descargarInformePDF(data: InformeDatos, backgroundImageBase64: string): Promise<void> {
    configurePdfMake();
    const docDefinition = buildDocDefinition(data, backgroundImageBase64);
    pdfMake.createPdf(docDefinition).download(`Informe_PGP_${data.referencia.split('|')[0].trim().replace(/\s/g, '_')}.pdf`);
}

/**
 * Genera una URL de datos para el informe en PDF para previsualización.
 * @param data Los datos formateados para el informe.
 * @param backgroundImageBase64 La imagen de fondo en formato base64.
 * @returns Una promesa que se resuelve con la URL de datos del PDF.
 */
export async function generarURLInformePDF(data: InformeDatos, backgroundImageBase64: string): Promise<string> {
    configurePdfMake();
    const docDefinition = buildDocDefinition(data, backgroundImageBase64);
    return new Promise((resolve, reject) => {
        pdfMake.createPdf(docDefinition).getDataUrl((dataUrl: string) => {
            resolve(dataUrl);
        }, (error: any) => {
            reject(error);
        });
    });
}
