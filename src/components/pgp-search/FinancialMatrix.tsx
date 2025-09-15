
"use client";

import React from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wallet, Landmark, Calendar, PercentCircle, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from './PgPsearchForm';

export interface MonthlyFinancialSummary {
    month: string;
    totalValorEsperado: number;
    totalValorEjecutado: number;
    percentage: number;
}

interface FinancialMatrixProps {
  monthlyFinancials: MonthlyFinancialSummary[];
}

const FinancialMatrix: React.FC<FinancialMatrixProps> = ({ monthlyFinancials }) => {
    
    if (!monthlyFinancials || monthlyFinancials.length === 0) {
        return null;
    }

    const getPercentageCard = (percentage: number) => {
        let colorClass = "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-200";
        let Icon = PercentCircle;

        if (percentage > 111) {
            colorClass = "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-200";
            Icon = TrendingUp;
        } else if (percentage < 90) {
            colorClass = "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200";
            Icon = TrendingDown;
        }

        return (
            <div className={`p-4 rounded-lg border text-center ${colorClass}`}>
                 <Icon className="h-6 w-6 mx-auto mb-1" />
                <p className="text-sm text-muted-foreground">Ejecución</p>
                <p className="text-2xl font-bold">{percentage.toFixed(1)}%</p>
            </div>
        )
    };

    return (
        <Card>
             <CardHeader>
                <CardTitle>Matriz Detallada: Ejecución vs. Esperado</CardTitle>
                <CardDescription>
                    Análisis detallado de la ejecución por cantidad y valor, mes a mes.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Monthly Summary Cards */}
                <div className="space-y-4">
                    {monthlyFinancials.map(summary => (
                         <div key={summary.month} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/20">
                            <h4 className="text-lg font-semibold mb-3 flex items-center">
                                <Calendar className="h-5 w-5 mr-2 text-muted-foreground"/>
                                {summary.month}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200">
                                    <Landmark className="h-6 w-6 mx-auto text-blue-500 mb-1" />
                                    <p className="text-sm text-muted-foreground">Valor Esperado</p>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(summary.totalValorEsperado)}</p>
                                </div>
                                {getPercentageCard(summary.percentage)}
                                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200">
                                    <Wallet className="h-6 w-6 mx-auto text-green-500 mb-1" />
                                    <p className="text-sm text-muted-foreground">Valor Ejecutado</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(summary.totalValorEjecutado)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default FinancialMatrix;

    