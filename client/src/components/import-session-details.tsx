import { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  Alert, AlertDescription, AlertTitle 
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

interface ImportSession {
  timestamp: Date;
  totalProcessed: number;
  newRecords: number;
  updatedRecords: number;
  errorCount: number;
  errors: ValidationError[];
  hasMoreErrors?: boolean;
}

export default function ImportSessionDetails() {
  const [importSession, setImportSession] = useState<ImportSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImportSession = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/customers/import/last-session');
        const data = await response.json();
        
        if (data.success) {
          // Convert timestamp string to Date object
          const session = {
            ...data.importSession,
            timestamp: new Date(data.importSession.timestamp)
          };
          setImportSession(session);
          setError(null);
        } else {
          setError(data.error || 'Failed to load import session details');
          setImportSession(null);
        }
      } catch (err) {
        setError('Error fetching import session data');
        setImportSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchImportSession();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Session Data</CardTitle>
          <CardDescription>Loading latest import session details...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 animate-spin text-muted-foreground" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Session Data</CardTitle>
          <CardDescription>Detailed information about CSV imports</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!importSession) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Session Data</CardTitle>
          <CardDescription>No import sessions available</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Data Available</AlertTitle>
            <AlertDescription>
              There are no CSV import sessions recorded. Try importing a customer CSV file first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Group errors by type for better visualization
  const errorsByField: Record<string, ValidationError[]> = {};
  importSession.errors.forEach(err => {
    if (!errorsByField[err.field]) {
      errorsByField[err.field] = [];
    }
    errorsByField[err.field].push(err);
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Session Details</CardTitle>
        <CardDescription>
          Last import session from {importSession.timestamp.toLocaleString()}
          {' '}({formatDistanceToNow(importSession.timestamp, { addSuffix: true })})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-background rounded-lg p-4 border">
            <div className="text-sm text-muted-foreground">Total Records</div>
            <div className="text-2xl font-bold">{importSession.totalProcessed}</div>
          </div>
          <div className="bg-background rounded-lg p-4 border">
            <div className="text-sm text-muted-foreground">New Records</div>
            <div className="text-2xl font-bold text-green-600">{importSession.newRecords}</div>
          </div>
          <div className="bg-background rounded-lg p-4 border">
            <div className="text-sm text-muted-foreground">Updated Records</div>
            <div className="text-2xl font-bold text-blue-600">{importSession.updatedRecords}</div>
          </div>
          <div className="bg-background rounded-lg p-4 border">
            <div className="text-sm text-muted-foreground">Validation Errors</div>
            <div className="text-2xl font-bold text-red-600">{importSession.errorCount}</div>
          </div>
        </div>

        <div className="bg-background rounded-lg p-4 border mb-6">
          <h3 className="text-lg font-medium mb-2">Import Summary</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="bg-green-50">
              <CheckCircle className="h-3 w-3 mr-1 text-green-600" /> 
              {importSession.newRecords} Added
            </Badge>
            <Badge variant="outline" className="bg-blue-50">
              <CheckCircle className="h-3 w-3 mr-1 text-blue-600" /> 
              {importSession.updatedRecords} Updated
            </Badge>
            <Badge variant="outline" className="bg-red-50">
              <XCircle className="h-3 w-3 mr-1 text-red-600" /> 
              {importSession.errorCount} Errors
            </Badge>
            <Badge variant="outline" className="bg-yellow-50">
              <AlertCircle className="h-3 w-3 mr-1 text-yellow-600" /> 
              {importSession.totalProcessed - importSession.newRecords - importSession.updatedRecords} Skipped
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Out of {importSession.totalProcessed} total records processed, {importSession.newRecords} new customers were added 
            and {importSession.updatedRecords} existing customers were updated. {importSession.errorCount} records had validation errors 
            and {importSession.totalProcessed - importSession.newRecords - importSession.updatedRecords - importSession.errorCount} were skipped.
          </p>
        </div>

        {importSession.errorCount > 0 && (
          <div className="bg-background rounded-lg p-4 border">
            <h3 className="text-lg font-medium mb-4">Validation Error Details</h3>
            
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import Validation Issues</AlertTitle>
              <AlertDescription>
                {importSession.errorCount} validation errors were found during import.
                {importSession.hasMoreErrors && ' Only the first 100 errors are shown below.'}
              </AlertDescription>
            </Alert>

            <Accordion type="single" collapsible className="w-full">
              {Object.entries(errorsByField).map(([field, errors]) => (
                <AccordionItem key={field} value={field}>
                  <AccordionTrigger className="px-4">
                    <div className="flex items-center">
                      <span className="font-medium">{field}</span>
                      <Badge variant="outline" className="ml-2 bg-red-50">
                        {errors.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <Table>
                      <TableCaption>Field: {field}</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Error Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errors.map((err, index) => (
                          <TableRow key={index}>
                            <TableCell>{err.row}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {err.value || '<empty>'}
                            </TableCell>
                            <TableCell>{err.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}