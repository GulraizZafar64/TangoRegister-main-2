import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Users, Calendar, Clock, CheckCircle } from "lucide-react";
import { RegistrationData } from "@/pages/registration";
import { Workshop, Event } from "@shared/schema";

interface WorkshopSelectionStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrev: () => void;
  currentEvent?: Event | null;
}

export function WorkshopSelectionStep({ data, onUpdate, onNext, onPrev, currentEvent }: WorkshopSelectionStepProps) {
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>(data.workshopIds);
  const packagesWithIncludedWorkshops = new Set([
    'full',
    'premium-accommodation-4nights',
    'premium-accommodation-3nights'
  ]);
  const hasIncludedWorkshops = data.packageType ? packagesWithIncludedWorkshops.has(data.packageType) : false;
  const earlyBirdPriceValue = currentEvent?.workshopEarlyBirdPrice ? Number(currentEvent.workshopEarlyBirdPrice) : 0;
  const standardPriceValue = currentEvent?.workshopStandardPrice ? Number(currentEvent.workshopStandardPrice) : 0;
  const earlyBirdActive = earlyBirdPriceValue > 0 &&
    !!currentEvent?.workshopEarlyBirdEndDate &&
    new Date(currentEvent.workshopEarlyBirdEndDate) >= new Date();
  const getWorkshopPrice = (workshop: Workshop) => {
    const basePrice = parseFloat(workshop.price || "0");

    if (earlyBirdActive) {
      return earlyBirdPriceValue;
    }

    if (standardPriceValue > 0) {
      return standardPriceValue;
    }

    return basePrice;
  };

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
    const workshop = workshops?.find(w => w.id === workshopId);
    if (!workshop) return;

    // Check for time conflicts
    const conflictingWorkshop = workshops?.find(w => 
      selectedWorkshops.includes(w.id) && 
      w.date === workshop.date && 
      w.time === workshop.time &&
      w.id !== workshopId
    );

    if (conflictingWorkshop && !selectedWorkshops.includes(workshopId)) {
      alert(`Time conflict detected! You already selected "${conflictingWorkshop.title}" at ${workshop.time} on ${workshop.date}. Please choose a different workshop.`);
      return;
    }

    setSelectedWorkshops(prev => {
      if (prev.includes(workshopId)) {
        return prev.filter(id => id !== workshopId);
      } else {
        return [...prev, workshopId];
      }
    });
  };

  const calculateWorkshopTotal = () => {
    if (!workshops) return 0;
    
    const multiplier = data.role === 'couple' ? 2 : 1;
    const includedLimit = hasIncludedWorkshops ? 6 : 0;
    
    return selectedWorkshops.reduce((total, workshopId, index) => {
      if (hasIncludedWorkshops && index < includedLimit) {
        return total;
      }
      const workshop = workshops.find(w => w.id === workshopId);
      if (!workshop) return total;
      return total + getWorkshopPrice(workshop) * multiplier;
    }, 0);
  };

  const handleNext = () => {
    const workshopSelections = selectedWorkshops.map((workshopId) => {
      const workshop = workshops?.find(w => w.id === workshopId);
      return {
        id: workshopId,
        price: workshop ? getWorkshopPrice(workshop) : 0
      };
    });

    onUpdate({ 
      workshopIds: selectedWorkshops,
      workshopSelections
    });
    onNext();
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
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Select Workshops</h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Choose from our expert-led workshops across different skill levels</p>
          {hasIncludedWorkshops && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Premium Benefits:</strong> First 6 workshops are included in your package. Additional workshops will be billed at their listed price.
              </p>
            </div>
          )}
          {data.packageType === 'evening' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <p><strong>Evening Package:</strong></p>
                <p>Workshops are optional add-ons and will be charged at the current workshop rate.</p>
              </div>
            </div>
          )}
          {earlyBirdActive && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              Early bird workshop pricing of AED {earlyBirdPriceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} is active until {currentEvent?.workshopEarlyBirdEndDate ? new Date(currentEvent.workshopEarlyBirdEndDate).toLocaleDateString() : 'the specified deadline'}.
            </div>
          )}
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
                className={selectedLevel === level.value ? "bg-primary hover:bg-primary/90" : ""}
              >
                {level.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Workshop Cards with limited height and scroll */}
        <div className="max-h-80 sm:max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3 sm:p-4 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {filteredWorkshops.map((workshop) => {
            const isSelected = selectedWorkshops.includes(workshop.id);
            const multiplier = data.role === 'couple' ? 2 : 1;
            const selectionIndex = selectedWorkshops.indexOf(workshop.id);
            const includedSelection = hasIncludedWorkshops && selectionIndex > -1 && selectionIndex < 6;
            
            // Simplified availability check (no capacity display)
            const hasEnoughSpots = true; // Always allow selection
            
            return (
              <div
                key={workshop.id}
                className={`border rounded-lg p-4 sm:p-6 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-gray-200 hover:shadow-lg hover:border-primary/50'
                }`}
                onClick={() => handleWorkshopToggle(workshop.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{workshop.title}</h3>
                      {isSelected && (
                        <CheckCircle className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-primary">{workshop.instructor}</p>
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
                  <div className="text-gray-500 text-sm">
                    {/* No capacity display */}
                  </div>
                  <div className="text-right">
                    {hasIncludedWorkshops && includedSelection ? (
                      <span className="text-sm font-semibold text-green-600">Included</span>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">
                        AED {getWorkshopPrice(workshop).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {data.role === 'couple' && ' x2'}
                        {earlyBirdActive && (
                          <span className="ml-1 text-xs text-green-600">Early Bird</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                
              </div>
            );
          })}
          </div>
        </div>

        {/* Selected Workshops Summary */}
        {selectedWorkshops.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">Selected Workshops</h4>
            <div className="space-y-2">
              {selectedWorkshops.map((workshopId) => {
                const workshop = workshops?.find(w => w.id === workshopId);
                if (!workshop) return null;
                
                const multiplier = data.role === 'couple' ? 2 : 1;
                const price = getWorkshopPrice(workshop) * multiplier;
                
                const workshopIndex = selectedWorkshops.indexOf(workshopId);
                const isAdditional = hasIncludedWorkshops && workshopIndex >= 6;
                
                return (
                  <div key={workshopId} className="flex justify-between items-center text-sm">
                    <span>{workshop.title} {data.role === 'couple' && '(x2)'}</span>
                    <span className="font-medium">
                      {hasIncludedWorkshops && !isAdditional ? 'Included' : `AED ${price.toLocaleString()}`}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="flex justify-between items-center font-semibold">
                <span>Workshop Subtotal:</span>
                <span>AED {calculateWorkshopTotal().toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button 
            onClick={handleNext} 
            className="bg-primary hover:bg-primary/90"
          >
            Continue to {data.packageType === 'custom' ? 'Milongas' : 'Gala Dinner'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
