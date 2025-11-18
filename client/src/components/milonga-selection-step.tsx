import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type Milonga } from '@shared/schema';
import { type RegistrationData } from '../pages/registration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Music, MapPin, Clock, Users, Star, Palmtree } from 'lucide-react';

interface MilongaSelectionStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function MilongaSelectionStep({ data, onUpdate, onNext, onBack }: MilongaSelectionStepProps) {
  const [selectedMilongas, setSelectedMilongas] = useState<string[]>(data.milongaIds || []);

  const { data: milongas, isLoading } = useQuery<Milonga[]>({
    queryKey: ['/api/milongas'],
  });

  const handleMilongaToggle = (milongaId: string) => {
    const newSelection = selectedMilongas.includes(milongaId)
      ? selectedMilongas.filter(id => id !== milongaId)
      : [...selectedMilongas, milongaId];
    
    setSelectedMilongas(newSelection);
  };

  const getMilongaPrice = (milonga: Milonga) => {
    const now = new Date();
    const earlyBirdPrice = milonga.earlyBirdPrice ? parseFloat(milonga.earlyBirdPrice) : 0;
    const earlyBirdEndDate = milonga.earlyBirdEndDate;
    
    if (earlyBirdPrice > 0 && earlyBirdEndDate) {
      const endDate = new Date(earlyBirdEndDate);
      if (endDate >= now) {
        return earlyBirdPrice;
      }
    }
    
    return parseFloat(milonga.price);
  };

  const calculateMilongaTotal = () => {
    if (!milongas) return 0;
    const multiplier = data.role === 'couple' ? 2 : 1;
    return selectedMilongas.reduce((total, milongaId) => {
      const milonga = milongas.find(m => m.id === milongaId);
      return total + (milonga ? getMilongaPrice(milonga) * multiplier : 0);
    }, 0);
  };

  const handleNext = () => {
    onUpdate({ 
      milongaIds: selectedMilongas,
      milongaTotal: calculateMilongaTotal()
    });
    onNext();
  };

  const getMilongaIcon = (type: string) => {
    switch (type) {
      case 'gala':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'desert':
        return <Palmtree className="h-5 w-5 text-orange-500" />;
      default:
        return <Music className="h-5 w-5 text-blue-500" />;
    }
  };

  const getMilongaBadge = (type: string) => {
    switch (type) {
      case 'gala':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Gala Event</Badge>;
      case 'desert':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Desert Experience</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Regular Milonga</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Loading Milonga Events...</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Select Milonga Events</h2>
        <p className="mt-2 text-gray-600">
          Choose the milonga events you'd like to attend during the festival
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {milongas?.map((milonga) => {
          const isSelected = selectedMilongas.includes(milonga.id);
          const multiplier = data.role === 'couple' ? 2 : 1;
          // Remove capacity checks - always allow selection
          const isFull = false;
          const pricePerPerson = getMilongaPrice(milonga);
          const totalPrice = data.role === 'couple' ? pricePerPerson * 2 : pricePerPerson;
          const isEarlyBird = milonga.earlyBirdPrice && parseFloat(milonga.earlyBirdPrice) > 0 && 
                             milonga.earlyBirdEndDate && new Date(milonga.earlyBirdEndDate) >= new Date();
          const standardPrice = parseFloat(milonga.price);

          return (
            <Card
              key={milonga.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary bg-primary/5' 
                  : 'hover:shadow-md border-gray-200'
              } ${isFull ? 'opacity-60' : ''}`}
              onClick={() => !isFull && handleMilongaToggle(milonga.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getMilongaIcon(milonga.type)}
                    <div>
                      <CardTitle className="text-lg">{milonga.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getMilongaBadge(milonga.type)}
                      </div>
                    </div>
                  </div>
                  <Checkbox
                    checked={isSelected}
                    disabled={isFull}
                    className="mt-1 h-4 w-4"
                  />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <CardDescription className="text-sm leading-relaxed">
                  {milonga.description}
                </CardDescription>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{milonga.date} • {milonga.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{milonga.venue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-500 text-sm">
                      {/* No capacity display */}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        AED {totalPrice.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {data.role === 'couple' ? `AED ${pricePerPerson} per person` : 'per person'}
                      </div>
                      {isEarlyBird && pricePerPerson < standardPrice && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          Early Bird Price
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedMilongas.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <h3 className="font-semibold text-primary mb-2">Selected Events Summary</h3>
          <div className="space-y-1 text-sm text-primary/80">
            {selectedMilongas.map(milongaId => {
              const milonga = milongas?.find(m => m.id === milongaId);
              if (!milonga) return null;
              const pricePerPerson = getMilongaPrice(milonga);
              const totalPrice = data.role === 'couple' ? pricePerPerson * 2 : pricePerPerson;
              return (
                <div key={milongaId} className="flex justify-between">
                  <span>{milonga.name}</span>
                  <span>AED {totalPrice.toLocaleString()}</span>
                </div>
              );
            })}
            <div className="border-t border-primary/30 pt-2 font-semibold flex justify-between">
              <span>Total Milonga Events:</span>
              <span>AED {calculateMilongaTotal().toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          Continue to {selectedMilongas.includes('milonga-gala') ? 'Gala Dinner Seating' : 'Add-ons'}
        </Button>
      </div>
    </div>
  );
}