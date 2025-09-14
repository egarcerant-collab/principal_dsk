
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Registra las fuentes necesarias para pdfmake.
// Se realiza una asignación segura para compatibilidad con diferentes entornos de módulos.
if (pdfFonts.pdfMake && pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
}


// --- Interfaces de Datos ---
export interface InformeDatos {
    titulo: string;
    subtitulo: string;
    referencia: string;
    objetivos: string[];
    kpis: { label: string; value: string; }[];
    analisis: { title: string; text: string; }[];
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
function buildDocDefinition(data: InformeDatos, backgroundImageBase64: string) {
    const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 88, 40, 60], // [left, top, right, bottom] - Aumentado el margen superior

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
            p: { fontSize: 10, margin: [0, 0, 0, 5], alignment: 'justify', lineHeight: 1.15 },
            ref: { fontSize: 9, italic: true, margin: [0, 0, 0, 20], color: '#6B7280' },
            kpiLabel: { fontSize: 10, color: '#374151' },
            kpiValue: { fontSize: 10, bold: true, color: '#111827', alignment: 'right' },
            firmaNombre: { fontSize: 10, bold: true, margin: [0, 5, 0, 0] },
            firmaCargo: { fontSize: 9, color: '#6B7280' },
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
            
            { text: 'ANÁLISIS RESUMIDO', style: 'h2' },
            ...data.analisis.flatMap(item => [
                { text: item.title, bold: true, fontSize: 10, margin: [0, 5, 0, 2] },
                { text: item.text, style: 'p' }
            ]),
        ],

        // Pie de página
        footer: (currentPage: number, pageCount: number) => ({
            columns: [
                { text: `${data.ciudad}, ${data.fecha}`, alignment: 'left', style: 'p' },
                { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', style: 'p' }
            ],
            margin: [40, 20, 40, 0]
        }),

        // Secciones finales (firmas) que se intentan mantener juntas
        pageBreakBefore: function (currentNode: any, followingNodesOnPage: any[]) {
            // Si la sección de firmas está por empezar y no cabe, pasa a una nueva página.
            if (currentNode.id === 'firmas_section' && followingNodesOnPage.length < 5) {
                return true;
            }
            return false;
        },
    };

    // Añadir sección de firmas al final del contenido
    docDefinition.content.push({
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
        absolutePosition: { x: 40, y: 678 } // Posición fija para las firmas cerca del final - Ajustada
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
