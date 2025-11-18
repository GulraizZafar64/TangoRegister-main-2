import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Star, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Event } from "@shared/schema";

interface AdminEventSelectorProps {
  adminToken: string;
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export function AdminEventSelector({ adminToken, selectedEventId, onEventSelect }: AdminEventSelectorProps) {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEventYear, setNewEventYear] = useState(new Date().getFullYear() + 1);

  const { data: events = [], isLoading } = useQuery<Event[]>({
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
    mutationFn: async (year: number) => {
      const eventData = {
        name: `Dubai Tango Festival ${year}`,
        year,
        startDate: new Date(`${year}-03-15`),
        endDate: new Date(`${year}-03-17`),
        registrationOpenDate: new Date(`${year}-01-01`),
        registrationCloseDate: new Date(`${year}-03-10`),
        description: `The premier tango festival in Dubai ${year}`,
        venue: "Dubai World Trade Centre",
        isActive: true,
        isCurrent: false,
      };
      
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) throw new Error("Failed to create event");
      return response.json();
    },
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      onEventSelect(newEvent.id);
      setShowCreateForm(false);
      toast({
        title: "Event Created",
        description: `${newEvent.name} created successfully.`,
      });
    },
  });

  const setCurrentEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/events/${eventId}/set-current`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to set current event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Current Event Updated",
        description: "Event set as current for public registration.",
      });
    },
  });

  const currentEvent = events.find(e => e.isCurrent);
  const selectedEvent = events.find(e => e.id === selectedEventId);

  if (isLoading) {
    return <div className="text-center py-4">Loading events...</div>;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Management
          </span>
          <Button 
            size="sm" 
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Year
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Event Status */}
        {currentEvent && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-green-600 fill-current" />
              <span className="font-medium text-green-800">
                Current Public Event: {currentEvent.name}
              </span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              This is what users see during registration
            </p>
          </div>
        )}

        {/* Event Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Admin View - Select Event to Manage:</label>
          <div className="flex gap-2">
            <Select value={selectedEventId || ""} onValueChange={onEventSelect}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select an event year to manage" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center gap-2">
                      <span>{event.name}</span>
                      {event.isCurrent && <Badge variant="default" className="text-xs">CURRENT</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedEvent && !selectedEvent.isCurrent && (
              <Button
                variant="outline"
                onClick={() => setCurrentEventMutation.mutate(selectedEvent.id)}
                disabled={setCurrentEventMutation.isPending}
              >
                Set as Current
              </Button>
            )}
          </div>
        </div>

        {/* Quick Create Form */}
        {showCreateForm && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm font-medium">Create event for year:</label>
              <input
                type="number"
                value={newEventYear}
                onChange={(e) => setNewEventYear(parseInt(e.target.value))}
                className="w-24 px-2 py-1 border rounded text-sm"
                min={2020}
                max={2030}
              />
              <Button
                size="sm"
                onClick={() => createEventMutation.mutate(newEventYear)}
                disabled={createEventMutation.isPending}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-gray-600">
              This will create a new festival year with default dates. You can customize it later.
            </p>
          </div>
        )}

        {/* Event List */}
        {events.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">All Events:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedEventId === event.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => onEventSelect(event.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{event.year}</span>
                    {event.isCurrent && (
                      <Badge variant="default" className="text-xs">CURRENT</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{event.venue}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}