import Papa, { type ParseResult } from 'papaparse';

export interface PrestadorInfo {
  NIT: string;
  PRESTADOR: string;
  'ID DE ZONA'?: string;
  WEB: string;
  POBLACION?: number;
  [key: string]: any;
}

const normalizeValue = (value: unknown): string => {
    return String(value ?? "").trim();
};

const normalizeKey = (key: string): string => {
    return normalizeValue(key).replace(/\uFEFF/g, ''); // Remove BOM character
}

export const getNumericValue = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    
    // Limpia la cadena de entrada para el formato es-CO: $ 1.234.567,89 -> 1234567.89
    const cleanedString = String(value)
      .replace(/[^0-9,.]/g, '') // 1. Quita todo excepto números, comas y puntos
      .replace(/\./g, '')       // 2. Quita los puntos (separadores de miles)
      .replace(',', '.');      // 3. Reemplaza la coma decimal por un punto
      
    const n = parseFloat(cleanedString);
    return isNaN(n) ? 0 : n;
};

/**
 * Fetches data from a Google Sheet URL and parses it as a CSV.
 * @param url The public URL of the Google Sheet.
 * @returns A promise that resolves to an array of objects representing the rows.
 */
export const fetchSheetData = async <T extends object>(url: string): Promise<T[]> => {
    const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!idMatch) throw new Error("URL de Google Sheets inválida.");
    const sheetId = idMatch[1];
    
    // Improved GID matching to handle various URL formats
    const gidMatch = url.match(/[#&]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    
    const response = await fetch(csvUrl);
    if (!response.ok) {
        throw new Error(`Error obteniendo Google Sheet: ${response.statusText}. Asegúrese de que la hoja de cálculo sea pública ('Publicar en la web').`);
    }
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
        Papa.parse<T>(csvText, {
            header: true,
            skipEmptyLines: 'greedy',
            transformHeader: (header) => normalizeKey(header),
            complete: (results: ParseResult<T>) => {
                if (results.errors.length) {
                    const errorMsg = results.errors.map(e => e.message).join(', ');
                    console.error("Error de parseo Papaparse:", errorMsg);
                    return reject(new Error(`Error parseando CSV: ${errorMsg}`));
                }
                
                 const cleanedData = results.data.map(row => {
                    const cleanedRow: { [key: string]: any } = {};
                    for (const key in row) {
                        if (Object.prototype.hasOwnProperty.call(row, key)) {
                            const trimmedKey = normalizeKey(key);
                            if (trimmedKey) {
                                cleanedRow[trimmedKey] = (row as any)[key];
                            }
                        }
                    }
                    return cleanedRow as T;
                }).filter(row => Object.values(row).some(val => normalizeValue(val) !== '')); // Filter out completely empty rows
                
                resolve(cleanedData);
            },
            error: (error: Error) => {
                console.error("Error en Papaparse:", error.message);
                reject(new Error(`Error parseando CSV: ${error.message}`))
            }
        });
    });
};

    
    
