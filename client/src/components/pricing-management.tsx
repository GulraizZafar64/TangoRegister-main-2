import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, Plus, Edit, Trash2 } from "lucide-react";

export function PricingManagement() {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("tiers");
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [workshopPricingForm, setWorkshopPricingForm] = useState({
    standardPrice: "",
    earlyBirdPrice: "",
    earlyBirdEndDate: "",
  });
  const [workshopPricingSaving, setWorkshopPricingSaving] = useState(false);
  const { toast } = useToast();

  // Fetch events
  const { data: events = [] } = useQuery<any[]>({ queryKey: ['/api/events'] });

  // Fetch pricing tiers for selected event
  const { data: pricingTiers = [], refetch: refetchTiers } = useQuery({
    queryKey: ['/api/events', selectedEventId, 'pricing-tiers'],
    enabled: !!selectedEventId
  });

  // Fetch package configurations for selected event
  const { data: packageConfigs = [], refetch: refetchPackages } = useQuery({
    queryKey: ['/api/events', selectedEventId, 'package-configurations'],
    enabled: !!selectedEventId
  });

  // Fetch active pricing tier
  const { data: activeTier } = useQuery<any>({
    queryKey: ['/api/events', selectedEventId, 'active-pricing-tier'],
    enabled: !!selectedEventId
  });

  // Set first event as selected by default
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  useEffect(() => {
    if (selectedEvent) {
      setWorkshopPricingForm({
        standardPrice: selectedEvent.workshopStandardPrice || "",
        earlyBirdPrice: selectedEvent.workshopEarlyBirdPrice || "",
        earlyBirdEndDate: selectedEvent.workshopEarlyBirdEndDate
          ? new Date(selectedEvent.workshopEarlyBirdEndDate).toISOString().substring(0, 10)
          : "",
      });
    } else {
      setWorkshopPricingForm({
        standardPrice: "",
        earlyBirdPrice: "",
        earlyBirdEndDate: "",
      });
    }
  }, [selectedEvent]);

  const handleSaveWorkshopPricing = async () => {
    if (!selectedEventId) return;
    setWorkshopPricingSaving(true);
    try {
      await apiRequest("PUT", `/api/events/${selectedEventId}`, {
        workshopStandardPrice: workshopPricingForm.standardPrice || "0",
        workshopEarlyBirdPrice: workshopPricingForm.earlyBirdPrice || "0",
        workshopEarlyBirdEndDate: workshopPricingForm.earlyBirdEndDate || null,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Workshop Pricing Updated",
        description: "Workshop pricing has been saved for the selected event.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update workshop pricing.",
        variant: "destructive",
      });
    } finally {
      setWorkshopPricingSaving(false);
    }
  };

  // Delete functions
  async function deletePricingTier(tierId: string) {
    try {
      await apiRequest("DELETE", `/api/pricing-tiers/${tierId}`);
      refetchTiers();
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'active-pricing-tier'] });
      toast({
        title: "Pricing Tier Deleted",
        description: "The pricing tier has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete pricing tier.",
        variant: "destructive",
      });
    }
  }

  async function deletePackageConfig(packageId: string) {
    try {
      await apiRequest("DELETE", `/api/package-configurations/${packageId}`);
      refetchPackages();
      toast({
        title: "Package Configuration Deleted",
        description: "The package configuration has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete package configuration.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Dynamic Pricing Management</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="event-select">Festival Year:</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-48" data-testid="select-event">
                <SelectValue placeholder="Select Festival Year" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event: any) => (
                  <SelectItem key={event.id} value={event.id} data-testid={`option-event-${event.id}`}>
                    {event.name} ({event.year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {selectedEventId && (
        <>
          {/* Active Pricing Display */}
          {activeTier && activeTier.name && (
            <Card className="bg-green-50 border-green-200" data-testid="active-pricing-tier">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Currently Active Pricing Tier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="font-medium text-green-900" data-testid="text-active-tier-name">{activeTier.name}</p>
                    <p className="text-sm text-green-700" data-testid="text-active-tier-description">{activeTier.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Discount</p>
                    <p className="font-medium text-green-900" data-testid="text-active-tier-discount">
                      {activeTier.discountPercentage > 0 ? `${activeTier.discountPercentage}%` : 
                       activeTier.discountAmount > 0 ? `AED ${activeTier.discountAmount}` : 'No discount'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Valid Until</p>
                    <p className="font-medium text-green-900" data-testid="text-active-tier-end-date">
                      {new Date(activeTier.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedEvent && (
            <Card>
              <CardHeader>
                <CardTitle>Workshop Pricing</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure default pricing for à la carte workshops and overage selections.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="workshopStandardPrice">Standard Price (AED)</Label>
                    <Input
                      id="workshopStandardPrice"
                      type="number"
                      step="0.01"
                      value={workshopPricingForm.standardPrice}
                      onChange={(e) => setWorkshopPricingForm(prev => ({ ...prev, standardPrice: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workshopEarlyBirdPrice">Early Bird Price (AED)</Label>
                    <Input
                      id="workshopEarlyBirdPrice"
                      type="number"
                      step="0.01"
                      value={workshopPricingForm.earlyBirdPrice}
                      onChange={(e) => setWorkshopPricingForm(prev => ({ ...prev, earlyBirdPrice: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workshopEarlyBirdEndDate">Early Bird Ends</Label>
                    <Input
                      id="workshopEarlyBirdEndDate"
                      type="date"
                      value={workshopPricingForm.earlyBirdEndDate}
                      onChange={(e) => setWorkshopPricingForm(prev => ({ ...prev, earlyBirdEndDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={handleSaveWorkshopPricing}
                    disabled={workshopPricingSaving}
                  >
                    {workshopPricingSaving ? "Saving..." : "Save Workshop Pricing"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Management Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tiers" data-testid="tab-pricing-tiers">Pricing Tiers</TabsTrigger>
              <TabsTrigger value="packages" data-testid="tab-package-configs">Package Configurations</TabsTrigger>
            </TabsList>

            {/* Pricing Tiers Tab */}
            <TabsContent value="tiers" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  Pricing Tiers - {selectedEvent?.name}
                </h3>
                <Button 
                  onClick={() => {
                    setEditingTier(null);
                    setShowTierDialog(true);
                  }}
                  data-testid="button-add-pricing-tier"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Pricing Tier
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.isArray(pricingTiers) && pricingTiers.map((tier: any) => (
                  <Card key={tier.id} className={!tier.isActive ? 'opacity-60' : ''} data-testid={`card-pricing-tier-${tier.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg" data-testid={`text-tier-name-${tier.id}`}>{tier.name}</CardTitle>
                        <Badge variant={tier.isActive ? "default" : "secondary"} data-testid={`badge-tier-status-${tier.id}`}>
                          {tier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600" data-testid={`text-tier-description-${tier.id}`}>{tier.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium">Duration</p>
                          <p className="text-sm text-gray-600" data-testid={`text-tier-duration-${tier.id}`}>
                            {new Date(tier.startDate).toLocaleDateString()} - {new Date(tier.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Discount</p>
                          <p className="text-sm text-gray-600" data-testid={`text-tier-discount-${tier.id}`}>
                            {tier.discountPercentage > 0 ? `${tier.discountPercentage}% off` : 
                             tier.discountAmount > 0 ? `AED ${tier.discountAmount} off` : 'No discount'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Priority</p>
                          <p className="text-sm text-gray-600" data-testid={`text-tier-priority-${tier.id}`}>{tier.priority || 0}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setEditingTier(tier);
                            setShowTierDialog(true);
                          }}
                          data-testid={`button-edit-tier-${tier.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600"
                          onClick={() => deletePricingTier(tier.id)}
                          data-testid={`button-delete-tier-${tier.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Package Configurations Tab */}
            <TabsContent value="packages" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  Package Configurations - {selectedEvent?.name}
                </h3>
                <Button 
                  onClick={() => {
                    setEditingPackage(null);
                    setShowPackageDialog(true);
                  }}
                  data-testid="button-add-package-config"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Package Configuration
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.isArray(packageConfigs) && packageConfigs.map((pkg: any) => (
                  <Card key={pkg.id} className={!pkg.isActive ? 'opacity-60' : ''} data-testid={`card-package-config-${pkg.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg" data-testid={`text-package-name-${pkg.id}`}>{pkg.name}</CardTitle>
                        <Badge variant={pkg.isActive ? "default" : "secondary"} data-testid={`badge-package-status-${pkg.id}`}>
                          {pkg.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600" data-testid={`text-package-description-${pkg.id}`}>{pkg.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Package Type</p>
                            <p className="text-sm text-gray-600 capitalize" data-testid={`text-package-type-${pkg.id}`}>{pkg.packageType}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Base Price</p>
                            <p className="text-sm text-gray-600" data-testid={`text-package-price-${pkg.id}`}>AED {pkg.basePrice}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Couple Multiplier</p>
                            <p className="text-sm text-gray-600" data-testid={`text-package-multiplier-${pkg.id}`}>{pkg.coupleMultiplier}x</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Included Workshops</p>
                            <p className="text-sm text-gray-600" data-testid={`text-package-workshops-${pkg.id}`}>{pkg.includedWorkshops}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Includes Milongas</p>
                            <p className="text-sm text-gray-600" data-testid={`text-package-milongas-${pkg.id}`}>{pkg.includedMilongas ? 'Yes' : 'No'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Includes Gala Dinner</p>
                            <p className="text-sm text-gray-600" data-testid={`text-package-gala-${pkg.id}`}>{pkg.includedGalaDinner ? 'Yes' : 'No'}</p>
                          </div>
                        </div>

                        {pkg.workshopOveragePrice > 0 && (
                          <div>
                            <p className="text-sm font-medium">Extra Workshop Price</p>
                            <p className="text-sm text-gray-600" data-testid={`text-package-overage-${pkg.id}`}>AED {pkg.workshopOveragePrice}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setEditingPackage(pkg);
                            setShowPackageDialog(true);
                          }}
                          data-testid={`button-edit-package-${pkg.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600"
                          onClick={() => deletePackageConfig(pkg.id)}
                          data-testid={`button-delete-package-${pkg.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Pricing Tier Dialog */}
      <PricingTierDialog 
        open={showTierDialog}
        onOpenChange={setShowTierDialog}
        tier={editingTier}
        eventId={selectedEventId}
        onSuccess={() => {
          refetchTiers();
          queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'active-pricing-tier'] });
          setShowTierDialog(false);
        }}
      />

      {/* Package Configuration Dialog */}
      <PackageConfigDialog 
        open={showPackageDialog}
        onOpenChange={setShowPackageDialog}
        package={editingPackage}
        eventId={selectedEventId}
        onSuccess={() => {
          refetchPackages();
          setShowPackageDialog(false);
        }}
      />
    </div>
  );
}

// PRICING TIER DIALOG COMPONENT
function PricingTierDialog({ open, onOpenChange, tier, eventId, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: tier?.name || "",
    description: tier?.description || "",
    startDate: tier?.startDate ? new Date(tier.startDate).toISOString().split('T')[0] : "",
    endDate: tier?.endDate ? new Date(tier.endDate).toISOString().split('T')[0] : "",
    discountPercentage: tier?.discountPercentage || 0,
    discountAmount: tier?.discountAmount || 0,
    priority: tier?.priority || 0,
    isActive: tier?.isActive !== false
  });
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = tier ? `/api/pricing-tiers/${tier.id}` : `/api/events/${eventId}/pricing-tiers`;
      const method = tier ? "PUT" : "POST";
      return apiRequest(method, url, {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate)
      });
    },
    onSuccess: () => {
      toast({
        title: tier ? "Pricing Tier Updated" : "Pricing Tier Created",
        description: tier ? "Pricing tier updated successfully." : "New pricing tier created successfully.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save pricing tier.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  // Reset form when tier changes
  useEffect(() => {
    if (tier) {
      setFormData({
        name: tier.name || "",
        description: tier.description || "",
        startDate: tier.startDate ? new Date(tier.startDate).toISOString().split('T')[0] : "",
        endDate: tier.endDate ? new Date(tier.endDate).toISOString().split('T')[0] : "",
        discountPercentage: tier.discountPercentage || 0,
        discountAmount: tier.discountAmount || 0,
        priority: tier.priority || 0,
        isActive: tier.isActive !== false
      });
    } else {
      setFormData({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        discountPercentage: 0,
        discountAmount: 0,
        priority: 0,
        isActive: true
      });
    }
  }, [tier]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-pricing-tier">
        <DialogHeader>
          <DialogTitle>{tier ? "Edit Pricing Tier" : "Create Pricing Tier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Tier Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Early Bird, Regular, 24-Hour Flash Sale"
              required
              data-testid="input-tier-name"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe this pricing tier..."
              data-testid="input-tier-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
                data-testid="input-tier-start-date"
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                required
                data-testid="input-tier-end-date"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
              <Input
                id="discountPercentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.discountPercentage}
                onChange={(e) => setFormData(prev => ({ ...prev, discountPercentage: parseFloat(e.target.value) || 0 }))}
                data-testid="input-tier-discount-percentage"
              />
            </div>
            <div>
              <Label htmlFor="discountAmount">Discount Amount (AED)</Label>
              <Input
                id="discountAmount"
                type="number"
                min="0"
                step="0.01"
                value={formData.discountAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
                data-testid="input-tier-discount-amount"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="priority">Priority (higher = applied first)</Label>
            <Input
              id="priority"
              type="number"
              min="0"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
              data-testid="input-tier-priority"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
              data-testid="checkbox-tier-active"
            />
            <Label htmlFor="isActive">Active Tier</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-tier">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-tier">
              {mutation.isPending ? "Saving..." : tier ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// PACKAGE CONFIGURATION DIALOG COMPONENT
function PackageConfigDialog({ open, onOpenChange, package: pkg, eventId, onSuccess }: any) {
  const [formData, setFormData] = useState({
    packageType: pkg?.packageType || "full",
    name: pkg?.name || "",
    description: pkg?.description || "",
    basePrice: pkg?.basePrice || 0,
    coupleMultiplier: pkg?.coupleMultiplier || 2.0,
    includedWorkshops: pkg?.includedWorkshops || 0,
    includedMilongas: pkg?.includedMilongas || false,
    includedGalaDinner: pkg?.includedGalaDinner || false,
    workshopOveragePrice: pkg?.workshopOveragePrice || 0,
    isActive: pkg?.isActive !== false,
    sortOrder: pkg?.sortOrder || 0
  });
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = pkg ? `/api/package-configurations/${pkg.id}` : `/api/events/${eventId}/package-configurations`;
      const method = pkg ? "PUT" : "POST";
      return apiRequest(method, url, data);
    },
    onSuccess: () => {
      toast({
        title: pkg ? "Package Updated" : "Package Created",
        description: pkg ? "Package configuration updated successfully." : "New package configuration created successfully.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save package configuration.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  // Reset form when package changes
  useEffect(() => {
    if (pkg) {
      setFormData({
        packageType: pkg.packageType || "full",
        name: pkg.name || "",
        description: pkg.description || "",
        basePrice: pkg.basePrice || 0,
        coupleMultiplier: pkg.coupleMultiplier || 2.0,
        includedWorkshops: pkg.includedWorkshops || 0,
        includedMilongas: pkg.includedMilongas || false,
        includedGalaDinner: pkg.includedGalaDinner || false,
        workshopOveragePrice: pkg.workshopOveragePrice || 0,
        isActive: pkg.isActive !== false,
        sortOrder: pkg.sortOrder || 0
      });
    } else {
      setFormData({
        packageType: "full",
        name: "",
        description: "",
        basePrice: 0,
        coupleMultiplier: 2.0,
        includedWorkshops: 0,
        includedMilongas: false,
        includedGalaDinner: false,
        workshopOveragePrice: 0,
        isActive: true,
        sortOrder: 0
      });
    }
  }, [pkg]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-package-config">
        <DialogHeader>
          <DialogTitle>{pkg ? "Edit Package Configuration" : "Create Package Configuration"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="packageType">Package Type</Label>
            <Select value={formData.packageType} onValueChange={(value) => setFormData(prev => ({ ...prev, packageType: value }))}>
              <SelectTrigger data-testid="select-package-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Premium Package</SelectItem>
                <SelectItem value="evening">Evening Package</SelectItem>
                <SelectItem value="custom">Custom Package</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="name">Package Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Full Festival Pass"
              required
              data-testid="input-package-name"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe this package..."
              data-testid="input-package-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="basePrice">Base Price (AED)</Label>
              <Input
                id="basePrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.basePrice}
                onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                required
                data-testid="input-package-base-price"
              />
            </div>
            <div>
              <Label htmlFor="coupleMultiplier">Couple Multiplier</Label>
              <Input
                id="coupleMultiplier"
                type="number"
                min="1"
                step="0.1"
                value={formData.coupleMultiplier}
                onChange={(e) => setFormData(prev => ({ ...prev, coupleMultiplier: parseFloat(e.target.value) || 2.0 }))}
                data-testid="input-package-couple-multiplier"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="includedWorkshops">Included Workshops</Label>
              <Input
                id="includedWorkshops"
                type="number"
                min="0"
                value={formData.includedWorkshops}
                onChange={(e) => setFormData(prev => ({ ...prev, includedWorkshops: parseInt(e.target.value) || 0 }))}
                data-testid="input-package-included-workshops"
              />
            </div>
            <div>
              <Label htmlFor="workshopOveragePrice">Extra Workshop Price (AED)</Label>
              <Input
                id="workshopOveragePrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.workshopOveragePrice}
                onChange={(e) => setFormData(prev => ({ ...prev, workshopOveragePrice: parseFloat(e.target.value) || 0 }))}
                data-testid="input-package-overage-price"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includedMilongas"
                checked={formData.includedMilongas}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includedMilongas: !!checked }))}
                data-testid="checkbox-package-milongas"
              />
              <Label htmlFor="includedMilongas">Includes All Milongas</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includedGalaDinner"
                checked={formData.includedGalaDinner}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includedGalaDinner: !!checked }))}
                data-testid="checkbox-package-gala"
              />
              <Label htmlFor="includedGalaDinner">Includes Gala Dinner</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
                data-testid="checkbox-package-active"
              />
              <Label htmlFor="isActive">Active Package</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              min="0"
              value={formData.sortOrder}
              onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
              data-testid="input-package-sort-order"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-package">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-package">
              {mutation.isPending ? "Saving..." : pkg ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}