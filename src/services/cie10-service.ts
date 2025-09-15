
/**
 * @fileOverview A service to provide descriptions for CIE-10 codes.
 * This acts as a local data source for medical diagnosis codes.
 */

interface Cie10Record {
    Tabla: string;
    Codigo: string;
    Nombre: string;
    Descripcion: string;
    Habilitado: string;
    Aplicacion: string;
    IsStandardGEL: string;
    IsStandardMSPS: string;
    'Extra_I:AplicaASexo': string;
    'Extra_II:EdadMinima': string;
    'Extra_III:EdadMaxima': string;
    'Extra_IV:GrupoMortalidad': string;
    'Extra_V': string;
    'Extra_VI:Capitulo': string;
    'Extra_VII:Grupo': string;
    'Extra_VIII:SubGrupo': string;
    'Extra_IX:Categoria': string;
    'Extra_X:S': string;
}

// Sample data based on the structure provided.
// This should be expanded with more data from the official source.
const cie10Data: Cie10Record[] = [
    {
        "Tabla": "CIE10", "Codigo": "F191", "Nombre": "Trastornos mentales y del comportamiento debidos al uso de múltiples drogas y al uso de otras sustancias psicoactivas: uso nocivo",
        "Descripcion": "Uso de múltiples drogas y de otras sustancias psicoactivas que ha causado daño a la salud. El daño puede ser físico (por ejemplo, hepatitis por inyecciones de sustancias psicoactivas) o mental (por ejemplo, episodios depresivos secundarios al consumo excesivo de alcohol).",
        "Habilitado": "TRUE", "Aplicacion": "S", "IsStandardGEL": "FALSE", "IsStandardMSPS": "FALSE",
        "Extra_I:AplicaASexo": "Ambos", "Extra_II:EdadMinima": "0", "Extra_III:EdadMaxima": "125",
        "Extra_IV:GrupoMortalidad": "No aplica", "Extra_V": "", "Extra_VI:Capitulo": "V", "Extra_VII:Grupo": "F10-F19",
        "Extra_VIII:SubGrupo": "F19", "Extra_IX:Categoria": "F191", "Extra_X:S": ""
    },
    {
        "Tabla": "CIE10", "Codigo": "U071", "Nombre": "COVID-19, virus identificado",
        "Descripcion": "Infección confirmada por el virus SARS-CoV-2 mediante pruebas de laboratorio.",
        "Habilitado": "TRUE", "Aplicacion": "S", "IsStandardGEL": "FALSE", "IsStandardMSPS": "FALSE",
        "Extra_I:AplicaASexo": "Ambos", "Extra_II:EdadMinima": "0", "Extra_III:EdadMaxima": "125",
        "Extra_IV:GrupoMortalidad": "Infecciosas", "Extra_V": "", "Extra_VI:Capitulo": "XXII", "Extra_VII:Grupo": "U00-U49",
        "Extra_VIII:SubGrupo": "U07", "Extra_IX:Categoria": "U071", "Extra_X:S": ""
    },
    {
        "Tabla": "C_A", "Codigo": "J449", "Nombre": "Enfermedad pulmonar obstructiva crónica, no especificada",
        "Descripcion": "Enfermedad pulmonar obstructiva crónica (EPOC) sin mayor especificación.",
        "Habilitado": "TRUE", "Aplicacion": "S", "IsStandardGEL": "FALSE", "IsStandardMSPS": "FALSE",
        "Extra_I:AplicaASexo": "Ambos", "Extra_II:EdadMinima": "0", "Extra_III:EdadMaxima": "125",
        "Extra_IV:GrupoMortalidad": "Respiratorias", "Extra_V": "", "Extra_VI:Capitulo": "X", "Extra_VII:Grupo": "J40-J47",
        "Extra_VIII:SubGrupo": "J44", "Extra_IX:Categoria": "J449", "Extra_X:S": ""
    },
     {
        "Tabla": "C_A", "Codigo": "I10X", "Nombre": "Hipertensión esencial (primaria)",
        "Descripcion": "Presión arterial alta sin causa secundaria conocida.",
        "Habilitado": "TRUE", "Aplicacion": "S", "IsStandardGEL": "FALSE", "IsStandardMSPS": "FALSE",
        "Extra_I:AplicaASexo": "Ambos", "Extra_II:EdadMinima": "0", "Extra_III:EdadMaxima": "125",
        "Extra_IV:GrupoMortalidad": "Circulatorias", "Extra_V": "", "Extra_VI:Capitulo": "IX", "Extra_VII:Grupo": "I10-I15",
        "Extra_VIII:SubGrupo": "I10", "Extra_IX:Categoria": "I10X", "Extra_X:S": ""
    }
];

const cie10Map = new Map<string, string>();
cie10Data.forEach(item => {
    cie10Map.set(item.Codigo.toUpperCase(), item.Nombre);
});

/**
 * Finds the description for a given CIE-10 code from a local data source.
 * @param code The CIE-10 code to look up.
 * @returns A promise that resolves to the description string, or null if not found.
 */
export async function findCie10Description(code: string): Promise<string | null> {
    const upperCode = code.toUpperCase();
    return cie10Map.get(upperCode) || null;
}
