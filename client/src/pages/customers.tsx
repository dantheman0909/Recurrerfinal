import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent,
} from "@/components/ui/card";
import { 
  Building, 
  ArrowUpRight, 
  Search,
  Filter,
  UserPlus,
  Users,
  LayoutGrid,
  LayoutList,
  Loader2,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatINR } from "@/lib/utils";
import { Customer } from "@shared/schema";
import { Link, useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [healthFilter, setHealthFilter] = useState<string | null>(null);
  const [csmFilter, setCsmFilter] = useState<number | null>(null);
  const [tlFilter, setTlFilter] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const ITEMS_PER_PAGE = 50;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['/api/customers'],
  });
  
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
  });
  
  const isLoading = customersLoading || usersLoading;
  
  // Mutation for deleting a customer
  const deleteCustomerMutation = useMutation({
    mutationFn: (customerId: number) => {
      return apiRequest('DELETE', `/api/customers/${customerId}`);
    },
    onSuccess: () => {
      toast({
        title: "Customer deleted",
        description: `${customerToDelete?.name} has been deleted successfully.`,
      });
      // Invalidate the customers query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setCustomerToDelete(null);
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting customer:", error);
    }
  });
  
  // Function to handle delete confirmation
  const handleDeleteConfirm = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id);
    }
  };
  
  // Function to open delete dialog
  const openDeleteDialog = (customer: Customer, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Opening delete dialog for customer:", customer.id);
    setCustomerToDelete(customer);
    setShowDeleteDialog(true);
  };
  
  // Filter CSMs (role === 'csm')
  const csms = users && Array.isArray(users) ? users.filter(user => user.role === 'csm') : [];
  
  // Filter Team Leads (role === 'team_lead')
  const teamLeads = users && Array.isArray(users) ? users.filter(user => user.role === 'team_lead') : [];
  
  // Function to sort customers
  const sortCustomers = (a: Customer, b: Customer) => {
    // Handle null values by treating them as the lowest possible value when sorting ascending
    // and highest possible value when sorting descending
    const handleNullValues = (aVal: any, bVal: any) => {
      if (aVal === null || aVal === undefined) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (bVal === null || bVal === undefined) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0; // Both values are not null
    };

    let comparison = 0;
    switch (sortField) {
      case 'renewal_date':
        const aRenewal = a.renewal_date ? new Date(a.renewal_date).getTime() : null;
        const bRenewal = b.renewal_date ? new Date(b.renewal_date).getTime() : null;
        
        const nullCheck = handleNullValues(aRenewal, bRenewal);
        if (nullCheck !== 0) return nullCheck;
        
        comparison = aRenewal! < bRenewal! ? -1 : 1;
        break;
        
      case 'onboarded_at':
        const aOnboarding = a.onboarded_at ? new Date(a.onboarded_at).getTime() : null;
        const bOnboarding = b.onboarded_at ? new Date(b.onboarded_at).getTime() : null;
        
        const onboardingNullCheck = handleNullValues(aOnboarding, bOnboarding);
        if (onboardingNullCheck !== 0) return onboardingNullCheck;
        
        comparison = aOnboarding! < bOnboarding! ? -1 : 1;
        break;
        
      case 'active_stores_asc':
        const aStores = a.active_stores ?? 0;
        const bStores = b.active_stores ?? 0;
        comparison = aStores < bStores ? -1 : 1;
        return comparison; // Return directly as we don't need to reverse for desc
        
      case 'active_stores_desc':
        const aStoresDesc = a.active_stores ?? 0;
        const bStoresDesc = b.active_stores ?? 0;
        comparison = aStoresDesc > bStoresDesc ? -1 : 1;
        return comparison; // Return directly as we don't need to reverse for desc
        
      case 'arr_asc':
        const aArr = a.arr ?? 0;
        const bArr = b.arr ?? 0;
        comparison = aArr < bArr ? -1 : 1;
        return comparison; // Return directly as we don't need to reverse for desc
        
      case 'arr_desc':
        const aArrDesc = a.arr ?? 0;
        const bArrDesc = b.arr ?? 0;
        comparison = aArrDesc > bArrDesc ? -1 : 1;
        return comparison; // Return directly as we don't need to reverse for desc
        
      default: // name
        comparison = a.name.localeCompare(b.name);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  };

  // Filter customers based on search and filter criteria
  const filteredCustomers = customers?.filter((customer: Customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (customer.contact_name && customer.contact_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesHealth = !healthFilter || customer.health_status === healthFilter;
    
    const matchesCSM = !csmFilter || customer.assigned_csm === csmFilter;
    
    // For Team Lead filter, we need to check if the customer's assigned CSM 
    // reports to the selected Team Lead
    const matchesTL = !tlFilter || 
                      (customer.assigned_csm && 
                       csms.find(csm => csm.id === customer.assigned_csm)?.team_lead_id === tlFilter);
    
    return matchesSearch && matchesHealth && matchesCSM && matchesTL;
  }).sort(sortCustomers);
  
  // Calculate pagination
  const totalCustomers = filteredCustomers?.length || 0;
  const totalPages = Math.ceil(totalCustomers / ITEMS_PER_PAGE);
  
  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  
  // Get current page items
  const currentCustomers = filteredCustomers?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  // Functions for pagination navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const getHealthBadgeStyles = (health: string) => {
    switch (health) {
      case 'healthy':
        return "bg-green-100 text-green-800";
      case 'at_risk':
        return "bg-yellow-100 text-yellow-800";
      case 'red_zone':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const getHealthFilterStyles = (filter: string | null) => {
    if (healthFilter === filter) {
      switch (filter) {
        case 'healthy':
          return "bg-green-100 text-green-800 border-green-200";
        case 'at_risk':
          return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case 'red_zone':
          return "bg-red-100 text-red-800 border-red-200";
        default:
          return "bg-teal-100 text-teal-800 border-teal-200";
      }
    }
    return "bg-white";
  };

  return (
    <>
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">Customer 360</h1>
              <p className="mt-1 text-sm text-gray-500">
                View and manage all your customer accounts
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Button className="ml-3">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 space-y-4">
          {/* First row: Search + View Toggle */}
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative w-full md:w-1/2">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="search"
                placeholder="Search customers..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex border rounded-md overflow-hidden">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "rounded-none border-0",
                  viewMode === "card" ? "bg-gray-100" : ""
                )}
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Card
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "rounded-none border-0",
                  viewMode === "table" ? "bg-gray-100" : ""
                )}
                onClick={() => setViewMode("table")}
              >
                <LayoutList className="h-4 w-4 mr-1" />
                Table
              </Button>
            </div>
          </div>
          
          {/* Second row: All filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/4">
              <Select 
                value={healthFilter || "all"} 
                onValueChange={(value) => setHealthFilter(value !== "all" ? value : null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by Health" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health Status</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="red_zone">Red Zone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-1/4">
              <Select 
                value={csmFilter?.toString() || "all"} 
                onValueChange={(value) => setCsmFilter(value !== "all" ? parseInt(value) : null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by CSM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All CSMs</SelectItem>
                  {csms.map((csm) => (
                    <SelectItem key={csm.id} value={csm.id.toString()}>
                      {csm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-1/4">
              <Select 
                value={tlFilter?.toString() || "all"} 
                onValueChange={(value) => setTlFilter(value !== "all" ? parseInt(value) : null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by Team Lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Leads</SelectItem>
                  {teamLeads.map((tl) => (
                    <SelectItem key={tl.id} value={tl.id.toString()}>
                      {tl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-1/4">
              <Select 
                value={sortField} 
                onValueChange={(value) => {
                  if (value.includes('_')) {
                    // Handle special cases like arr_asc that combine field and order
                    setSortField(value);
                    if (value.endsWith('_asc')) {
                      setSortOrder('asc');
                    } else if (value.endsWith('_desc')) {
                      setSortOrder('desc');
                    }
                  } else {
                    // For regular field names, just update the sort field
                    setSortField(value);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="renewal_date">Renewal Date (Asc)</SelectItem>
                  <SelectItem value="onboarded_at">Onboarding Date (Asc)</SelectItem>
                  <SelectItem value="active_stores_asc">Active Locations (Low to High)</SelectItem>
                  <SelectItem value="active_stores_desc">Active Locations (High to Low)</SelectItem>
                  <SelectItem value="arr_asc">ARR (Low to High)</SelectItem>
                  <SelectItem value="arr_desc">ARR (High to Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center py-10">Loading customers...</div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentCustomers?.map((customer: Customer) => (
              <div key={customer.id} className="relative">
                <Card className="h-full hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="bg-gray-100 rounded-md p-3 flex items-center justify-center">
                          {customer.logo_url ? (
                            <img 
                              src={customer.logo_url} 
                              alt={customer.name} 
                              className="h-10 w-10 object-contain" 
                            />
                          ) : (
                            <Building className="h-10 w-10 text-gray-600" />
                          )}
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-medium text-gray-900">{customer.name}</h3>
                          <p className="text-sm text-gray-500">{customer.industry || 'No industry'}</p>
                        </div>
                      </div>
                      <Badge className={cn(getHealthBadgeStyles(customer.health_status || ""))}>
                        {(customer.health_status || "unknown").replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="text-center p-2 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-500">MRR</p>
                        <p className="text-lg font-semibold">{formatINR(customer.mrr || 0)}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-500">ARR</p>
                        <p className="text-lg font-semibold">{formatINR(customer.arr || 0)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Renewal</p>
                        <p className="text-sm font-medium">
                          {customer.renewal_date 
                            ? new Date(customer.renewal_date).toLocaleDateString() 
                            : 'No date set'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/customers/${customer.id}`}>
                          <Button variant="ghost" size="sm" className="text-teal-600">
                            Details <ArrowUpRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2"
                          onClick={(e) => openDeleteDialog(customer, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>ARR</TableHead>
                  <TableHead>Renewal Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentCustomers?.map((customer: Customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <div className="bg-gray-100 rounded-md p-2 mr-2 flex items-center justify-center">
                          {customer.logo_url ? (
                            <img 
                              src={customer.logo_url} 
                              alt={customer.name} 
                              className="h-6 w-6 object-contain" 
                            />
                          ) : (
                            <Building className="h-6 w-6 text-gray-600" />
                          )}
                        </div>
                        {customer.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(getHealthBadgeStyles(customer.health_status || ""))}>
                        {(customer.health_status || "unknown").replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.industry || "—"}</TableCell>
                    <TableCell>
                      <div>
                        <div>{customer.contact_name || "—"}</div>
                        <div className="text-xs text-gray-500">{customer.contact_email || "—"}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatINR(customer.mrr || 0)}</TableCell>
                    <TableCell>{formatINR(customer.arr || 0)}</TableCell>
                    <TableCell>
                      {customer.renewal_date 
                        ? new Date(customer.renewal_date).toLocaleDateString() 
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/customers/${customer.id}`}>
                          <Button variant="ghost" size="sm">
                            View <ArrowUpRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => openDeleteDialog(customer, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {filteredCustomers?.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500">No customers match your search criteria.</p>
          </div>
        )}
        
        {/* Pagination controls */}
        {filteredCustomers && filteredCustomers.length > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCustomers)}
              </span>{" "}
              of <span className="font-medium">{totalCustomers}</span> customers
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center space-x-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show a window of 5 pages around current page
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      className="w-9"
                      onClick={() => goToPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {customerToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCustomerMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteCustomerMutation.isPending}
            >
              {deleteCustomerMutation.isPending ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Delete Customer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
