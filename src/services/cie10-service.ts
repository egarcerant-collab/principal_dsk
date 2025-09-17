
/**
 * @fileOverview A service to provide descriptions for CIE-10 codes.
 * This acts as a local data source for medical diagnosis codes, loading from a Google Sheet.
 */

import { fetchSheetData } from '@/lib/sheets';

interface Cie10Record {
    Tabla: string;
    Codigo: string;
    Nombre: string;
    // ... other fields from your sheet
    [key: string]: any;
}

// URL de la hoja de cálculo que contiene la tabla de referencia CIE-10
const CIE10_SHEET_URL = "https://docs.google.com/spreadsheets/d/1B51GDvQj8-22dMUP39eY3Q02O0_sW2_b2-g0G-a3yR4/edit?gid=1853245468";

// Usamos un patrón de "carga perezosa" para el mapa de CIE-10.
// No se cargará hasta que se necesite por primera vez.
let cie10Map: Map<string, string> | null = null;
let dataLoadingPromise: Promise<void> | null = null;

/**
 * Fetches data from the Google Sheet and populates the cie10Map.
 * This function will only execute the fetch once.
 */
async function ensureCie10DataIsLoaded(): Promise<void> {
    if (cie10Map) {
        // Los datos ya están cargados.
        return;
    }

    if (dataLoadingPromise) {
        // Los datos se están cargando, espera a que termine.
        return dataLoadingPromise;
    }

    // Inicia la carga de datos.
    dataLoadingPromise = (async () => {
        try {
            console.log("Fetching CIE-10 data from Google Sheet...");
            const data = await fetchSheetData<Cie10Record>(CIE10_SHEET_URL);
            
            const tempMap = new Map<string, string>();
            data.forEach(item => {
                if (item.Codigo && item.Nombre) {
                    tempMap.set(String(item.Codigo).toUpperCase(), String(item.Nombre));
                }
            });

            cie10Map = tempMap;
            console.log(`CIE-10 data loaded successfully. ${cie10Map.size} records found.`);
        } catch (error) {
            console.error("Failed to load CIE-10 data:", error);
            // Si la carga falla, reseteamos para poder intentarlo de nuevo más tarde.
            cie10Map = new Map(); // Creamos un mapa vacío para evitar reintentos constantes en caso de fallo.
        } finally {
            // Una vez terminado (con éxito o error), reseteamos la promesa.
            dataLoadingPromise = null;
        }
    })();

    return dataLoadingPromise;
}


/**
 * Finds the description for a given CIE-10 code from the local data source.
 * @param code The CIE-10 code to look up.
 * @returns A promise that resolves to the description string, or null if not found.
 */
export async function findCie10Description(code: string): Promise<string | null> {
    // Asegurarse de que los datos están cargados antes de buscar.
    await ensureCie10DataIsLoaded();

    if (!cie10Map) {
        // Esto no debería suceder si ensureCie10DataIsLoaded funciona correctamente.
        throw new Error("El mapa de datos CIE-10 no está inicializado.");
    }
    
    const upperCode = String(code).toUpperCase();
    return cie10Map.get(upperCode) || null;
}
