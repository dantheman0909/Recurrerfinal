import { useEffect } from 'react';
import { 
  PageHeader,
  PageHeaderDescription,
  PageHeaderHeading,
} from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { FileSpreadsheet, ArrowLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import ImportSessionDetails from '@/components/import-session-details';

export default function ImportDiagnostics() {
  useEffect(() => {
    document.title = 'Import Diagnostics | Recurrer';
  }, []);

  return (
    <div className="flex flex-col w-full min-h-screen">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" asChild>
              <Link to="/customers">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <PageHeader>
              <PageHeaderHeading>Import Diagnostics</PageHeaderHeading>
              <PageHeaderDescription>
                Debug customer data import issues and discrepancies
              </PageHeaderDescription>
            </PageHeader>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <Link to="/customers/import">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import New Data
              </Link>
            </Button>
          </div>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Import Validation Information</AlertTitle>
          <AlertDescription>
            The import process enforces strict validation on required fields (name, contact_email, contact_phone, chargebee_customer_id, chargebee_subscription_id).
            Records missing these fields are rejected and not added to the database, which explains the discrepancy between total source records and imported records.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="last-session" className="space-y-4">
          <TabsList>
            <TabsTrigger value="last-session">Last Import Session</TabsTrigger>
            <TabsTrigger value="requirements">Import Requirements</TabsTrigger>
          </TabsList>
          
          <TabsContent value="last-session" className="space-y-4">
            <ImportSessionDetails />
            
            <div className="flex justify-end mt-6">
              <Button variant="outline" asChild>
                <Link to="/customers">
                  Back to Customers
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="requirements" className="space-y-4">
            <div className="grid gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">Required Fields</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The following fields must be present and valid in your CSV file for each record to be imported successfully:
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded p-3">
                      <div className="font-medium">name</div>
                      <div className="text-sm text-muted-foreground">Company or customer name</div>
                    </div>
                    <div className="border rounded p-3">
                      <div className="font-medium">contact_email</div>
                      <div className="text-sm text-muted-foreground">Primary contact email address</div>
                    </div>
                    <div className="border rounded p-3">
                      <div className="font-medium">contact_phone</div>
                      <div className="text-sm text-muted-foreground">Primary contact phone number</div>
                    </div>
                    <div className="border rounded p-3">
                      <div className="font-medium">chargebee_customer_id</div>
                      <div className="text-sm text-muted-foreground">Chargebee customer identifier</div>
                    </div>
                    <div className="border rounded p-3">
                      <div className="font-medium">chargebee_subscription_id</div>
                      <div className="text-sm text-muted-foreground">Chargebee subscription identifier</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">Auto-generated Fields</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The following fields will be automatically generated if missing:
                </p>
                <div className="border rounded p-3">
                  <div className="font-medium">recurrer_id</div>
                  <div className="text-sm text-muted-foreground">
                    Unique identifier for the customer in Recurrer (automatically generated if missing)
                  </div>
                </div>
              </div>
              
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Common Import Issues</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-2 space-y-1">
                    <li>Missing required fields in some records</li>
                    <li>Invalid data formats (e.g., improperly formatted email addresses)</li>
                    <li>Mismatched column headers (ensure they match the expected field names)</li>
                    <li>Empty or null values in required fields</li>
                    <li>Duplicate recurrer_id values (when not using auto-generation)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button variant="outline" asChild>
                <Link to="/customers/import">
                  Go to Import Page
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}