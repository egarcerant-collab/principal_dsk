"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalysisResultsProps {
  summaries: Record<string, string> | null;
  isLoading: boolean;
}

export default function AnalysisResults({ summaries, isLoading }: AnalysisResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 mt-2">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summaries) {
    return (
      <Card className="mt-2 text-center shadow-lg">
        <CardContent className="p-8">
          <p className="text-muted-foreground">
            Click the "Analyze with AI" button to generate summaries for the top-level fields of your JSON file.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-2">
      {Object.entries(summaries).map(([field, summary]) => (
        <Card key={field} className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-code text-accent">{field}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{summary}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
