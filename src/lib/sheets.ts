
import Papa, { type ParseResult } from 'papaparse';

export interface PrestadorInfo {
  NIT: string;
  PRESTADOR: string;
  'ID DE ZONA'?: string;
  WEB: string;
  [key: string]: any;
}


/**
 * Fetches data from a Google Sheet URL and parses it as a CSV.
 * @param url The public URL of the Google Sheet.
 * @returns A promise that resolves to an array of objects representing the rows.
 */
export const fetchSheetData = async <T extends object>(url: string): Promise<T[]> => {
    const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!idMatch) throw new Error("URL de Google Sheets inválida.");
    const sheetId = idMatch[1];
    const gidMatch = url.match(/gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`Error obteniendo Google Sheet: ${response.statusText}`);
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
        Papa.parse<T>(csvText, {
            header: true,
            skipEmptyLines: 'greedy',
            transformHeader: (header) => header.trim().replace(/\uFEFF/g, ''),
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
                            const trimmedKey = key.trim().replace(/\uFEFF/g, '');
                            if (trimmedKey) {
                                cleanedRow[trimmedKey] = (row as any)[key];
                            }
                        }
                    }
                    return cleanedRow as T;
                });
                resolve(cleanedData);
            },
            error: (error: Error) => {
                console.error("Error en Papaparse:", error.message);
                reject(new Error(`Error parseando CSV: ${error.message}`))
            }
        });
    });
};
