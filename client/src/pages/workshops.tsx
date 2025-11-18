import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Calendar, Clock, CheckCircle } from "lucide-react";
import { Workshop } from "@shared/schema";
import { Link } from "wouter";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";

export default function Workshops() {
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>([]);
  const { currentEvent } = useCurrentEvent();

  const { data: workshops, isLoading } = useQuery<Workshop[]>({
    queryKey: ['/api/workshops'],
  });

  const levels = [
    { value: "all", label: "All Levels" },
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
    { value: "professional", label: "Professional" },
  ];

  const filteredWorkshops = workshops?.filter(workshop => 
    selectedLevel === "all" || workshop.level === selectedLevel
  ) || [];

  const handleWorkshopToggle = (workshopId: string) => {
    setSelectedWorkshops(prev => {
      if (prev.includes(workshopId)) {
        return prev.filter(id => id !== workshopId);
      } else {
        return [...prev, workshopId];
      }
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      case 'professional': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Registration
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Workshop Selection</h1>
                <p className="text-sm text-gray-500">
                  {currentEvent?.name || "Dubai Tango Festival"}{currentEvent?.year ? ` ${currentEvent.year}` : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Available Workshops</h2>
              <p className="mt-2 text-gray-600">Choose from our expert-led workshops across different skill levels</p>
            </div>

            {/* Level Filter */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {levels.map((level) => (
                  <Button
                    key={level.value}
                    variant={selectedLevel === level.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedLevel(level.value)}
                    className={selectedLevel === level.value ? "bg-red-700 hover:bg-red-800" : ""}
                  >
                    {level.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Workshop Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredWorkshops.map((workshop) => {
                const isSelected = selectedWorkshops.includes(workshop.id);
                const spotsLeft = workshop.capacity - (workshop.enrolled || 0);
                const hasEnoughSpots = spotsLeft > 0;
                
                return (
                  <div
                    key={workshop.id}
                    className={`border rounded-lg p-6 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-red-200 bg-red-50 shadow-md' 
                        : hasEnoughSpots 
                          ? 'border-gray-200 hover:shadow-lg hover:border-red-300' 
                          : 'border-gray-200 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => hasEnoughSpots && handleWorkshopToggle(workshop.id)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{workshop.title}</h3>
                          {isSelected && (
                            <CheckCircle className="h-6 w-6 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm font-medium text-red-600">{workshop.instructor}</p>
                      </div>
                      <Badge className={getLevelColor(workshop.level)}>
                        {workshop.level.charAt(0).toUpperCase() + workshop.level.slice(1)}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">{workshop.description}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{workshop.date}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{workshop.time}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        <span className={hasEnoughSpots ? "text-gray-600" : "text-red-600"}>
                          {spotsLeft}/{workshop.capacity} spots available
                        </span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        ${workshop.price}
                      </span>
                    </div>
                    
                    {!hasEnoughSpots && (
                      <div className="mt-2 text-xs text-red-600">
                        Workshop is full
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Workshops Summary */}
            {selectedWorkshops.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Selected Workshops ({selectedWorkshops.length})</h4>
                <div className="space-y-2">
                  {selectedWorkshops.map((workshopId) => {
                    const workshop = workshops?.find(w => w.id === workshopId);
                    if (!workshop) return null;
                    
                    return (
                      <div key={workshopId} className="flex justify-between items-center text-sm">
                        <span>{workshop.title}</span>
                        <span className="font-medium">${workshop.price}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total:</span>
                    <span>${selectedWorkshops.reduce((total, workshopId) => {
                      const workshop = workshops?.find(w => w.id === workshopId);
                      return total + parseFloat(workshop?.price || '0');
                    }, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <Link href="/">
                <Button className="bg-red-700 hover:bg-red-800">
                  Start Registration Process
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}