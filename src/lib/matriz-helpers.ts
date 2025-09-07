
import type { ExecutionDataByMonth } from "@/app/page";

// Define los tipos de datos para mayor claridad
interface PgpRow {
  [key: string]: any;
}

export interface MatrizRow {
  Mes: string;
  CUPS: string;
  Cantidad_Esperada: number;
  Cantidad_Ejecutada: number;
  Diferencia: number;
  'percentage_ejecucion': number; // Internal for sorting
  '%_Ejecucion': string;
  Clasificacion: string;
}

interface BuildMatrizArgs {
  executionDataByMonth: ExecutionDataByMonth;
  pgpData: PgpRow[];
}

// Helper para encontrar valores en una fila con nombres de columna flexibles
const findColumnValue = (row: PgpRow, possibleNames: string[]): any => {
  const keys = Object.keys(row);
  for (const name of possibleNames) {
    const key = keys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
    if (key) return row[key];
  }
  return undefined;
};

// Helper para parsear números de forma segura
const getNumericValue = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    let v = String(value).trim();
    if (!v) return 0;

    v = v.replace(/\s+/g, '').replace(/\$/g, '');

    const hasComma = v.includes(',');
    const hasDot = v.includes('.');
    
    if (hasComma && hasDot) {
      const lastComma = v.lastIndexOf(',');
      const lastDot = v.lastIndexOf('.');
      if (lastComma > lastDot) {
        v = v.replace(/\./g, '').replace(',', '.');
      } else {
        v = v.replace(/,/g, '');
      }
    } else if (hasComma && !v.match(/^\d{1,3}(,\d{3})*$/)) {
      v = v.replace(',', '.');
    } else if (hasComma) {
        v = v.replace(/,/g, '');
    }

    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };


/**
 * Construye una matriz comparando la ejecución mensual con los datos esperados de la nota técnica.
 * @param {BuildMatrizArgs} args - Los datos necesarios para construir la matriz.
 * @returns {MatrizRow[]} Un array de objetos que representa la matriz de ejecución.
 */
export function buildMatrizEjecucion({ executionDataByMonth, pgpData }: BuildMatrizArgs): MatrizRow[] {
  const matriz: MatrizRow[] = [];
  
  const pgpCupsMap = new Map<string, PgpRow>();
  pgpData.forEach(row => {
      const cup = findColumnValue(row, ['cup/cum', 'cups']);
      if(cup) pgpCupsMap.set(cup, row);
  });

  const getMonthName = (monthNumber: string) => {
    const date = new Date();
    date.setMonth(parseInt(monthNumber) - 1);
    const name = date.toLocaleString('es-CO', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  executionDataByMonth.forEach((monthData, monthKey) => {
    const monthName = getMonthName(monthKey);
    const allCupsForMonth = new Set([...pgpCupsMap.keys(), ...monthData.cupCounts.keys()]);

    allCupsForMonth.forEach(cup => {
      const pgpRow = pgpCupsMap.get(cup);
      
      // SUPUESTO: La frecuencia esperada se toma de 'frecuencia eventos mes'.
      // Si este campo no existe, se asume 0. No se distribuye un total trimestral.
      const cantidadEsperada = pgpRow ? getNumericValue(findColumnValue(pgpRow, ['frecuencia eventos mes'])) : 0;
      const cantidadEjecutada = monthData.cupCounts.get(cup) || 0;
      
      const diferencia = cantidadEjecutada - cantidadEsperada;
      const percentage = cantidadEsperada > 0 ? (cantidadEjecutada / cantidadEsperada) * 100 : (cantidadEjecutada > 0 ? Infinity : 0);

      let clasificacion = "Ejecución Normal";
      if (!pgpRow && cantidadEjecutada > 0) {
          clasificacion = "Inesperado";
      } else if (cantidadEjecutada === 0 && cantidadEsperada > 0) {
          clasificacion = "Faltante";
      } else if (percentage > 111) {
          clasificacion = "Sobre-ejecutado";
      } else if (percentage < 90 && cantidadEsperada > 0) {
          clasificacion = "Sub-ejecutado";
      }

      matriz.push({
        Mes: monthName,
        CUPS: cup,
        Cantidad_Esperada: cantidadEsperada,
        Cantidad_Ejecutada: cantidadEjecutada,
        Diferencia: diferencia,
        'percentage_ejecucion': percentage,
        '%_Ejecucion': cantidadEsperada > 0 ? `${percentage.toFixed(0)}%` : 'N/A',
        Clasificacion: clasificacion,
      });
    });
  });

  // Ordenar la matriz para mostrar lo más crítico (sobre-ejecutado) primero
  matriz.sort((a, b) => b.percentage_ejecucion - a.percentage_ejecucion);

  return matriz;
}
