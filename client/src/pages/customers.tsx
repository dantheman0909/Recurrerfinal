import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ListFilter,
  LayoutGrid,
  LayoutList
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatINR } from "@/lib/utils";
import { Customer } from "@shared/schema";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [healthFilter, setHealthFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  
  const { data: customers, isLoading } = useQuery({
    queryKey: ['/api/customers'],
  });
  
  const filteredCustomers = customers?.filter((customer: Customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (customer.contact_name && customer.contact_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesHealth = !healthFilter || customer.health_status === healthFilter;
    
    return matchesSearch && matchesHealth;
  });
  
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
        <div className="mb-6 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-1/3">
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
          
          <div className="flex items-center gap-4">
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
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className={cn(getHealthFilterStyles(null))}
                onClick={() => setHealthFilter(null)}
              >
                <Filter className="h-4 w-4 mr-1" />
                All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(getHealthFilterStyles('healthy'))}
                onClick={() => setHealthFilter(healthFilter === 'healthy' ? null : 'healthy')}
              >
                Healthy
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(getHealthFilterStyles('at_risk'))}
                onClick={() => setHealthFilter(healthFilter === 'at_risk' ? null : 'at_risk')}
              >
                At Risk
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className={cn(getHealthFilterStyles('red_zone'))}
                onClick={() => setHealthFilter(healthFilter === 'red_zone' ? null : 'red_zone')}
              >
                Red Zone
              </Button>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center py-10">Loading customers...</div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers?.map((customer: Customer) => (
              <Link key={customer.id} href={`/customers/${customer.id}`}>
                <a className="block h-full">
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
                        <Button variant="ghost" size="sm" className="text-teal-600">
                          Details <ArrowUpRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </Link>
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
                {filteredCustomers?.map((customer: Customer) => (
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
                      <Link href={`/customers/${customer.id}`}>
                        <Button variant="ghost" size="sm">
                          View <ArrowUpRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
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
      </div>
    </>
  );
}
