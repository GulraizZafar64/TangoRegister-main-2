import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Users, Crown, Loader2, Minus } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import type { UploadResult } from "@uppy/core";

interface Table {
  id: string;
  tableNumber: number;
  totalSeats: number;
  occupiedSeats: number;
  isVip: boolean;
  price: string;
  earlyBirdPrice?: string | null;
  earlyBirdEndDate?: string | null;
  isActive: boolean;
}

interface LayoutSettings {
  id?: string;
  layoutImageUrl?: string | null;
}

interface AdminTableManagementProps {
  adminToken: string;
}

export function AdminTableManagement({ adminToken }: AdminTableManagementProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({
    tableNumber: "",
    totalSeats: "6",
    isVip: false,
    price: "0",
    earlyBirdPrice: "",
    earlyBirdEndDate: "",
  });

  const { data: tables = [], isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
    refetchInterval: 5000,
  });

  const { data: layoutSettings, isLoading: layoutLoading } = useQuery<LayoutSettings>({
    queryKey: ["/api/layout-settings"],
  });
  
  const formatCurrency = (value?: string | null) => {
    const numeric = value ? parseFloat(value) : 0;
    return `AED ${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Table occupancy management
  const updateOccupancyMutation = useMutation({
    mutationFn: async ({ tableId, occupiedSeats }: { tableId: string; occupiedSeats: number }) => {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ occupiedSeats }),
      });
      if (!response.ok) throw new Error("Failed to update table occupancy");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      toast({
        title: "Table Updated",
        description: "Table occupancy updated successfully.",
      });
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async (tableData: any) => {
      const response = await fetch("/api/tables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify(tableData),
      });
      if (!response.ok) throw new Error("Failed to create table");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      setShowAddDialog(false);
      resetForm();
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/tables/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update table");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      setEditingTable(null);
      resetForm();
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tables/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete table");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
    },
  });

  const updateLayoutMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch("/api/layout-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("Failed to update layout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layout-settings"] });
    },
  });

  const uploadLayoutImageMutation = useMutation({
    mutationFn: async (imageURL: string) => {
      const response = await fetch("/api/layout-image", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ imageURL }),
      });
      if (!response.ok) throw new Error("Failed to upload image");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/layout-settings"] });
    },
  });

  const resetForm = () => {
    setFormData({
      tableNumber: "",
      totalSeats: "6",
      isVip: false,
      price: "0",
      earlyBirdPrice: "",
      earlyBirdEndDate: "",
    });
  };

  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminToken}`,
      },
    });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        uploadLayoutImageMutation.mutate(uploadURL);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const tableData = {
      tableNumber: parseInt(formData.tableNumber),
      totalSeats: parseInt(formData.totalSeats),
      isVip: formData.isVip,
      price: formData.price || "0",
      earlyBirdPrice: formData.earlyBirdPrice || "0",
      earlyBirdEndDate: formData.earlyBirdEndDate || null,
      occupiedSeats: editingTable ? editingTable.occupiedSeats : 0,
      isActive: true,
    };

    if (editingTable) {
      updateTableMutation.mutate({ id: editingTable.id, updates: tableData });
    } else {
      createTableMutation.mutate(tableData);
    }
  };

  const handleEdit = (table: Table) => {
    setEditingTable(table);
    setFormData({
      tableNumber: table.tableNumber.toString(),
      totalSeats: table.totalSeats.toString(),
      isVip: table.isVip,
      price: table.price || "0",
      earlyBirdPrice: table.earlyBirdPrice || "",
      earlyBirdEndDate: table.earlyBirdEndDate ? table.earlyBirdEndDate.substring(0, 10) : "",
    });
  };

  const activeTables = tables.filter(table => table.isActive).sort((a, b) => a.tableNumber - b.tableNumber);

  if (tablesLoading || layoutLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Layout Management */}
      <Card>
        <CardHeader>
          <CardTitle>Seating Layout Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {layoutSettings?.layoutImageUrl ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img 
                  src={layoutSettings.layoutImageUrl}
                  alt="Current Seating Layout" 
                  className="max-w-sm h-auto rounded-lg border"
                />
              </div>
              <div className="text-center">
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={5242880} // 5MB
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleUploadComplete}
                  buttonClassName="w-auto"
                >
                  <span>Replace Layout Image</span>
                </ObjectUploader>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No layout image uploaded</p>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={5242880} // 5MB
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleUploadComplete}
                buttonClassName="w-auto"
              >
                <span>Upload Layout Image</span>
              </ObjectUploader>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Table Management</CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTables.map((table) => (
              <Card key={table.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Table {table.tableNumber}</span>
                      {table.isVip && <Crown className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(table)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTableMutation.mutate(table.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {table.isVip && (
                    <Badge variant="secondary" className="mb-2 bg-yellow-100 text-yellow-800">
                      VIP
                    </Badge>
                  )}
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{table.occupiedSeats} / {table.totalSeats} occupied</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Standard Price</div>
                      <div className="font-semibold">{formatCurrency(table.price)}</div>
                      {table.earlyBirdPrice && Number(table.earlyBirdPrice) > 0 && table.earlyBirdEndDate && (
                        <div className="text-xs text-amber-700">
                          Early Bird {formatCurrency(table.earlyBirdPrice)} until {new Date(table.earlyBirdEndDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {/* Occupancy Management */}
                    <div className="border-t pt-3">
                      <div className="text-xs font-medium text-gray-600 mb-2">Offline Bookings</div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={table.occupiedSeats === 0 || updateOccupancyMutation.isPending}
                          onClick={() => updateOccupancyMutation.mutate({ 
                            tableId: table.id, 
                            occupiedSeats: Math.max(0, table.occupiedSeats - 1) 
                          })}
                          className="px-2 py-1 h-6"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs px-2 min-w-[20px] text-center">{table.occupiedSeats}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={table.occupiedSeats >= table.totalSeats || updateOccupancyMutation.isPending}
                          onClick={() => updateOccupancyMutation.mutate({ 
                            tableId: table.id, 
                            occupiedSeats: Math.min(table.totalSeats, table.occupiedSeats + 1) 
                          })}
                          className="px-2 py-1 h-6"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateOccupancyMutation.isPending || table.occupiedSeats === table.totalSeats}
                          onClick={() => updateOccupancyMutation.mutate({ 
                            tableId: table.id, 
                            occupiedSeats: table.totalSeats 
                          })}
                          className="px-2 py-1 h-6 text-xs flex-1"
                        >
                          Mark Full
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateOccupancyMutation.isPending || table.occupiedSeats === 0}
                          onClick={() => updateOccupancyMutation.mutate({ 
                            tableId: table.id, 
                            occupiedSeats: 0 
                          })}
                          className="px-2 py-1 h-6 text-xs flex-1"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {activeTables.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tables available. Add some tables to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Table Dialog */}
      <Dialog open={showAddDialog || !!editingTable} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingTable(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable ? "Edit Table" : "Add New Table"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tableNumber">Table Number</Label>
              <Input
                id="tableNumber"
                type="number"
                value={formData.tableNumber}
                onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="totalSeats">Total Seats</Label>
              <Input
                id="totalSeats"
                type="number"
                value={formData.totalSeats}
                onChange={(e) => setFormData({ ...formData, totalSeats: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="price">Standard Price (AED)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="earlyBirdPrice">Early Bird Price (optional)</Label>
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
                <Label htmlFor="earlyBirdEndDate">Early Bird Ends</Label>
                <Input
                  id="earlyBirdEndDate"
                  type="date"
                  value={formData.earlyBirdEndDate}
                  onChange={(e) => setFormData({ ...formData, earlyBirdEndDate: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isVip"
                checked={formData.isVip}
                onChange={(e) => setFormData({ ...formData, isVip: e.target.checked })}
              />
              <Label htmlFor="isVip">VIP Table</Label>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={createTableMutation.isPending || updateTableMutation.isPending}
              >
                {(createTableMutation.isPending || updateTableMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingTable ? "Update Table" : "Add Table"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAddDialog(false);
                  setEditingTable(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}