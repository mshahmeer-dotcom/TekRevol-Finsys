import React, { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PageHeader({ title, description, children }: { title: ReactNode, description?: ReactNode, children?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 pt-8 px-8 border-b">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function PageContent({ children }: { children: ReactNode }) {
  return (
    <div className="p-8 space-y-6">
      {children}
    </div>
  );
}
