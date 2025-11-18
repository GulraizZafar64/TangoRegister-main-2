import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Star, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Event } from "@shared/schema";

interface YearSelectorProps {
  adminToken: string;
}

export function YearSelector({ adminToken }: YearSelectorProps) {
  const { toast } = useToast();
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const response = await fetch("/api/events", {
        headers: { "Authorization": `Bearer ${adminToken}` },
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (year: number) => {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: `Dubai Tango Festival ${year}`,
          year,
          startDate: new Date(`${year}-03-15`),
          endDate: new Date(`${year}-03-17`),
          registrationOpenDate: new Date(`${year}-01-01`),
          registrationCloseDate: new Date(`${year}-03-10`),
          description: `Annual Dubai Tango Festival ${year}`,
          venue: "Dubai World Trade Centre",
          isActive: true,
          isCurrent: events.length === 0,
        }),
      });
      if (!response.ok) throw new Error("Failed to create event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Festival Year Created",
        description: `Dubai Tango Festival ${newYear} created successfully.`,
      });
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/events/${eventId}/set-current`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${adminToken}` },
      });
      if (!response.ok) throw new Error("Failed to set current");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Current Festival Updated",
        description: "Users will now see this festival year during registration.",
      });
    },
  });

  const currentEvent = events.find(e => e.isCurrent);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Festival Year Management</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={newYear}
            onChange={(e) => setNewYear(parseInt(e.target.value))}
            className="w-20 px-2 py-1 border rounded text-sm"
            min={2020}
            max={2030}
            data-testid="input-new-year"
          />
          <Button
            size="sm"
            onClick={() => createEventMutation.mutate(newYear)}
            disabled={createEventMutation.isPending}
            data-testid="button-add-year"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Year
          </Button>
        </div>
      </div>

      {currentEvent && (
        <div className="mb-3 p-3 bg-green-100 border border-green-300 rounded flex items-center gap-2">
          <Star className="h-4 w-4 text-green-600 fill-current" />
          <span className="text-green-800 font-medium" data-testid="text-current-event">
            Current Festival: {currentEvent.name}
          </span>
          <span className="text-green-700 text-sm">
            ({new Date(currentEvent.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(currentEvent.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
          </span>
          <Badge variant="outline" className="text-green-700 border-green-400">
            Users see this during registration
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="p-3 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer"
            data-testid={`card-event-${event.year}`}
          >
            <div className="text-center">
              <div className="font-bold text-lg" data-testid={`text-year-${event.year}`}>
                {event.year}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {new Date(event.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(event.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </div>
              {event.isCurrent ? (
                <Badge className="text-xs bg-green-500" data-testid={`badge-current-${event.year}`}>
                  CURRENT
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-2 py-1 mt-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMutation.mutate(event.id);
                  }}
                  data-testid={`button-set-current-${event.year}`}
                >
                  Set Current
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-4 text-gray-600" data-testid="text-no-events">
          <p>No festival years created yet.</p>
          <p className="text-sm">Create your first year to get started!</p>
        </div>
      )}
    </div>
  );
}