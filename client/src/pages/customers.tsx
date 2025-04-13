import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader 
} from "@/components/ui/card";
import { 
  Input 
} from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, MoreVertical, ChevronDown, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { CustomerListItem } from "@shared/types";

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Fetch customers
  const { data: customers, isLoading } = useQuery<CustomerListItem[]>({
    queryKey: ["/api/customers"],
  });

  // Filter customers based on search query, industry, and status
  const filteredCustomers = customers?.filter(customer => {
    const matchesSearch = searchQuery === "" || 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesIndustry = industry === null || customer.industry === industry;
    const matchesStatus = status === null || customer.status === status;
    
    return matchesSearch && matchesIndustry && matchesStatus;
  });

  // Get unique industries
  const industries = [...new Set(customers?.map(c => c.industry) || [])];
  
  // Get unique statuses
  const statuses = [...new Set(customers?.map(c => c.status) || [])];

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
          <Button className="flex items-center">
            <Plus className="h-4 w-4 mr-2" /> Add Customer
          </Button>
        </div>
        
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              className="pl-10"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>{industry || "All Industries"}</span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setIndustry(null)}>
                All Industries
              </DropdownMenuItem>
              {industries.map(ind => (
                <DropdownMenuItem key={ind} onClick={() => setIndustry(ind)}>
                  {ind}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>{status || "All Statuses"}</span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatus(null)}>
                All Statuses
              </DropdownMenuItem>
              {statuses.map(st => (
                <DropdownMenuItem key={st} onClick={() => setStatus(st)}>
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Customer Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">ARR</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead>CSM</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">Loading customers...</TableCell>
                  </TableRow>
                ) : filteredCustomers && filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Link href={`/customers/${customer.id}`}>
                            {customer.name}
                          </Link>
                          {customer.inRedZone && (
                            <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{customer.industry}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={customer.status === 'active' ? 'bg-green-100 text-green-800 border-0' : 'bg-yellow-100 text-yellow-800 border-0'}>
                          {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.arr)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.mrr)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={customer.assignedTo.avatar} alt={customer.assignedTo.name} />
                            <AvatarFallback>{customer.assignedTo.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{customer.assignedTo.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Link href={`/customers/${customer.id}`}>
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>Create Task</DropdownMenuItem>
                            <DropdownMenuItem>Schedule Meeting</DropdownMenuItem>
                            <DropdownMenuItem>Send Campaign</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">No customers found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
