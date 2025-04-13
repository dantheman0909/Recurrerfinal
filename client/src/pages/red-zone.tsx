import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertTriangle, 
  Search, 
  MoreVertical, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  MessageSquare,
  ChevronDown,
  Filter,
  Clock
} from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

export default function RedZone() {
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [activeTab, setActiveTab] = useState("current");
  const queryClient = useQueryClient();

  // Fetch red zone accounts
  const { data: redZoneAccounts, isLoading } = useQuery({
    queryKey: ["/api/red-zone"],
  });

  // Fetch resolved red zone accounts
  const { data: resolvedAccounts, isLoading: isLoadingResolved } = useQuery({
    queryKey: ["/api/red-zone/resolved"],
    enabled: activeTab === "resolved",
  });

  // Mutation for resolving a red zone issue
  const resolveAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      await apiRequest("POST", `/api/red-zone/${accountId}/resolve`, { note: resolveNote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/red-zone"] });
      queryClient.invalidateQueries({ queryKey: ["/api/red-zone/resolved"] });
      setResolveDialogOpen(false);
      setResolveNote("");
      setSelectedAccountId(null);
    },
  });

  // Handle resolving a red zone account
  const handleResolveRedZone = () => {
    if (selectedAccountId) {
      resolveAccountMutation.mutate(selectedAccountId);
    }
  };

  // Map reason codes to readable text
  const getReasonText = (reason: string) => {
    switch (reason) {
      case "delayed_onboarding":
        return "Delayed onboarding";
      case "no_qr_loyalty_setup":
        return "No QR/loyalty setup";
      case "no_campaign_60_days":
        return "No campaign in 60+ days";
      case "no_monthly_campaigns":
        return "No monthly campaigns";
      case "no_review_meetings":
        return "No review meetings";
      case "low_nps":
        return "Low NPS score";
      case "low_data_tagging":
        return "Low data tagging";
      case "revenue_drop":
        return "Revenue drop";
      default:
        return reason;
    }
  };

  // Get red zone reason badges
  const getReasonBadges = (reasons: string[]) => {
    return reasons.map((reason, index) => (
      <Badge 
        key={index} 
        variant="outline" 
        className="bg-red-100 text-red-800 border-0 mr-1 mb-1"
      >
        {getReasonText(reason)}
      </Badge>
    ));
  };

  // Get all unique reasons from accounts
  const allReasons = redZoneAccounts?.flatMap(account => account.reasons || []) || [];
  const uniqueReasons = [...new Set(allReasons)];

  // Filter accounts based on search and reason filter
  const filteredAccounts = (activeTab === "current" ? redZoneAccounts : resolvedAccounts)?.filter(account => {
    if (!account?.customer) return false;
    
    const matchesSearch = searchQuery === "" || 
      account.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesReason = reasonFilter === null || 
      (account.reasons && account.reasons.includes(reasonFilter));
    
    return matchesSearch && matchesReason;
  });

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
            <h1 className="text-2xl font-semibold text-gray-900">Red Zone Alerts</h1>
          </div>
        </div>
        
        {/* Info Card */}
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-start">
              <AlertCircle className="h-10 w-10 text-red-500 mr-4 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-semibold mb-2 text-red-800">About Red Zone Alerts</h2>
                <p className="mb-4 text-red-700">
                  Red Zone alerts are automatically triggered when customer accounts meet certain risk criteria.
                  These alerts help you identify at-risk accounts that need immediate attention.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-red-500" />
                    <span className="text-red-700">Automated daily checks</span>
                  </div>
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                    <span className="text-red-700">Multi-factor risk assessment</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-red-500" />
                    <span className="text-red-700">Auto-resolves when resolved</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="current">Current Red Zone Alerts</TabsTrigger>
            <TabsTrigger value="resolved">Resolved Alerts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current">
            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
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
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" /> 
                    Filter by Reason
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setReasonFilter(null)}>
                    All Reasons
                  </DropdownMenuItem>
                  {uniqueReasons.map((reason) => (
                    <DropdownMenuItem 
                      key={reason} 
                      onClick={() => setReasonFilter(reason)}
                    >
                      {getReasonText(reason)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Red Zone Accounts Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Red Zone Reasons</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CSM</TableHead>
                      <TableHead className="text-right">ARR</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">Loading red zone accounts...</TableCell>
                      </TableRow>
                    ) : filteredAccounts && filteredAccounts.length > 0 ? (
                      filteredAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">
                            <Link href={`/customers/${account.customerId}`}>
                              <a className="font-medium hover:underline">
                                {account.customer?.name}
                              </a>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap">
                              {getReasonBadges(account.reasons || [])}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(account.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-0">
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-2">
                                <AvatarImage src={account.customer?.assignedTo?.avatarUrl} alt={account.customer?.assignedTo?.fullName} />
                                <AvatarFallback>
                                  {account.customer?.assignedTo?.fullName?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{account.customer?.assignedTo?.fullName || "Unassigned"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(account.customer?.arr || 0)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedAccountId(account.id);
                                  setResolveDialogOpen(true);
                                }}>
                                  Mark as Resolved
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/customers/${account.customerId}`}>
                                    View Customer
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>Create Task</DropdownMenuItem>
                                <DropdownMenuItem>Schedule Meeting</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6">
                          <div className="flex flex-col items-center py-8">
                            <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                            <p className="text-lg font-medium text-gray-900 mb-1">No Red Zone Alerts</p>
                            <p className="text-gray-500">All customer accounts are healthy!</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="resolved">
            {/* Search for Resolved Tab */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  className="pl-10"
                  placeholder="Search resolved accounts..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* Resolved Accounts Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Red Zone Reasons</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead>Resolved Date</TableHead>
                      <TableHead>CSM</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingResolved ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">Loading resolved accounts...</TableCell>
                      </TableRow>
                    ) : filteredAccounts && filteredAccounts.length > 0 ? (
                      filteredAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">
                            <Link href={`/customers/${account.customerId}`}>
                              <a className="font-medium hover:underline">
                                {account.customer?.name}
                              </a>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap">
                              {getReasonBadges(account.reasons || [])}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(account.createdAt)}</TableCell>
                          <TableCell>{formatDate(account.resolvedAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-2">
                                <AvatarImage src={account.customer?.assignedTo?.avatarUrl} alt={account.customer?.assignedTo?.fullName} />
                                <AvatarFallback>
                                  {account.customer?.assignedTo?.fullName?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{account.customer?.assignedTo?.fullName || "Unassigned"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/customers/${account.customerId}`}>
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6">
                          <p className="text-gray-500">No resolved red zone accounts found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Resolve Dialog */}
        <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Red Zone Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-500">
                This will mark the red zone alert as resolved. The customer will no longer appear in the red zone list unless new issues are detected.
              </p>
              <div className="space-y-2">
                <Label htmlFor="resolve-note">Resolution Note</Label>
                <Textarea
                  id="resolve-note"
                  placeholder="Enter details about how this issue was resolved..."
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleResolveRedZone} disabled={resolveAccountMutation.isPending}>
                {resolveAccountMutation.isPending ? "Resolving..." : "Resolve Alert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
