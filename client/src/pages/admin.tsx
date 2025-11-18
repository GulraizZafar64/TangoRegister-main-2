import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Calendar, MapPin, ShoppingBag, Settings, Plus, Edit, Trash2, Eye, Filter, X, Mail, CheckCircle2, Upload, Image, LogOut, Download, CreditCard, LayoutDashboard, UserCheck, UtensilsCrossed, Table as TableIcon } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Workshop, Milonga, Seat, Addon } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { AdminTableManagement } from "@/components/admin-table-management";
import { AdminEventsManagement } from "@/components/admin-events-management";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface RegistrationFilters {
  workshops: string[];
  milongas: string[];
  galaDinner: boolean | null;
  tshirts: boolean | null;
  dessert: boolean | null;
  transportation: boolean | null;
  packageType: string;
  paymentStatus: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddonDialog, setShowAddonDialog] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [filters, setFilters] = useState<RegistrationFilters>({
    workshops: [],
    milongas: [],
    galaDinner: null,
    tshirts: null,
    dessert: null,
    transportation: null,
    packageType: 'all',
    paymentStatus: 'all'
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem("admin-token");
    if (!token) {
      toast({
        title: "Access Denied",
        description: "Please log in to access the admin dashboard",
        variant: "destructive",
      });
      setLocation("/admin-login");
      return;
    }
  }, [setLocation, toast]);

  const handleLogout = () => {
    localStorage.removeItem("admin-token");
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
    setLocation("/admin-login");
  };

  // Fetch data
  const { data: workshops } = useQuery<Workshop[]>({ queryKey: ['/api/workshops'] });
  const { data: milongas } = useQuery({ queryKey: ['/api/milongas'] });
  const { data: seats } = useQuery<Seat[]>({ queryKey: ['/api/seats'] });
  const { data: addons } = useQuery<Addon[]>({ queryKey: ['/api/addons'] });
  const { data: registrations } = useQuery({ queryKey: ['/api/registrations'] });

  // Addon mutations
  const deleteAddonMutation = useMutation({
    mutationFn: async (addonId: string) => {
      const response = await apiRequest("DELETE", `/api/addons/${addonId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/addons'] });
      toast({
        title: "Addon Deleted",
        description: "Addon has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete addon. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Addon image upload mutation (generic for any addon with allowImageUpload option)
  const uploadAddonImageMutation = useMutation({
    mutationFn: async ({ addonId, imageURL }: { addonId: string; imageURL: string }) => {
      const response = await apiRequest("PUT", `/api/addons/${addonId}/image`, { imageURL });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/addons'] });
      const addon = addons?.find(a => a.id === variables.addonId);
      toast({
        title: "Image Updated",
        description: `${addon?.name || 'Addon'} image has been uploaded successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter registrations based on selected filters
  const filteredRegistrations = useMemo(() => {
    if (!Array.isArray(registrations)) return [];
    
    return registrations.filter((registration: any) => {
      // Package type filter
      if (filters.packageType && filters.packageType !== 'all' && registration.packageType !== filters.packageType) {
        return false;
      }
      
      // Payment status filter
      if (filters.paymentStatus && filters.paymentStatus !== 'all' && registration.paymentStatus !== filters.paymentStatus) {
        return false;
      }
      
      // Workshop filter
      if (filters.workshops.length > 0) {
        const hasWorkshop = filters.workshops.some(workshopId => 
          registration.workshopIds?.includes(workshopId)
        );
        if (!hasWorkshop) return false;
      }
      
      // Milonga filter
      if (filters.milongas.length > 0) {
        const hasMilonga = filters.milongas.some(milongaId => 
          registration.milongaIds?.includes(milongaId)
        );
        if (!hasMilonga) return false;
      }
      
      // Gala dinner filter (has seats selected)
      if (filters.galaDinner !== null) {
        const hasGalaDinner = registration.seatIds?.length > 0;
        if (filters.galaDinner !== hasGalaDinner) return false;
      }
      
      // Add-on filters
      if (filters.tshirts !== null) {
        const hasTshirt = registration.addons?.some((addon: any) => 
          addon.id === 'addon-tshirt'
        );
        if (filters.tshirts !== hasTshirt) return false;
      }
      
      if (filters.dessert !== null) {
        const hasDessert = registration.addons?.some((addon: any) => 
          addon.id === 'addon-dessert'
        );
        if (filters.dessert !== hasDessert) return false;
      }
      
      if (filters.transportation !== null) {
        const hasTransportation = registration.addons?.some((addon: any) => 
          addon.id === 'addon-transportation'
        );
        if (filters.transportation !== hasTransportation) return false;
      }
      
      return true;
    });
  }, [registrations, filters]);

  // Calculate statistics
  const totalRegistrations = Array.isArray(registrations) ? registrations.length : 0;
  // Calculate workshop enrollment from actual registrations
  const workshopEnrollment = useMemo(() => {
    if (!Array.isArray(registrations) || !workshops) return 0;
    
    let totalEnrollment = 0;
    registrations.forEach((registration: any) => {
      if (registration.workshopIds && Array.isArray(registration.workshopIds)) {
        totalEnrollment += registration.workshopIds.length;
      }
    });
    return totalEnrollment;
  }, [registrations, workshops]);
  const availableSeats = seats?.filter(s => s.isAvailable).length || 0;

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      workshops: [],
      milongas: [],
      galaDinner: null,
      tshirts: null,
      dessert: null,
      transportation: null,
      packageType: 'all',
      paymentStatus: 'all'
    });
  };

  // Update filter functions
  const updateWorkshopFilter = (workshopId: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      workshops: checked 
        ? [...prev.workshops, workshopId]
        : prev.workshops.filter(id => id !== workshopId)
    }));
  };

  const updateMilongaFilter = (milongaId: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      milongas: checked 
        ? [...prev.milongas, milongaId]
        : prev.milongas.filter(id => id !== milongaId)
    }));
  };

  // Update payment status mutation
  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ registrationId, paymentStatus }: { registrationId: string; paymentStatus: string }) => {
      const response = await apiRequest("PUT", `/api/registrations/${registrationId}/payment`, {
        paymentStatus
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/registrations'] });
      toast({
        title: "Payment Updated",
        description: "Payment status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update payment status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState('csv');

  // Export registrations function
  const exportRegistrations = () => {
    setShowExportDialog(true);
  };

  const performExport = async (format: string) => {
    const dataToExport = filteredRegistrations.map((registration: any) => ({
      Name: `${registration.leaderInfo?.firstName || ''} ${registration.leaderInfo?.lastName || ''}${
        registration.role === 'couple' && registration.followerInfo 
          ? ` & ${registration.followerInfo.firstName} ${registration.followerInfo.lastName}` 
          : ''
      }`,
      Email: registration.leaderInfo?.email || registration.followerInfo?.email || '',
      Package: registration.packageType,
      Role: registration.role,
      Amount: `AED ${registration.totalAmount?.toLocaleString() || 0}`,
      'Payment Status': registration.paymentStatus,
      'Phone Number': registration.leaderInfo?.phone || registration.followerInfo?.phone || '',
      'Emergency Contact': registration.leaderInfo?.emergencyContact || registration.followerInfo?.emergencyContact || '',
      'Dietary Restrictions': registration.leaderInfo?.dietaryRestrictions || registration.followerInfo?.dietaryRestrictions || '',
      'Workshops Count': registration.workshopIds?.length || 0,
      'Milongas Count': registration.milongaIds?.length || 0,
      'Gala Dinner Seats': registration.seatIds?.length || 0,
      'T-Shirts': registration.addons?.tshirts?.quantity || 0,
      'Has Dessert': registration.addons?.dessert ? 'Yes' : 'No',
      'Has Transportation': registration.addons?.transportation ? 'Yes' : 'No',
      'Registration Date': new Date(registration.createdAt || Date.now()).toLocaleDateString(),
      'QR Code': registration.qrCode || ''
    }));

    if (dataToExport.length === 0) {
      toast({
        title: "No Data to Export",
        description: "No registrations match the current filters.",
        variant: "destructive",
      });
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `registrations-export-${timestamp}`;

    if (format === 'csv') {
      // CSV Export
      const headers = Object.keys(dataToExport[0]);
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => {
            const value = (row as any)[header] || '';
            return value.toString().includes(',') || value.toString().includes('"') 
              ? `"${value.toString().replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadFile(blob, `${filename}.csv`);
    } 
    else if (format === 'excel') {
      // Excel Export (CSV format but with .xls extension for Excel compatibility)
      const headers = Object.keys(dataToExport[0]);
      const excelContent = [
        headers.join('\t'),
        ...dataToExport.map(row => 
          headers.map(header => (row as any)[header] || '').join('\t')
        )
      ].join('\n');

      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      downloadFile(blob, `${filename}.xls`);
    }
    else if (format === 'pdf') {
      // PDF Export
      try {
        const { jsPDF } = await import('jspdf');
        await import('jspdf-autotable');
        
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(16);
        doc.text('Dubai Tango Festival - Registration Export', 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);
        doc.text(`Total Records: ${dataToExport.length}`, 14, 32);
        
        // Prepare table data
        const headers = Object.keys(dataToExport[0]);
        const rows = dataToExport.map(row => headers.map(header => (row as any)[header] || ''));
        
        // Add table
        (doc as any).autoTable({
          head: [headers],
          body: rows,
          startY: 40,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [220, 50, 50] },
          margin: { top: 40 }
        });
        
        doc.save(`${filename}.pdf`);
      } catch (error) {
        toast({
          title: "PDF Export Error",
          description: "Failed to generate PDF. Try CSV or Excel format.",
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Export Complete",
      description: `Successfully exported ${dataToExport.length} registrations as ${format.toUpperCase()}.`,
    });
    setShowExportDialog(false);
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-semibold">Admin Panel</h2>
              <SidebarTrigger />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab("overview")} 
                      isActive={activeTab === "overview"}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Overview</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab("registrations")} 
                      isActive={activeTab === "registrations"}
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Registrations</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab("workshops")} 
                      isActive={activeTab === "workshops"}
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Workshops</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab("milongas")} 
                      isActive={activeTab === "milongas"}
                    >
                      <MapPin className="h-4 w-4" />
                      <span>Milongas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab("tables")} 
                      isActive={activeTab === "tables"}
                    >
                      <TableIcon className="h-4 w-4" />
                      <span>Tables</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab("addons")} 
                      isActive={activeTab === "addons"}
                    >
                      <UtensilsCrossed className="h-4 w-4" />
                      <span>Add-ons</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab("events")} 
                      isActive={activeTab === "events"}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Events</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="px-2">
              <Button variant="outline" size="sm" onClick={handleLogout} className="w-full flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="bg-white shadow-sm border-b sticky top-0 z-10">
            <div className="flex items-center gap-4 px-4 py-3">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Dubai Tango Festival - Admin</h1>
            </div>
          </header>
          <main className="p-4 sm:p-6 lg:p-8">
            <div>

              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <Card>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center">
                          <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                          <div className="ml-3 sm:ml-4">
                            <p className="text-xs sm:text-sm font-medium text-gray-600">Total Registrations</p>
                            <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalRegistrations}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Registrations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Array.isArray(registrations) ? registrations.slice(0, 5).map((registration: any) => (
                          <div key={registration.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{registration.leaderInfo?.firstName || registration.followerInfo?.firstName}</p>
                              <p className="text-sm text-gray-600">{registration.packageType} - {registration.role}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">AED {registration.totalAmount?.toLocaleString()}</p>
                              <Badge variant={registration.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                                {registration.paymentStatus}
                              </Badge>
                            </div>
                          </div>
                        )) : (
                          <p className="text-gray-500">No registrations found</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Registrations Tab */}
              {activeTab === "registrations" && (
                <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>All Registrations ({filteredRegistrations.length})</CardTitle>
                  <div className="flex gap-2">
                    <CreateRegistrationDialog 
                      workshops={workshops || []} 
                      milongas={Array.isArray(milongas) ? milongas : []}
                      addons={addons || []}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                    {(filters.workshops.length > 0 || filters.milongas.length > 0 || 
                      filters.galaDinner !== null || filters.tshirts !== null || 
                      filters.dessert !== null || filters.transportation !== null ||
                      (filters.packageType && filters.packageType !== 'all') || 
                      (filters.paymentStatus && filters.paymentStatus !== 'all')) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={clearFilters}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-green-600"
                      onClick={() => exportRegistrations()}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Filter Panel */}
                {showFilters && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 m-6 mb-0 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {/* Package Type Filter */}
                      <div>
                        <Label className="text-sm font-medium">Package Type</Label>
                        <select 
                          value={filters.packageType} 
                          onChange={(e) => setFilters(prev => ({ ...prev, packageType: e.target.value }))}
                          className="mt-1 w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <option value="all">All packages</option>
                          <option value="full">Premium Package</option>
                          <option value="evening">Evening Package</option>
                          <option value="custom">Custom Package</option>
                        </select>
                      </div>

                      {/* Payment Status Filter */}
                      <div>
                        <Label className="text-sm font-medium">Payment Status</Label>
                        <select 
                          value={filters.paymentStatus} 
                          onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                          className="mt-1 w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <option value="all">All statuses</option>
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="failed">Failed</option>
                        </select>
                      </div>

                      {/* Gala Dinner Filter */}
                      <div>
                        <Label className="text-sm font-medium">Gala Dinner</Label>
                        <select 
                          value={filters.galaDinner === null ? 'all' : filters.galaDinner.toString()} 
                          onChange={(e) => setFilters(prev => ({ ...prev, galaDinner: e.target.value === 'all' ? null : e.target.value === 'true' }))}
                          className="mt-1 w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <option value="all">All</option>
                          <option value="true">Has seats</option>
                          <option value="false">No seats</option>
                        </select>
                      </div>

                      {/* T-Shirts Filter */}
                      <div>
                        <Label className="text-sm font-medium">T-Shirts</Label>
                        <select 
                          value={filters.tshirts === null ? 'all' : filters.tshirts.toString()} 
                          onChange={(e) => setFilters(prev => ({ ...prev, tshirts: e.target.value === 'all' ? null : e.target.value === 'true' }))}
                          className="mt-1 w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                          <option value="all">All</option>
                          <option value="true">Ordered</option>
                          <option value="false">Not ordered</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Workshop Filter */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Workshops</Label>
                        <div className="max-h-32 overflow-y-auto space-y-2">
                          {workshops?.map((workshop) => (
                            <div key={workshop.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`workshop-${workshop.id}`}
                                checked={filters.workshops.includes(workshop.id)}
                                onCheckedChange={(checked) => updateWorkshopFilter(workshop.id, !!checked)}
                              />
                              <Label htmlFor={`workshop-${workshop.id}`} className="text-sm">
                                {workshop.title}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Milonga Filter */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Milongas</Label>
                        <div className="max-h-32 overflow-y-auto space-y-2">
                          {Array.isArray(milongas) && milongas?.map((milonga: any) => (
                            <div key={milonga.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`milonga-${milonga.id}`}
                                checked={filters.milongas.includes(milonga.id)}
                                onCheckedChange={(checked) => updateMilongaFilter(milonga.id, !!checked)}
                              />
                              <Label htmlFor={`milonga-${milonga.id}`} className="text-sm">
                                {milonga.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      {/* Additional Add-on Filters */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="dessert-filter"
                          checked={filters.dessert === true}
                          onCheckedChange={(checked) => setFilters(prev => ({ ...prev, dessert: !!checked ? true : null }))}
                        />
                        <Label htmlFor="dessert-filter" className="text-sm">Has Dessert</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="transportation-filter"
                          checked={filters.transportation === true}
                          onCheckedChange={(checked) => setFilters(prev => ({ ...prev, transportation: !!checked ? true : null }))}
                        />
                        <Label htmlFor="transportation-filter" className="text-sm">Has Transportation</Label>
                      </div>
                    </div>
                  </div>
                )}
                {/* Scrollable table container */}
                <div className="max-h-[70vh] overflow-auto">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.map((registration: any) => (
                      <TableRow key={registration.id}>
                        <TableCell>
                          {registration.leaderInfo?.firstName} {registration.leaderInfo?.lastName}
                          {registration.role === 'couple' && registration.followerInfo && (
                            <div className="text-sm text-gray-600">
                              & {registration.followerInfo.firstName} {registration.followerInfo.lastName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {registration.leaderInfo?.email || registration.followerInfo?.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {registration.packageType}
                          </Badge>
                        </TableCell>
                        <TableCell>{registration.role}</TableCell>
                        <TableCell>AED {registration.totalAmount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={registration.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                            {registration.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <RegistrationDetailDialog registration={registration}>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </RegistrationDetailDialog>
                            <UserManagementDialog registration={registration}>
                              <Button size="sm" variant="outline">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </UserManagementDialog>
                            {registration.paymentMethod === 'offline' && (
                              <select
                                value={registration.paymentStatus || 'pending'}
                                onChange={(e) => {
                                  updatePaymentStatusMutation.mutate({
                                    registrationId: registration.id,
                                    paymentStatus: e.target.value
                                  });
                                }}
                                disabled={updatePaymentStatusMutation.isPending}
                                className="w-[120px] h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                              >
                                <option value="pending">Pending</option>
                                <option value="completed">Complete</option>
                              </select>
                            )}
                            <DeleteRegistrationButton registrationId={registration.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRegistrations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500">
                          {Array.isArray(registrations) && registrations.length > 0 
                            ? "No registrations match the selected filters" 
                            : "No registrations found"
                          }
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Export Dialog */}
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Export Registrations</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Export {filteredRegistrations.length} registration{filteredRegistrations.length !== 1 ? 's' : ''} 
                    {filters.packageType !== 'all' || filters.paymentStatus !== 'all' || filters.workshops.length > 0 || filters.milongas.length > 0 
                      ? ' (filtered)' 
                      : ''
                    } in your preferred format.
                  </p>
                  
                  <div>
                    <Label className="text-sm font-medium">Export Format</Label>
                    <select 
                      value={selectedExportFormat} 
                      onChange={(e) => setSelectedExportFormat(e.target.value)}
                      className="mt-2 w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="csv">CSV (Comma Separated Values)</option>
                      <option value="excel">Excel (.xls)</option>
                      <option value="pdf">PDF (Formatted Report)</option>
                    </select>
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>CSV:</strong> Best for spreadsheet analysis and data processing</p>
                    <p><strong>Excel:</strong> Opens directly in Microsoft Excel with formatting</p>
                    <p><strong>PDF:</strong> Professional report format for printing and sharing</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowExportDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => performExport(selectedExportFormat)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export {selectedExportFormat.toUpperCase()}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Workshops Tab */}
        {activeTab === "workshops" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Workshop Management</h2>
              <WorkshopDialog />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workshops?.map((workshop) => (
                <Card key={workshop.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{workshop.title}</CardTitle>
                    <p className="text-sm text-gray-600">{workshop.instructor}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm"><strong>Level:</strong> {workshop.level}</p>
                      <p className="text-sm"><strong>Date:</strong> {workshop.date}</p>
                      <p className="text-sm"><strong>Time:</strong> {workshop.time}</p>
                      <p className="text-sm">
                        <strong>Capacity:</strong> 
                        Leaders: {workshop.leadersEnrolled || 0}/{workshop.leaderCapacity || 0}, 
                        Followers: {workshop.followersEnrolled || 0}/{workshop.followerCapacity || 0}
                      </p>
                      <p className="text-sm">
                        <strong>Price:</strong> AED {workshop.price}
                        {workshop.earlyBirdPrice && parseFloat(workshop.earlyBirdPrice) > 0 && (
                          <span className="ml-2 text-green-600 text-xs">
                            (Early Bird: AED {workshop.earlyBirdPrice})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <WorkshopDialog workshop={workshop} mode="edit">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </WorkshopDialog>
                      <DeleteWorkshopButton workshopId={workshop.id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Milongas Tab */}
        {activeTab === "milongas" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Milonga Management</h2>
              <MilongaDialog />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.isArray(milongas) ? milongas.map((milonga: any) => (
                <Card key={milonga.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{milonga.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm"><strong>Date:</strong> {milonga.date}</p>
                      <p className="text-sm"><strong>Time:</strong> {milonga.time}</p>
                      <p className="text-sm"><strong>Venue:</strong> {milonga.venue}</p>
                      <p className="text-sm"><strong>Capacity:</strong> {milonga.enrolled || 0}/{milonga.capacity} spots</p>
                      <p className="text-sm"><strong>Price:</strong> AED {milonga.price}</p>
                      {milonga.earlyBirdPrice && parseFloat(milonga.earlyBirdPrice) > 0 && (
                        <p className="text-sm text-green-600">
                          <strong>Early Bird:</strong> AED {milonga.earlyBirdPrice}
                          {milonga.earlyBirdEndDate && (
                            <span className="ml-2 text-xs">
                              (until {new Date(milonga.earlyBirdEndDate).toLocaleDateString()})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <MilongaDialog milonga={milonga} mode="edit">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </MilongaDialog>
                      <DeleteMilongaButton milongaId={milonga.id} />
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <p className="text-gray-500">No milongas found</p>
              )}
            </div>
          </div>
        )}

        {/* Tables Tab */}
        {activeTab === "tables" && (
          <div className="space-y-6">
            <AdminTableManagement adminToken={localStorage.getItem("admin-token") || ""} />
          </div>
        )}

        {/* Add-ons Tab */}
        {activeTab === "addons" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Add-on Management</h2>
              <Button 
                onClick={() => {
                  setEditingAddon(null);
                  setShowAddonDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Add-on
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {addons?.map((addon) => (
                <Card key={addon.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{addon.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm">{addon.description}</p>
                      <p className="text-sm"><strong>Price:</strong> AED {addon.price}</p>
                      {addon.options && (
                        <div className="text-sm">
                          <strong>Options:</strong>
                          {Object.entries(addon.options).map(([key, values]) => (
                            <div key={key} className="ml-2">
                              {key}: {Array.isArray(values) ? values.join(', ') : String(values)}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Image Management for addons with allowImageUpload option */}
                      {addon.options?.allowImageUpload && (
                        <div className="space-y-3 pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            <span className="text-sm font-medium">{addon.name} Image</span>
                          </div>
                          {addon.options?.image && (
                            <div className="text-sm text-green-600">
                              ✓ Custom image uploaded
                            </div>
                          )}
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={5242880} // 5MB
                            onGetUploadParameters={async () => {
                              const response = await apiRequest("POST", "/api/objects/upload");
                              const data = await response.json();
                              return {
                                method: "PUT" as const,
                                url: data.uploadURL,
                              };
                            }}
                            onComplete={(result) => {
                              if (result.successful && result.successful.length > 0) {
                                const uploadURL = result.successful[0].uploadURL;
                                uploadAddonImageMutation.mutate({ 
                                  addonId: addon.id, 
                                  imageURL: uploadURL 
                                });
                              }
                            }}
                            buttonClassName="w-full text-sm"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {addon.options?.image ? 'Change Image' : 'Upload Image'}
                          </ObjectUploader>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingAddon(addon);
                          setShowAddonDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteAddonMutation.mutate(addon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="space-y-6">
            <AdminEventsManagement adminToken={localStorage.getItem("admin-token") || ""} />
          </div>
        )}
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Addon Dialog */}
      <AddonDialog 
        open={showAddonDialog}
        onOpenChange={setShowAddonDialog}
        addon={editingAddon}
        mode={editingAddon ? 'edit' : 'create'}
      />
    </SidebarProvider>
  );
}

function AddonDialog({ open, onOpenChange, addon, mode = 'create' }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  addon?: Addon | null; 
  mode?: 'create' | 'edit' 
}) {
  const [formData, setFormData] = useState({
    name: addon?.name || '',
    description: addon?.description || '',
    price: addon?.price || ''
  });
  const { toast } = useToast();

  const createAddonMutation = useMutation({
    mutationFn: async (addonData: any) => {
      const url = mode === 'edit' ? `/api/addons/${addon?.id}` : "/api/addons";
      const method = mode === 'edit' ? "PUT" : "POST";
      const response = await apiRequest(method, url, addonData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/addons'] });
      toast({
        title: mode === 'edit' ? "Addon Updated" : "Addon Created",
        description: mode === 'edit' ? "Addon has been updated successfully." : "New addon has been added successfully.",
      });
      onOpenChange(false);
      if (mode === 'create') {
        setFormData({
          name: '',
          description: '',
          price: ''
        });
      }
    },
    onError: () => {
      toast({
        title: mode === 'edit' ? "Update Failed" : "Create Failed",
        description: mode === 'edit' ? "Failed to update addon. Please try again." : "Failed to create addon. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    createAddonMutation.mutate(formData);
  };

  // Reset form when addon changes
  useEffect(() => {
    if (addon) {
      setFormData({
        name: addon.name || '',
        description: addon.description || '',
        price: addon.price || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: ''
      });
    }
  }, [addon]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Addon' : 'Create Addon'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="price">Price (AED)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAddonMutation.isPending}>
              {createAddonMutation.isPending ? 'Saving...' : mode === 'edit' ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkshopDialog({ workshop, mode = 'create' }: { workshop?: Workshop; mode?: 'create' | 'edit' }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: workshop?.title || '',
    instructor: workshop?.instructor || '',
    description: workshop?.description || '',
    level: workshop?.level || 'beginner',
    date: workshop?.date ? (workshop.date instanceof Date ? workshop.date.toISOString().split('T')[0] : new Date(workshop.date).toISOString().split('T')[0]) : '',
    time: workshop?.time || '',
    leaderCapacity: workshop?.leaderCapacity?.toString() || '',
    followerCapacity: workshop?.followerCapacity?.toString() || '',
    price: workshop?.price || '',
    earlyBirdPrice: workshop?.earlyBirdPrice || '0',
    earlyBirdEndDate: workshop?.earlyBirdEndDate ? (workshop.earlyBirdEndDate instanceof Date ? workshop.earlyBirdEndDate.toISOString().split('T')[0] : new Date(workshop.earlyBirdEndDate).toISOString().split('T')[0]) : ''
  });
  const { toast } = useToast();

  const createWorkshopMutation = useMutation({
    mutationFn: async (workshopData: any) => {
      const url = mode === 'edit' ? `/api/workshops/${workshop?.id}` : "/api/workshops";
      const method = mode === 'edit' ? "PUT" : "POST";
      const response = await apiRequest(method, url, workshopData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshops'] });
      toast({
        title: mode === 'edit' ? "Workshop Updated" : "Workshop Created",
        description: mode === 'edit' ? "Workshop has been updated successfully." : "New workshop has been added successfully.",
      });
      setOpen(false);
      if (mode === 'create') {
        setFormData({
          title: '',
          instructor: '',
          description: '',
          level: 'beginner',
          date: '',
          time: '',
          leaderCapacity: '',
          followerCapacity: '',
          price: '',
          earlyBirdPrice: '0',
          earlyBirdEndDate: ''
        });
      }
    },
    onError: (error: any) => {
      // Phase 6: Improve error display with specific messages
      console.error("Workshop creation error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response,
        data: error.data
      });
      
      let errorMessage = error.message || "Failed to create workshop";
      
      // Phase 6: Handle eventId-related errors specifically
      if (errorMessage.includes("event_id") || errorMessage.includes("Event ID") || errorMessage.includes("eventId")) {
        errorMessage = "Event ID is missing. Please ensure an event is set as current in the Events section.";
      }
      
      toast({
        title: "Error Creating Workshop",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Phase 6: Log form data before submission
    console.log("=== Frontend: Workshop form submission ===");
    console.log("Form data:", formData);
    
    // Validate required numeric fields
    const leaderCap = parseInt(formData.leaderCapacity);
    const followerCap = parseInt(formData.followerCapacity);
    const price = parseFloat(formData.price);
    
    if (isNaN(leaderCap) || leaderCap <= 0) {
      toast({
        title: "Validation Error",
        description: "Leader capacity must be a positive number",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(followerCap) || followerCap <= 0) {
      toast({
        title: "Validation Error",
        description: "Follower capacity must be a positive number",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Validation Error",
        description: "Price must be a positive number",
        variant: "destructive",
      });
      return;
    }
    
    const submissionData = {
      ...formData,
      leaderCapacity: leaderCap,
      followerCapacity: followerCap,
      price: price.toString(),
      date: formData.date ? new Date(formData.date) : null,
      earlyBirdPrice: formData.earlyBirdPrice || '0',
      earlyBirdEndDate: formData.earlyBirdEndDate ? new Date(formData.earlyBirdEndDate) : null
    };
    
    // Phase 6: Log data being sent to API
    console.log("Data being sent to API:", JSON.stringify(submissionData, null, 2));
    
    createWorkshopMutation.mutate(submissionData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Workshop
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Workshop' : 'Add New Workshop'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="instructor">Instructor</Label>
            <Input
              id="instructor"
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <select
              id="level"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              required
            >
              <option value="">Select level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leaderCapacity">Leader Capacity</Label>
              <Input
                id="leaderCapacity"
                type="number"
                placeholder="Leader spots"
                value={formData.leaderCapacity}
                onChange={(e) => setFormData({ ...formData, leaderCapacity: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="followerCapacity">Follower Capacity</Label>
              <Input
                id="followerCapacity"
                type="number"
                placeholder="Follower spots"
                value={formData.followerCapacity}
                onChange={(e) => setFormData({ ...formData, followerCapacity: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="price">Regular Price (AED)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="e.g., 180"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="earlyBirdPrice">Early Bird Price (AED)</Label>
              <Input
                id="earlyBirdPrice"
                type="number"
                step="0.01"
                value={formData.earlyBirdPrice}
                onChange={(e) => setFormData({ ...formData, earlyBirdPrice: e.target.value })}
                placeholder="0 = disabled"
              />
            </div>
            <div>
              <Label htmlFor="earlyBirdEndDate">Early Bird End Date</Label>
              <Input
                id="earlyBirdEndDate"
                type="date"
                value={formData.earlyBirdEndDate}
                onChange={(e) => setFormData({ ...formData, earlyBirdEndDate: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={createWorkshopMutation.isPending}>
            {createWorkshopMutation.isPending 
              ? (mode === 'edit' ? 'Updating...' : 'Creating...')
              : (mode === 'edit' ? 'Update Workshop' : 'Create Workshop')
            }
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteWorkshopButton({ workshopId }: { workshopId: string }) {
  const { toast } = useToast();

  const deleteWorkshopMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/workshops/${workshopId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshops'] });
      toast({
        title: "Workshop Deleted",
        description: "Workshop has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Button 
      size="sm" 
      variant="outline" 
      onClick={() => deleteWorkshopMutation.mutate()}
      disabled={deleteWorkshopMutation.isPending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function MilongaDialog({ milonga, mode = 'create' }: { milonga?: any; mode?: 'create' | 'edit' }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: milonga?.name || '',
    date: milonga?.date || '',
    time: milonga?.time || '',
    venue: milonga?.venue || '',
    description: milonga?.description || '',
    price: milonga?.price || '',
    earlyBirdPrice: milonga?.earlyBirdPrice || '0',
    earlyBirdEndDate: milonga?.earlyBirdEndDate || '',
    capacity: milonga?.capacity?.toString() || ''
  });
  const { toast } = useToast();

  const createMilongaMutation = useMutation({
    mutationFn: async (milongaData: any) => {
      const url = mode === 'edit' ? `/api/milongas/${milonga?.id}` : "/api/milongas";
      const method = mode === 'edit' ? "PUT" : "POST";
      const response = await apiRequest(method, url, milongaData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milongas'] });
      toast({
        title: mode === 'edit' ? "Milonga Updated" : "Milonga Created",
        description: mode === 'edit' ? "Milonga has been updated successfully." : "New milonga has been added successfully.",
      });
      setOpen(false);
      if (mode === 'create') {
        setFormData({
          name: '',
          date: '',
          time: '',
          venue: '',
          description: '',
          price: '',
          earlyBirdPrice: '0',
          earlyBirdEndDate: '',
          capacity: ''
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMilongaMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Milonga
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Milonga' : 'Add New Milonga'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="price">Price (AED)</Label>
            <Input
              id="price"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="earlyBirdPrice">Early Bird Price (AED)</Label>
            <Input
              id="earlyBirdPrice"
              type="number"
              step="0.01"
              value={formData.earlyBirdPrice}
              onChange={(e) => setFormData({ ...formData, earlyBirdPrice: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="earlyBirdEndDate">Early Bird End Date</Label>
            <Input
              id="earlyBirdEndDate"
              type="date"
              value={formData.earlyBirdEndDate}
              onChange={(e) => setFormData({ ...formData, earlyBirdEndDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="capacity">Capacity (Number of Spots)</Label>
            <Input
              id="capacity"
              type="number"
              placeholder="Enter total spots available"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={createMilongaMutation.isPending}>
            {createMilongaMutation.isPending 
              ? (mode === 'edit' ? 'Updating...' : 'Creating...')
              : (mode === 'edit' ? 'Update Milonga' : 'Create Milonga')
            }
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMilongaButton({ milongaId }: { milongaId: string }) {
  const { toast } = useToast();

  const deleteMilongaMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/milongas/${milongaId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milongas'] });
      toast({
        title: "Milonga Deleted",
        description: "Milonga has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Button 
      size="sm" 
      variant="outline" 
      onClick={() => deleteMilongaMutation.mutate()}
      disabled={deleteMilongaMutation.isPending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function EnrollmentEditor({ workshopId, currentEnrolled, maxCapacity }: { 
  workshopId: string; 
  currentEnrolled: number; 
  maxCapacity: number; 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [enrollmentValue, setEnrollmentValue] = useState(currentEnrolled.toString());
  const { toast } = useToast();

  const updateEnrollmentMutation = useMutation({
    mutationFn: async (newEnrollment: number) => {
      const response = await apiRequest("PUT", `/api/workshops/${workshopId}/enrollment`, { 
        enrolled: newEnrollment 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshops'] });
      setIsEditing(false);
      toast({
        title: "Enrollment Updated",
        description: "Workshop enrollment has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setEnrollmentValue(currentEnrolled.toString());
    },
  });

  const handleSave = () => {
    const newValue = parseInt(enrollmentValue);
    if (isNaN(newValue) || newValue < 0 || newValue > maxCapacity) {
      toast({
        title: "Invalid Value",
        description: `Enrollment must be between 0 and ${maxCapacity}`,
        variant: "destructive",
      });
      setEnrollmentValue(currentEnrolled.toString());
      return;
    }
    updateEnrollmentMutation.mutate(newValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEnrollmentValue(currentEnrolled.toString());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1 ml-1">
        <Input
          type="number"
          value={enrollmentValue}
          onChange={(e) => setEnrollmentValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleSave}
          className="w-16 h-6 text-xs p-1"
          min={0}
          max={maxCapacity}
          autoFocus
        />
      </div>
    );
  }

  return (
    <span 
      className="cursor-pointer hover:bg-gray-100 px-1 rounded ml-1"
      onClick={() => {
        setIsEditing(true);
        setEnrollmentValue(currentEnrolled.toString());
      }}
      title="Click to edit enrollment"
    >
      {currentEnrolled}
    </span>
  );
}

function DeleteRegistrationButton({ registrationId }: { registrationId: string }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const deleteRegistrationMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid registration ID');
      }
      // Ensure ID is properly encoded in URL
      const encodedId = encodeURIComponent(id.trim());
      const response = await apiRequest("DELETE", `/api/registrations/${encodedId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/registrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workshops'] });
      queryClient.invalidateQueries({ queryKey: ['/api/milongas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: "Registration Deleted",
        description: "Registration has been deleted successfully.",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete registration. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Registration</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this registration? This action cannot be undone and will release all associated resources (workshop spots, milonga spots, table seats).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteRegistrationMutation.mutate(registrationId)}
            disabled={deleteRegistrationMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteRegistrationMutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RegistrationDetailDialog({ registration, children }: { registration: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: workshops } = useQuery<any[]>({ queryKey: ['/api/workshops'] });
  const { data: milongas } = useQuery<any[]>({ queryKey: ['/api/milongas'] });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Registration Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Participant Information</h3>
              <div className="space-y-2">
                <p><strong>Name:</strong> {registration.leaderInfo?.firstName} {registration.leaderInfo?.lastName}</p>
                <p><strong>Email:</strong> {registration.leaderInfo?.email}</p>
                <p><strong>Phone:</strong> {registration.leaderInfo?.phone}</p>
                {registration.role === 'couple' && registration.followerInfo && (
                  <div className="mt-4 pt-3 border-t">
                    <h4 className="font-medium mb-2">Partner Information</h4>
                    <p><strong>Name:</strong> {registration.followerInfo.firstName} {registration.followerInfo.lastName}</p>
                    <p><strong>Email:</strong> {registration.followerInfo.email}</p>
                    <p><strong>Phone:</strong> {registration.followerInfo.phone}</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Package Details</h3>
              <div className="space-y-2">
                <p><strong>Package:</strong> {registration.packageType}</p>
                <p><strong>Role:</strong> {registration.role}</p>
                <p><strong>Total Amount:</strong> AED {registration.totalAmount?.toLocaleString()}</p>
                <p><strong>Payment Status:</strong> 
                  <Badge variant={registration.paymentStatus === 'completed' ? 'default' : 'secondary'} className="ml-2">
                    {registration.paymentStatus}
                  </Badge>
                </p>
                <p><strong>Table Assignment:</strong> 
                  {registration.selectedTableNumber ? 
                    `Table ${registration.selectedTableNumber}` : 
                    <span className="text-gray-500">No table selected</span>
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Payment Information</h3>
            <div className="space-y-2">
              <p><strong>Payment Method:</strong> 
                <Badge variant="outline" className="ml-2">
                  {registration.paymentMethod === 'stripe' ? (
                    <>
                      <CreditCard className="h-3 w-3 inline mr-1" />
                      Stripe
                    </>
                  ) : (
                    'Bank Transfer'
                  )}
                </Badge>
              </p>
              {registration.paymentMethod === 'stripe' && registration.stripePaymentIntentId && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                  <p><strong>Stripe Payment Intent ID:</strong></p>
                  <p className="font-mono text-sm break-all">{registration.stripePaymentIntentId}</p>
                  <p className="text-sm text-gray-600">
                    You can view full transaction details in your Stripe dashboard using this ID.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Selected Workshops ({registration.workshopIds?.length || 0})</h3>
            {registration.workshopIds?.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {registration.workshopIds.map((workshopId: string) => {
                  const workshop = workshops?.find(w => w.id === workshopId);
                  return (
                    <div key={workshopId} className="p-3 border rounded-lg">
                      <div className="font-medium">{workshop?.title || 'Unknown Workshop'}</div>
                      <div className="text-sm text-gray-600">
                        {workshop?.instructor} • {workshop?.date} at {workshop?.time} • {workshop?.level}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No workshops selected</p>
            )}
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Selected Milongas ({registration.milongaIds?.length || 0})</h3>
            {registration.milongaIds?.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {registration.milongaIds.map((milongaId: string) => {
                  const milonga = milongas?.find(m => m.id === milongaId);
                  return (
                    <div key={milongaId} className="p-3 border rounded-lg">
                      <div className="font-medium">{milonga?.name || 'Unknown Milonga'}</div>
                      <div className="text-sm text-gray-600">
                        {milonga?.date} at {milonga?.time} • {milonga?.venue}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No milongas selected</p>
            )}
          </div>
          
          {registration.addons?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Add-ons ({registration.addons?.length || 0})</h3>
              <div className="grid grid-cols-1 gap-2">
                {registration.addons.map((addon: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="font-medium">{addon.name}</div>
                    <div className="text-sm text-gray-600">
                      Quantity: {addon.quantity} • Price: AED {addon.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserManagementDialog({ registration, children }: { registration: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>(registration.workshopIds || []);
  const [selectedTable, setSelectedTable] = useState<number | null>(registration.selectedTableNumber || null);
  const { toast } = useToast();
  const { data: workshops } = useQuery<any[]>({ queryKey: ['/api/workshops'] });
  const { data: tables } = useQuery<any[]>({ queryKey: ['/api/tables'] });

  const updateRegistrationMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PUT", `/api/registrations/${registration.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/registrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workshops'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: "Registration Updated",
        description: "User registration has been updated successfully.",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateRegistrationMutation.mutate({
      workshopIds: selectedWorkshops,
      selectedTableNumber: selectedTable,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage User Registration</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Workshop Enrollment</h3>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {workshops?.map(workshop => (
                <label key={workshop.id} className="flex items-center space-x-2 p-2 border rounded">
                  <input
                    type="checkbox"
                    checked={selectedWorkshops.includes(workshop.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedWorkshops([...selectedWorkshops, workshop.id]);
                      } else {
                        setSelectedWorkshops(selectedWorkshops.filter(id => id !== workshop.id));
                      }
                    }}
                  />
                  <div className="text-sm">
                    <div className="font-medium">{workshop.title}</div>
                    <div className="text-gray-500">{workshop.date} - {workshop.time}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Table Assignment</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="no-table"
                  name="table"
                  checked={selectedTable === null}
                  onChange={() => setSelectedTable(null)}
                />
                <label htmlFor="no-table" className="text-sm">No table assigned</label>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                {tables?.filter(table => table.isActive).map(table => (
                  <div key={table.id} className="flex items-center space-x-2 p-2 border rounded">
                    <input
                      type="radio"
                      id={`table-${table.tableNumber}`}
                      name="table"
                      checked={selectedTable === table.tableNumber}
                      onChange={() => setSelectedTable(table.tableNumber)}
                    />
                    <label htmlFor={`table-${table.tableNumber}`} className="text-sm">
                      <div className="font-medium">Table {table.tableNumber}</div>
                      <div className="text-xs text-gray-500">
                        {table.occupiedSeats || 0}/{table.totalSeats} occupied
                        {table.isVip && <span className="ml-1 text-yellow-600">(VIP)</span>}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateRegistrationMutation.isPending}>
              {updateRegistrationMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateRegistrationDialog({ workshops, milongas, addons }: { 
  workshops: Workshop[]; 
  milongas: any[]; 
  addons: Addon[] 
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: events } = useQuery({ queryKey: ['/api/events'] });
  const { data: tables } = useQuery({ queryKey: ['/api/tables'] });
  
  const [formData, setFormData] = useState({
    eventId: '',
    packageType: 'full' as 'full' | 'evening' | 'custom' | 'premium-accommodation-4nights' | 'premium-accommodation-3nights',
    role: 'leader' as 'leader' | 'follower' | 'couple',
    leaderInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      country: '',
      level: ''
    },
    followerInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      country: '',
      level: ''
    },
    workshopIds: [] as string[],
    milongaIds: [] as string[],
    selectedTableNumber: undefined as number | undefined,
    addons: [] as Array<{ id: string; quantity: number; options?: Record<string, string> }>,
    paymentMethod: 'offline' as 'stripe' | 'offline',
    paymentStatus: 'pending' as 'pending' | 'completed' | 'failed'
  });

  const createRegistrationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/registrations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/registrations'] });
      toast({
        title: "Registration Created",
        description: "Registration has been created successfully.",
      });
      setOpen(false);
      // Reset form
      setFormData({
        eventId: '',
        packageType: 'full',
        role: 'leader',
        leaderInfo: { firstName: '', lastName: '', email: '', phone: '', country: '', level: '' },
        followerInfo: { firstName: '', lastName: '', email: '', phone: '', country: '', level: '' },
        workshopIds: [],
        milongaIds: [],
        selectedTableNumber: undefined,
        addons: [],
        paymentMethod: 'offline',
        paymentStatus: 'pending'
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create registration",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.eventId) {
      toast({
        title: "Event Required",
        description: "Please select an event",
        variant: "destructive",
      });
      return;
    }

    if (!formData.leaderInfo.firstName || !formData.leaderInfo.lastName || !formData.leaderInfo.email) {
      toast({
        title: "Leader Info Required",
        description: "Please fill in leader information",
        variant: "destructive",
      });
      return;
    }

    if (formData.role === 'couple' && (!formData.followerInfo.firstName || !formData.followerInfo.lastName || !formData.followerInfo.email)) {
      toast({
        title: "Follower Info Required",
        description: "Please fill in follower information for couple registration",
        variant: "destructive",
      });
      return;
    }

    const registrationData = {
      eventId: formData.eventId,
      packageType: formData.packageType,
      role: formData.role,
      leaderInfo: formData.leaderInfo,
      followerInfo: formData.role === 'couple' ? formData.followerInfo : undefined,
      workshopIds: formData.workshopIds,
      milongaIds: formData.milongaIds,
      selectedTableNumber: formData.selectedTableNumber,
      addons: formData.addons,
      paymentMethod: formData.paymentMethod,
      paymentStatus: formData.paymentStatus,
      totalAmount: 0 // Will be calculated by server
    };

    createRegistrationMutation.mutate(registrationData);
  };

  const toggleWorkshop = (workshopId: string) => {
    setFormData(prev => ({
      ...prev,
      workshopIds: prev.workshopIds.includes(workshopId)
        ? prev.workshopIds.filter(id => id !== workshopId)
        : [...prev.workshopIds, workshopId]
    }));
  };

  const toggleMilonga = (milongaId: string) => {
    setFormData(prev => ({
      ...prev,
      milongaIds: prev.milongaIds.includes(milongaId)
        ? prev.milongaIds.filter(id => id !== milongaId)
        : [...prev.milongaIds, milongaId]
    }));
  };

  const toggleAddon = (addonId: string, quantity: number = 1) => {
    setFormData(prev => {
      const existing = prev.addons.find(a => a.id === addonId);
      if (existing) {
        return {
          ...prev,
          addons: prev.addons.filter(a => a.id !== addonId)
        };
      } else {
        return {
          ...prev,
          addons: [...prev.addons, { id: addonId, quantity, options: {} }]
        };
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Registration
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Registration</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Selection */}
          <div className="space-y-2">
            <Label htmlFor="eventId">Event *</Label>
            <select
              id="eventId"
              value={formData.eventId}
              onChange={(e) => setFormData(prev => ({ ...prev, eventId: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              required
            >
              <option value="">Select event</option>
              {events?.map((event: any) => (
                <option key={event.id} value={event.id}>
                  {event.name} ({event.year})
                </option>
              ))}
            </select>
          </div>

          {/* Package Type and Role */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="packageType">Package Type *</Label>
              <select
                id="packageType"
                value={formData.packageType}
                onChange={(e) => setFormData(prev => ({ ...prev, packageType: e.target.value as any }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="full">Full Package</option>
                <option value="evening">Evening Package</option>
                <option value="custom">Custom Package</option>
                <option value="premium-accommodation-4nights">Premium + 4 Nights</option>
                <option value="premium-accommodation-3nights">Premium + 3 Nights</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="leader">Leader</option>
                <option value="follower">Follower</option>
                <option value="couple">Couple</option>
              </select>
            </div>
          </div>

          {/* Leader Info */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Leader Information *</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="leaderFirstName">First Name *</Label>
                <Input
                  id="leaderFirstName"
                  value={formData.leaderInfo.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, leaderInfo: { ...prev.leaderInfo, firstName: e.target.value } }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="leaderLastName">Last Name *</Label>
                <Input
                  id="leaderLastName"
                  value={formData.leaderInfo.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, leaderInfo: { ...prev.leaderInfo, lastName: e.target.value } }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="leaderEmail">Email *</Label>
                <Input
                  id="leaderEmail"
                  type="email"
                  value={formData.leaderInfo.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, leaderInfo: { ...prev.leaderInfo, email: e.target.value } }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="leaderPhone">Phone *</Label>
                <Input
                  id="leaderPhone"
                  value={formData.leaderInfo.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, leaderInfo: { ...prev.leaderInfo, phone: e.target.value } }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="leaderCountry">Country *</Label>
                <Input
                  id="leaderCountry"
                  value={formData.leaderInfo.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, leaderInfo: { ...prev.leaderInfo, country: e.target.value } }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="leaderLevel">Experience Level *</Label>
                <select
                  id="leaderLevel"
                  value={formData.leaderInfo.level}
                  onChange={(e) => setFormData(prev => ({ ...prev, leaderInfo: { ...prev.leaderInfo, level: e.target.value } }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                >
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
            </div>
          </div>

          {/* Follower Info (if couple) */}
          {formData.role === 'couple' && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Follower Information *</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="followerFirstName">First Name *</Label>
                  <Input
                    id="followerFirstName"
                    value={formData.followerInfo.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, followerInfo: { ...prev.followerInfo, firstName: e.target.value } }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="followerLastName">Last Name *</Label>
                  <Input
                    id="followerLastName"
                    value={formData.followerInfo.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, followerInfo: { ...prev.followerInfo, lastName: e.target.value } }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="followerEmail">Email *</Label>
                  <Input
                    id="followerEmail"
                    type="email"
                    value={formData.followerInfo.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, followerInfo: { ...prev.followerInfo, email: e.target.value } }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="followerPhone">Phone *</Label>
                  <Input
                    id="followerPhone"
                    value={formData.followerInfo.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, followerInfo: { ...prev.followerInfo, phone: e.target.value } }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="followerCountry">Country *</Label>
                  <Input
                    id="followerCountry"
                    value={formData.followerInfo.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, followerInfo: { ...prev.followerInfo, country: e.target.value } }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="followerLevel">Experience Level *</Label>
                  <select
                    id="followerLevel"
                    value={formData.followerInfo.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, followerInfo: { ...prev.followerInfo, level: e.target.value } }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    required
                  >
                    <option value="">Select level</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Workshops */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Workshops</h3>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {workshops.map((workshop) => (
                <div key={workshop.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.workshopIds.includes(workshop.id)}
                    onCheckedChange={() => toggleWorkshop(workshop.id)}
                  />
                  <Label className="text-sm">
                    {workshop.title} - {workshop.instructor} ({workshop.date})
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Milongas (for custom package) */}
          {formData.packageType === 'custom' && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Milongas</h3>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {milongas.map((milonga: any) => (
                  <div key={milonga.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.milongaIds.includes(milonga.id)}
                      onCheckedChange={() => toggleMilonga(milonga.id)}
                    />
                    <Label className="text-sm">{milonga.name} - {milonga.date}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gala Dinner Table */}
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">Gala Dinner Table</h3>
            <select
              value={formData.selectedTableNumber?.toString() || ''}
              onChange={(e) => {
                if (e.target.value === '' || e.target.value === 'none') {
                  setFormData(prev => ({ ...prev, selectedTableNumber: undefined }));
                } else {
                  setFormData(prev => ({ ...prev, selectedTableNumber: parseInt(e.target.value) }));
                }
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">None</option>
              {tables?.map((table: any) => (
                <option key={table.id} value={table.tableNumber.toString()}>
                  Table {table.tableNumber} ({table.occupiedSeats}/{table.totalSeats} seats)
                </option>
              ))}
            </select>
          </div>

          {/* Addons */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Add-ons</h3>
            <div className="space-y-2">
              {addons.map((addon) => (
                <div key={addon.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.addons.some(a => a.id === addon.id)}
                      onCheckedChange={() => toggleAddon(addon.id)}
                    />
                    <Label className="text-sm">{addon.name} - AED {addon.price}</Label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <select
                id="paymentMethod"
                value={formData.paymentMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="offline">Offline</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <select
                id="paymentStatus"
                value={formData.paymentStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentStatus: e.target.value as any }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRegistrationMutation.isPending}>
              {createRegistrationMutation.isPending ? 'Creating...' : 'Create Registration'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


