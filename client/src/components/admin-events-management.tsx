import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Calendar, MapPin, Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Event, InsertEvent } from "@shared/schema";

interface AdminEventsManagementProps {
  adminToken: string;
}

export function AdminEventsManagement({ adminToken }: AdminEventsManagementProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  // Debug: Log state changes
  useEffect(() => {
    console.log("showAddDialog state:", showAddDialog);
  }, [showAddDialog]);
  
  const [formData, setFormData] = useState({
    name: "",
    year: new Date().getFullYear(),
    startDate: "",
    endDate: "",
    registrationOpenDate: "",
    registrationCloseDate: "",
    description: "",
    venue: "",
    isActive: true,
    isCurrent: false,
    // Premium Package Pricing
    fullPackageStandardPrice: 0,
    fullPackageEarlyBirdPrice: 0,
    fullPackageEarlyBirdEndDate: "",
    fullPackage24HourPrice: 0,
    fullPackage24HourStartDate: "",
    fullPackage24HourEndDate: "",
    // Evening Package Pricing
    eveningPackageStandardPrice: 0,
    eveningPackageEarlyBirdPrice: 0,
    eveningPackageEarlyBirdEndDate: "",
    eveningPackage24HourPrice: 0,
    eveningPackage24HourStartDate: "",
    eveningPackage24HourEndDate: "",
    // Premium + 4 Nights Accommodation Pricing
    premiumAccommodation4NightsSinglePrice: 0,
    premiumAccommodation4NightsDoublePrice: 0,
    premiumAccommodation4NightsEarlyBirdSinglePrice: 0,
    premiumAccommodation4NightsEarlyBirdDoublePrice: 0,
    premiumAccommodation4NightsEarlyBirdEndDate: "",
    // Premium + 3 Nights Accommodation Pricing
    premiumAccommodation3NightsSinglePrice: 0,
    premiumAccommodation3NightsDoublePrice: 0,
    premiumAccommodation3NightsEarlyBirdSinglePrice: 0,
    premiumAccommodation3NightsEarlyBirdDoublePrice: 0,
    premiumAccommodation3NightsEarlyBirdEndDate: "",
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const response = await fetch("/api/events", {
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create event");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both events queries in case new event is set as current
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/current"] });
      setShowAddDialog(false);
      resetForm();
      toast({
        title: "Event Created",
        description: "Event created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Event",
        description: error.message || "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update event");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both events queries to refresh pricing data immediately
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/current"] });
      setEditingEvent(null);
      resetForm();
      toast({
        title: "Event Updated",
        description: "Event updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Event",
        description: error.message || "Failed to update event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/events/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete event");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both queries in case current event was deleted
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/current"] });
      toast({
        title: "Event Deleted",
        description: "Event deleted successfully.",
      });
    },
  });

  const setCurrentEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/events/${id}/set-current`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to set current event");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both queries to immediately reflect new current event
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/current"] });
      toast({
        title: "Current Event Set",
        description: "Event set as current successfully.",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      year: new Date().getFullYear(),
      startDate: "",
      endDate: "",
      registrationOpenDate: "",
      registrationCloseDate: "",
      description: "",
      venue: "",
      isActive: true,
      isCurrent: false,
      // Premium Package Pricing
      fullPackageStandardPrice: 0,
      fullPackageEarlyBirdPrice: 0,
      fullPackageEarlyBirdEndDate: "",
      fullPackage24HourPrice: 0,
      fullPackage24HourStartDate: "",
      fullPackage24HourEndDate: "",
      // Evening Package Pricing
      eveningPackageStandardPrice: 0,
      eveningPackageEarlyBirdPrice: 0,
      eveningPackageEarlyBirdEndDate: "",
      eveningPackage24HourPrice: 0,
      eveningPackage24HourStartDate: "",
      eveningPackage24HourEndDate: "",
      // Premium + 4 Nights Accommodation Pricing
      premiumAccommodation4NightsSinglePrice: 0,
      premiumAccommodation4NightsDoublePrice: 0,
      premiumAccommodation4NightsEarlyBirdSinglePrice: 0,
      premiumAccommodation4NightsEarlyBirdDoublePrice: 0,
      premiumAccommodation4NightsEarlyBirdEndDate: "",
      // Premium + 3 Nights Accommodation Pricing
      premiumAccommodation3NightsSinglePrice: 0,
      premiumAccommodation3NightsDoublePrice: 0,
      premiumAccommodation3NightsEarlyBirdSinglePrice: 0,
      premiumAccommodation3NightsEarlyBirdDoublePrice: 0,
      premiumAccommodation3NightsEarlyBirdEndDate: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventData = {
      ...formData,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      registrationOpenDate: new Date(formData.registrationOpenDate),
      registrationCloseDate: new Date(formData.registrationCloseDate),
    };

    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, updates: eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      year: event.year,
      startDate: new Date(event.startDate).toISOString().split('T')[0],
      endDate: new Date(event.endDate).toISOString().split('T')[0],
      registrationOpenDate: new Date(event.registrationOpenDate).toISOString().split('T')[0],
      registrationCloseDate: new Date(event.registrationCloseDate).toISOString().split('T')[0],
      description: event.description || "",
      venue: event.venue,
      isActive: event.isActive,
      isCurrent: event.isCurrent,
      // Premium Package Pricing (default to 0 if not set)
      fullPackageStandardPrice: (event as any).fullPackageStandardPrice || 0,
      fullPackageEarlyBirdPrice: (event as any).fullPackageEarlyBirdPrice || 0,
      fullPackageEarlyBirdEndDate: (event as any).fullPackageEarlyBirdEndDate ? new Date((event as any).fullPackageEarlyBirdEndDate).toISOString().split('T')[0] : "",
      fullPackage24HourPrice: (event as any).fullPackage24HourPrice || 0,
      fullPackage24HourStartDate: (event as any).fullPackage24HourStartDate ? new Date((event as any).fullPackage24HourStartDate).toISOString().split('T')[0] : "",
      fullPackage24HourEndDate: (event as any).fullPackage24HourEndDate ? new Date((event as any).fullPackage24HourEndDate).toISOString().split('T')[0] : "",
      // Evening Package Pricing (default to 0 if not set)
      eveningPackageStandardPrice: (event as any).eveningPackageStandardPrice || 0,
      eveningPackageEarlyBirdPrice: (event as any).eveningPackageEarlyBirdPrice || 0,
      eveningPackageEarlyBirdEndDate: (event as any).eveningPackageEarlyBirdEndDate ? new Date((event as any).eveningPackageEarlyBirdEndDate).toISOString().split('T')[0] : "",
      eveningPackage24HourPrice: (event as any).eveningPackage24HourPrice || 0,
      eveningPackage24HourStartDate: (event as any).eveningPackage24HourStartDate ? new Date((event as any).eveningPackage24HourStartDate).toISOString().split('T')[0] : "",
      eveningPackage24HourEndDate: (event as any).eveningPackage24HourEndDate ? new Date((event as any).eveningPackage24HourEndDate).toISOString().split('T')[0] : "",
      // Premium + 4 Nights Accommodation Pricing
      premiumAccommodation4NightsSinglePrice: (event as any).premiumAccommodation4NightsSinglePrice || 0,
      premiumAccommodation4NightsDoublePrice: (event as any).premiumAccommodation4NightsDoublePrice || 0,
      premiumAccommodation4NightsEarlyBirdSinglePrice: (event as any).premiumAccommodation4NightsEarlyBirdSinglePrice || 0,
      premiumAccommodation4NightsEarlyBirdDoublePrice: (event as any).premiumAccommodation4NightsEarlyBirdDoublePrice || 0,
      premiumAccommodation4NightsEarlyBirdEndDate: (event as any).premiumAccommodation4NightsEarlyBirdEndDate ? new Date((event as any).premiumAccommodation4NightsEarlyBirdEndDate).toISOString().split('T')[0] : "",
      // Premium + 3 Nights Accommodation Pricing
      premiumAccommodation3NightsSinglePrice: (event as any).premiumAccommodation3NightsSinglePrice || 0,
      premiumAccommodation3NightsDoublePrice: (event as any).premiumAccommodation3NightsDoublePrice || 0,
      premiumAccommodation3NightsEarlyBirdSinglePrice: (event as any).premiumAccommodation3NightsEarlyBirdSinglePrice || 0,
      premiumAccommodation3NightsEarlyBirdDoublePrice: (event as any).premiumAccommodation3NightsEarlyBirdDoublePrice || 0,
      premiumAccommodation3NightsEarlyBirdEndDate: (event as any).premiumAccommodation3NightsEarlyBirdEndDate ? new Date((event as any).premiumAccommodation3NightsEarlyBirdEndDate).toISOString().split('T')[0] : "",
    });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading events...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Event Management</CardTitle>
          <Button onClick={() => {
            console.log("Add Event button clicked");
            setShowAddDialog(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Card key={event.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{event.name}</span>
                      {event.isCurrent && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(event)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteEventMutation.mutate(event.id)}
                        disabled={event.isCurrent}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <Badge variant={event.isCurrent ? "default" : "secondary"}>
                      {event.year} {event.isCurrent && "• CURRENT"}
                    </Badge>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(event.startDate)} - {formatDate(event.endDate)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{event.venue}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600">Registration:</p>
                      <p className="text-xs">{formatDate(event.registrationOpenDate)} - {formatDate(event.registrationCloseDate)}</p>
                    </div>
                    
                    {!event.isCurrent && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => setCurrentEventMutation.mutate(event.id)}
                        disabled={setCurrentEventMutation.isPending}
                      >
                        Set as Current
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {events.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No events available. Add some events to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Event Dialog */}
      <Dialog open={showAddDialog || !!editingEvent} onOpenChange={(open) => {
        console.log("Dialog onOpenChange triggered, open:", open, "showAddDialog:", showAddDialog, "editingEvent:", editingEvent);
        if (!open) {
          setShowAddDialog(false);
          setEditingEvent(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "Add New Event"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  required
                />
              </div>
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
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="registrationOpenDate">Registration Opens</Label>
                <Input
                  id="registrationOpenDate"
                  type="date"
                  value={formData.registrationOpenDate}
                  onChange={(e) => setFormData({ ...formData, registrationOpenDate: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="registrationCloseDate">Registration Closes</Label>
                <Input
                  id="registrationCloseDate"
                  type="date"
                  value={formData.registrationCloseDate}
                  onChange={(e) => setFormData({ ...formData, registrationCloseDate: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Package Pricing Configuration */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900">Package Pricing Configuration</h3>
              
              {/* Full Package Pricing */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-800 flex items-center">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-2">Premium Package</span>
                  Pricing Tiers
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-blue-50 p-3 rounded-lg">
                  <div>
                    <Label htmlFor="fullPackageStandardPrice" className="text-sm">Standard Price (AED)</Label>
                    <Input
                      id="fullPackageStandardPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.fullPackageStandardPrice}
                      onChange={(e) => setFormData({ ...formData, fullPackageStandardPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="1500"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fullPackageEarlyBirdPrice" className="text-sm">Early Bird Price (AED)</Label>
                    <Input
                      id="fullPackageEarlyBirdPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.fullPackageEarlyBirdPrice}
                      onChange={(e) => setFormData({ ...formData, fullPackageEarlyBirdPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="1200"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fullPackageEarlyBirdEndDate" className="text-sm">Early Bird End Date</Label>
                    <Input
                      id="fullPackageEarlyBirdEndDate"
                      type="date"
                      value={formData.fullPackageEarlyBirdEndDate}
                      onChange={(e) => setFormData({ ...formData, fullPackageEarlyBirdEndDate: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fullPackage24HourPrice" className="text-sm">24-Hour Deal (AED)</Label>
                    <Input
                      id="fullPackage24HourPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.fullPackage24HourPrice}
                      onChange={(e) => setFormData({ ...formData, fullPackage24HourPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="1000"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fullPackage24HourStartDate" className="text-sm">24-Hour Start Date</Label>
                    <Input
                      id="fullPackage24HourStartDate"
                      type="date"
                      value={formData.fullPackage24HourStartDate}
                      onChange={(e) => setFormData({ ...formData, fullPackage24HourStartDate: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="fullPackage24HourEndDate" className="text-sm">24-Hour End Date</Label>
                    <Input
                      id="fullPackage24HourEndDate"
                      type="date"
                      value={formData.fullPackage24HourEndDate}
                      onChange={(e) => setFormData({ ...formData, fullPackage24HourEndDate: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Evening Package Pricing */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-800 flex items-center">
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm mr-2">Evening Package</span>
                  Pricing Tiers
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-purple-50 p-3 rounded-lg">
                  <div>
                    <Label htmlFor="eveningPackageStandardPrice" className="text-sm">Standard Price (AED)</Label>
                    <Input
                      id="eveningPackageStandardPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.eveningPackageStandardPrice}
                      onChange={(e) => setFormData({ ...formData, eveningPackageStandardPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="800"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="eveningPackageEarlyBirdPrice" className="text-sm">Early Bird Price (AED)</Label>
                    <Input
                      id="eveningPackageEarlyBirdPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.eveningPackageEarlyBirdPrice}
                      onChange={(e) => setFormData({ ...formData, eveningPackageEarlyBirdPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="600"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="eveningPackageEarlyBirdEndDate" className="text-sm">Early Bird End Date</Label>
                    <Input
                      id="eveningPackageEarlyBirdEndDate"
                      type="date"
                      value={formData.eveningPackageEarlyBirdEndDate}
                      onChange={(e) => setFormData({ ...formData, eveningPackageEarlyBirdEndDate: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="eveningPackage24HourPrice" className="text-sm">24-Hour Deal (AED)</Label>
                    <Input
                      id="eveningPackage24HourPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.eveningPackage24HourPrice}
                      onChange={(e) => setFormData({ ...formData, eveningPackage24HourPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="500"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="eveningPackage24HourStartDate" className="text-sm">24-Hour Start Date</Label>
                    <Input
                      id="eveningPackage24HourStartDate"
                      type="date"
                      value={formData.eveningPackage24HourStartDate}
                      onChange={(e) => setFormData({ ...formData, eveningPackage24HourStartDate: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="eveningPackage24HourEndDate" className="text-sm">24-Hour End Date</Label>
                    <Input
                      id="eveningPackage24HourEndDate"
                      type="date"
                      value={formData.eveningPackage24HourEndDate}
                      onChange={(e) => setFormData({ ...formData, eveningPackage24HourEndDate: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Premium + 4 Nights Accommodation Pricing */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4 text-purple-600">Premium + 4 Nights Accommodation</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="premiumAccommodation4NightsSinglePrice" className="text-sm">Single Occupancy Price (AED)</Label>
                    <Input
                      id="premiumAccommodation4NightsSinglePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.premiumAccommodation4NightsSinglePrice}
                      onChange={(e) => setFormData({ ...formData, premiumAccommodation4NightsSinglePrice: parseFloat(e.target.value) || 0 })}
                      placeholder="3250"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="premiumAccommodation4NightsDoublePrice" className="text-sm">Double Occupancy Price (AED)</Label>
                    <Input
                      id="premiumAccommodation4NightsDoublePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.premiumAccommodation4NightsDoublePrice}
                      onChange={(e) => setFormData({ ...formData, premiumAccommodation4NightsDoublePrice: parseFloat(e.target.value) || 0 })}
                      placeholder="2730"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="premiumAccommodation4NightsEarlyBirdSinglePrice" className="text-sm">Early Bird Single (AED)</Label>
                    <Input
                      id="premiumAccommodation4NightsEarlyBirdSinglePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.premiumAccommodation4NightsEarlyBirdSinglePrice}
                      onChange={(e) => setFormData({ ...formData, premiumAccommodation4NightsEarlyBirdSinglePrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="premiumAccommodation4NightsEarlyBirdDoublePrice" className="text-sm">Early Bird Double (AED)</Label>
                    <Input
                      id="premiumAccommodation4NightsEarlyBirdDoublePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.premiumAccommodation4NightsEarlyBirdDoublePrice}
                      onChange={(e) => setFormData({ ...formData, premiumAccommodation4NightsEarlyBirdDoublePrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="premiumAccommodation4NightsEarlyBirdEndDate" className="text-sm">Early Bird End Date</Label>
                    <Input
                      id="premiumAccommodation4NightsEarlyBirdEndDate"
                      type="date"
                      value={formData.premiumAccommodation4NightsEarlyBirdEndDate}
                      onChange={(e) => setFormData({ ...formData, premiumAccommodation4NightsEarlyBirdEndDate: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Premium + 3 Nights Accommodation Pricing */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4 text-purple-600">Premium + 3 Nights Accommodation</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="premiumAccommodation3NightsSinglePrice" className="text-sm">Single Occupancy Price (AED)</Label>
                    <Input
                      id="premiumAccommodation3NightsSinglePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.premiumAccommodation3NightsSinglePrice}
                      onChange={(e) => setFormData({ ...formData, premiumAccommodation3NightsSinglePrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="premiumAccommodation3NightsDoublePrice" className="text-sm">Double Occupancy Price (AED)</Label>
                    <Input
                      id="premiumAccommodation3NightsDoublePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.premiumAccommodation3NightsDoublePrice}
                      onChange={(e) => setFormData({ ...formData, premiumAccommodation3NightsDoublePrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="premiumAccommodation3NightsEarlyBirdSinglePrice" className="text-sm">Early Bird Single (AED)</Label>
                    <Input
                      id="premiumAccommodation3NightsEarlyBirdSinglePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.premiumAccommodation3NightsEarlyBirdSinglePrice}
                      onChange={(e) => setFormData({ ...formData, premiumAccommodation3NightsEarlyBirdSinglePrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="premiumAccommodation3NightsEarlyBirdDoublePrice" className="text-sm">Early Bird Double (AED)</Label>
                    <Input
                      id="premiumAccommodation3NightsEarlyBirdDoublePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.premiumAccommodation3NightsEarlyBirdDoublePrice}
                      onChange={(e) => setFormData({ ...formData, premiumAccommodation3NightsEarlyBirdDoublePrice: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="premiumAccommodation3NightsEarlyBirdEndDate" className="text-sm">Early Bird End Date</Label>
                    <Input
                      id="premiumAccommodation3NightsEarlyBirdEndDate"
                      type="date"
                      value={formData.premiumAccommodation3NightsEarlyBirdEndDate}
                      onChange={(e) => setFormData({ ...formData, premiumAccommodation3NightsEarlyBirdEndDate: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Package Note */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm mr-2">Custom Package</span>
                  <span className="text-sm font-medium text-yellow-800">Dynamic Pricing</span>
                </div>
                <p className="text-xs text-yellow-700">
                  Priced based on selected workshops, milongas, and add-ons during registration.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={formData.isCurrent}
                  onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                />
                <Label htmlFor="isCurrent">Set as Current Event</Label>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
              >
                {(createEventMutation.isPending || updateEventMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingEvent ? "Update Event" : "Add Event"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAddDialog(false);
                  setEditingEvent(null);
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