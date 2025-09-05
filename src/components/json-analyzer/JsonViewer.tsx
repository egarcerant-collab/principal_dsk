"use client";

import { useState } from 'react';
import { ChevronRight, Braces, Bracket } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface JsonNodeProps {
  nodeKey: string;
  value: any;
  level: number;
  isLast: boolean;
}

function JsonValue({ value }: { value: any }) {
  const type = typeof value;

  if (value === null) {
    return <span className="text-muted-foreground">null</span>;
  }
  
  switch (type) {
    case 'string':
      return <span className="text-green-600 dark:text-green-400">"{value}"</span>;
    case 'number':
      return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
    case 'boolean':
      return <span className="text-purple-600 dark:text-purple-400">{String(value)}</span>;
    default:
      return null;
  }
}

function JsonNode({ nodeKey, value, level, isLast }: JsonNodeProps) {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-expand first 2 levels

  const isObject = typeof value === 'object' && value !== null;
  const isArray = Array.isArray(value);

  if (!isObject) {
    return (
      <div style={{ marginLeft: `${level * 1.5}rem` }}>
        <span className="text-accent">{nodeKey}:</span>{' '}
        <JsonValue value={value} />
        {!isLast && ','}
      </div>
    );
  }

  const entries = Object.entries(value);
  const closingBracket = isArray ? ']' : '}';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} style={{ marginLeft: `${level * 1.5}rem` }}>
      <CollapsibleTrigger className="flex w-full items-center text-left hover:bg-muted/50 rounded-sm p-1">
        <ChevronRight
          className={cn('h-4 w-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-90')}
        />
        <span className="ml-1 text-accent">{nodeKey}:</span>
        <span className="ml-2">{isArray ? '[' : '{'}</span>
        {!isOpen && (
          <>
            <span className="ml-1 text-muted-foreground truncate">
              {entries.length > 0 ? '...' : ''}
            </span>
            <span>{closingBracket}{!isLast && ','}</span>
          </>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {entries.map(([key, childValue], index) => (
          <JsonNode
            key={key}
            nodeKey={key}
            value={childValue}
            level={level + 1}
            isLast={index === entries.length - 1}
          />
        ))}
        <div style={{ marginLeft: `${level * 1.5}rem` }}>
          {closingBracket}{!isLast && ','}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface JsonViewerProps {
  data: any;
}

export default function JsonViewer({ data }: JsonViewerProps) {
  if (typeof data !== 'object' || data === null) {
    return (
      <pre className="p-4 bg-muted rounded-md overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return (
    <div>
      <span>{'{'}</span>
      {Object.entries(data).map(([key, value], index, arr) => (
        <JsonNode
          key={key}
          nodeKey={key}
          value={value}
          level={1}
          isLast={index === arr.length - 1}
        />
      ))}
      <span>{'}'}</span>
    </div>
  );
}
