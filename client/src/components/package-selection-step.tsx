import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowRight, Package, Star, Music, Users, MapPin, Utensils } from "lucide-react";
import { RegistrationData } from "@/pages/registration";
import { PackagePricingDisplay } from "./package-pricing-display";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface EventWithPricing {
  id: string;
  name: string;
  year: number;
  venue: string;
  startDate: string;
  endDate: string;
  registrationOpenDate: string;
  registrationCloseDate: string;
  description?: string;
  isActive: boolean;
  isCurrent: boolean;
  fullPackageStandardPrice?: number;
  fullPackageEarlyBirdPrice?: number;
  fullPackageEarlyBirdEndDate?: string;
  fullPackage24HourPrice?: number;
  fullPackage24HourStartDate?: string;
  fullPackage24HourEndDate?: string;
  eveningPackageStandardPrice?: number;
  eveningPackageEarlyBirdPrice?: number;
  eveningPackageEarlyBirdEndDate?: string;
  eveningPackage24HourPrice?: number;
  eveningPackage24HourStartDate?: string;
  eveningPackage24HourEndDate?: string;
  premiumAccommodation4NightsSinglePrice?: number;
  premiumAccommodation4NightsDoublePrice?: number;
  premiumAccommodation4NightsEarlyBirdSinglePrice?: number;
  premiumAccommodation4NightsEarlyBirdDoublePrice?: number;
  premiumAccommodation4NightsEarlyBirdEndDate?: string;
  premiumAccommodation3NightsSinglePrice?: number;
  premiumAccommodation3NightsDoublePrice?: number;
  premiumAccommodation3NightsEarlyBirdSinglePrice?: number;
  premiumAccommodation3NightsEarlyBirdDoublePrice?: number;
  premiumAccommodation3NightsEarlyBirdEndDate?: string;
}

interface PackageSelectionStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
}

interface AccommodationPricingDisplayProps {
  packageType: 'premium-accommodation-4nights' | 'premium-accommodation-3nights';
  currentEvent: EventWithPricing | undefined;
  className?: string;
}

function AccommodationPricingDisplay({ packageType, currentEvent, className }: AccommodationPricingDisplayProps) {
  if (!currentEvent) return null;

  const is4Nights = packageType === 'premium-accommodation-4nights';
  
  const singleStandardPrice = is4Nights
    ? Number(currentEvent.premiumAccommodation4NightsSinglePrice || 0)
    : Number(currentEvent.premiumAccommodation3NightsSinglePrice || 0);
  const doubleStandardPrice = is4Nights
    ? Number(currentEvent.premiumAccommodation4NightsDoublePrice || 0)
    : Number(currentEvent.premiumAccommodation3NightsDoublePrice || 0);
  const singleEarlyBirdPrice = is4Nights
    ? Number(currentEvent.premiumAccommodation4NightsEarlyBirdSinglePrice || 0)
    : Number(currentEvent.premiumAccommodation3NightsEarlyBirdSinglePrice || 0);
  const doubleEarlyBirdPrice = is4Nights
    ? Number(currentEvent.premiumAccommodation4NightsEarlyBirdDoublePrice || 0)
    : Number(currentEvent.premiumAccommodation3NightsEarlyBirdDoublePrice || 0);
  const earlyBirdEndDate = is4Nights
    ? currentEvent.premiumAccommodation4NightsEarlyBirdEndDate
    : currentEvent.premiumAccommodation3NightsEarlyBirdEndDate;

  if (!singleStandardPrice && !doubleStandardPrice) {
    return (
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Pricing not configured</p>
      </div>
    );
  }

  const now = new Date();
  const isEarlyBird = earlyBirdEndDate && 
    !isNaN(Date.parse(earlyBirdEndDate)) &&
    new Date(earlyBirdEndDate) > now &&
    (singleEarlyBirdPrice > 0 || doubleEarlyBirdPrice > 0);

  const displaySinglePrice = isEarlyBird && singleEarlyBirdPrice > 0 ? singleEarlyBirdPrice : singleStandardPrice;
  const displayDoublePrice = isEarlyBird && doubleEarlyBirdPrice > 0 ? doubleEarlyBirdPrice : doubleStandardPrice;

  return (
    <div className={`text-left ${className}`}>
      {isEarlyBird && (
        <div className="mb-2">
          <Badge variant="secondary" className="text-xs font-semibold bg-blue-100 text-blue-800">
            🐣 Early Bird Special
          </Badge>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-600 mb-1">Single Occupancy</div>
          {isEarlyBird && singleEarlyBirdPrice > 0 && (
            <div className="text-sm text-gray-500 line-through">
              AED {singleStandardPrice.toLocaleString()}
            </div>
          )}
          <div className={`text-lg font-bold ${isEarlyBird && singleEarlyBirdPrice > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
            AED {displaySinglePrice.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-600 mb-1">Double Occupancy</div>
          {isEarlyBird && doubleEarlyBirdPrice > 0 && (
            <div className="text-sm text-gray-500 line-through">
              AED {doubleStandardPrice.toLocaleString()}
            </div>
          )}
          <div className={`text-lg font-bold ${isEarlyBird && doubleEarlyBirdPrice > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
            AED {displayDoublePrice.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PackageSelectionStep({ data, onUpdate, onNext }: PackageSelectionStepProps) {
  const [selectedPackage, setSelectedPackage] = useState<'full' | 'evening' | 'custom' | 'premium-accommodation-4nights' | 'premium-accommodation-3nights'>(data.packageType || 'full');

  // Fetch current event with pricing configuration
  const { data: currentEvent } = useQuery<EventWithPricing>({
    queryKey: ['/api/events/current'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleNext = () => {
    onUpdate({ packageType: selectedPackage });
    onNext();
  };

  // Extract pricing configuration from current event
  const getPackagePricing = (packageType: 'full' | 'evening' | 'premium-accommodation-4nights' | 'premium-accommodation-3nights') => {
    if (!currentEvent) return null;
    
    if (packageType === 'full') {
      // Only return pricing if standard price is configured
      if (!currentEvent.fullPackageStandardPrice) return null;
      
      return {
        standardPrice: Number(currentEvent.fullPackageStandardPrice),
        earlyBirdPrice: Number(currentEvent.fullPackageEarlyBirdPrice) || 0,
        earlyBirdEndDate: currentEvent.fullPackageEarlyBirdEndDate ?? '',
        dealPrice: Number(currentEvent.fullPackage24HourPrice) || 0,
        dealStartDate: currentEvent.fullPackage24HourStartDate ?? '',
        dealEndDate: currentEvent.fullPackage24HourEndDate ?? ''
      };
    } else if (packageType === 'evening') {
      // Only return pricing if standard price is configured
      if (!currentEvent.eveningPackageStandardPrice) return null;
      
      return {
        standardPrice: Number(currentEvent.eveningPackageStandardPrice),
        earlyBirdPrice: Number(currentEvent.eveningPackageEarlyBirdPrice) || 0,
        earlyBirdEndDate: currentEvent.eveningPackageEarlyBirdEndDate ?? '',
        dealPrice: Number(currentEvent.eveningPackage24HourPrice) || 0,
        dealStartDate: currentEvent.eveningPackage24HourStartDate ?? '',
        dealEndDate: currentEvent.eveningPackage24HourEndDate ?? ''
      };
    } else if (packageType === 'premium-accommodation-4nights') {
      const isSingleOccupancy = data.role !== 'couple';
      const standardPrice = isSingleOccupancy 
        ? Number(currentEvent.premiumAccommodation4NightsSinglePrice || 0)
        : Number(currentEvent.premiumAccommodation4NightsDoublePrice || 0);
      const earlyBirdPrice = isSingleOccupancy
        ? Number(currentEvent.premiumAccommodation4NightsEarlyBirdSinglePrice || 0)
        : Number(currentEvent.premiumAccommodation4NightsEarlyBirdDoublePrice || 0);
      
      if (!standardPrice) return null;
      
      return {
        standardPrice,
        earlyBirdPrice,
        earlyBirdEndDate: currentEvent.premiumAccommodation4NightsEarlyBirdEndDate ?? '',
        dealPrice: 0, // No 24-hour deal for accommodation packages
        dealStartDate: '',
        dealEndDate: ''
      };
    } else if (packageType === 'premium-accommodation-3nights') {
      const isSingleOccupancy = data.role !== 'couple';
      const standardPrice = isSingleOccupancy 
        ? Number(currentEvent.premiumAccommodation3NightsSinglePrice || 0)
        : Number(currentEvent.premiumAccommodation3NightsDoublePrice || 0);
      const earlyBirdPrice = isSingleOccupancy
        ? Number(currentEvent.premiumAccommodation3NightsEarlyBirdSinglePrice || 0)
        : Number(currentEvent.premiumAccommodation3NightsEarlyBirdDoublePrice || 0);
      
      if (!standardPrice) return null;
      
      return {
        standardPrice,
        earlyBirdPrice,
        earlyBirdEndDate: currentEvent.premiumAccommodation3NightsEarlyBirdEndDate ?? '',
        dealPrice: 0, // No 24-hour deal for accommodation packages
        dealStartDate: '',
        dealEndDate: ''
      };
    }
    return null;
  };

  // Show loading or no event state
  if (!currentEvent) {
    return (
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Not Available</h2>
            <p className="text-gray-600">No festival event is currently configured. Please check back later when registration opens.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Package</h2>
          <p className="mt-2 text-gray-600">Select the perfect package for your Dubai Tango Festival experience</p>
        </div>

        <RadioGroup 
          value={selectedPackage} 
          onValueChange={(value: 'full' | 'evening' | 'custom' | 'premium-accommodation-4nights' | 'premium-accommodation-3nights') => setSelectedPackage(value)}
          className="space-y-6"
        >
          {/* Premium Package */}
          <div className="relative">
            <RadioGroupItem value="full" id="full" className="sr-only" />
            <Label 
              htmlFor="full" 
              className={`block cursor-pointer p-6 border-2 rounded-lg transition-all ${
                selectedPackage === 'full' 
                  ? 'border-green-600 bg-green-50 ring-2 ring-green-600 ring-opacity-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Star className="h-6 w-6 text-green-600" />
                    <h3 className="text-xl font-bold text-gray-900">Premium Package</h3>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>Up to 6 workshops included</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Music className="h-4 w-4 text-gray-400" />
                      <span>All milongas and social events</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Utensils className="h-4 w-4 text-gray-400" />
                      <span>Gala dinner included</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>Desert safari evening</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    Complete festival experience with workshops, social events, and gala dinner. 
                    Additional workshops beyond 6: AED 180 each.
                  </p>
                </div>
                
                <PackagePricingDisplay
                  packageType="full"
                  pricing={getPackagePricing('full')}
                  role={data.role}
                  className="ml-6"
                />
              </div>
            </Label>
          </div>

          {/* Premium + Accommodation Packages (4 Nights and 3 Nights in same row) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Premium + 4 Nights Accommodation */}
            <div className="relative">
              <RadioGroupItem value="premium-accommodation-4nights" id="premium-accommodation-4nights" className="sr-only" />
              <Label 
                htmlFor="premium-accommodation-4nights" 
                className={`block cursor-pointer p-6 border-2 rounded-lg transition-all h-full ${
                  selectedPackage === 'premium-accommodation-4nights' 
                    ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600 ring-opacity-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Star className="h-6 w-6 text-purple-600" />
                      <h3 className="text-xl font-bold text-gray-900">Premium Package + 4 Nights Accommodation</h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      Everything included in the Premium Package + 4 Nights of Accommodation
                    </p>
                  </div>
                  
                  <AccommodationPricingDisplay
                    packageType="premium-accommodation-4nights"
                    currentEvent={currentEvent}
                    className="mt-auto"
                  />
                </div>
              </Label>
            </div>

            {/* Premium + 3 Nights Accommodation */}
            <div className="relative">
              <RadioGroupItem value="premium-accommodation-3nights" id="premium-accommodation-3nights" className="sr-only" />
              <Label 
                htmlFor="premium-accommodation-3nights" 
                className={`block cursor-pointer p-6 border-2 rounded-lg transition-all h-full ${
                  selectedPackage === 'premium-accommodation-3nights' 
                    ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600 ring-opacity-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Star className="h-6 w-6 text-purple-600" />
                      <h3 className="text-xl font-bold text-gray-900">Premium Package + 3 Nights Accommodation</h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      Everything included in the Premium Package + 3 Nights of Accommodation
                    </p>
                  </div>
                  
                  <AccommodationPricingDisplay
                    packageType="premium-accommodation-3nights"
                    currentEvent={currentEvent}
                    className="mt-auto"
                  />
                </div>
              </Label>
            </div>
          </div>

          {/* Evening Package */}
          <div className="relative">
            <RadioGroupItem value="evening" id="evening" className="sr-only" />
            <Label 
              htmlFor="evening" 
              className={`block cursor-pointer p-6 border-2 rounded-lg transition-all ${
                selectedPackage === 'evening' 
                  ? 'border-orange-600 bg-orange-50 ring-2 ring-orange-600 ring-opacity-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="h-6 w-6 text-orange-600" />
                    <h3 className="text-xl font-bold text-gray-900">Evening Package</h3>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Music className="h-4 w-4 text-gray-400" />
                      <span>All milongas and social events</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Utensils className="h-4 w-4 text-gray-400" />
                      <span>Gala dinner included</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>Desert safari evening</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>Optional workshops available</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>Perfect for social dancers who want the festival atmosphere with optional workshop add-ons.</p>
                  </div>
                </div>
                
                <PackagePricingDisplay
                  packageType="evening"
                  pricing={getPackagePricing('evening')}
                  role={data.role}
                  className="ml-6"
                />
              </div>
            </Label>
          </div>

          {/* Custom Package */}
          <div className="relative">
            <RadioGroupItem value="custom" id="custom" className="sr-only" />
            <Label 
              htmlFor="custom" 
              className={`block cursor-pointer p-6 border-2 rounded-lg transition-all ${
                selectedPackage === 'custom' 
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-opacity-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="h-6 w-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Create Your Own Package</h3>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>Choose your own workshops</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Music className="h-4 w-4 text-gray-400" />
                      <span>Select milonga events individually</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <Utensils className="h-4 w-4 text-gray-400" />
                      <span>Optional gala dinner</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>Optional desert safari</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>Build your perfect festival experience by selecting exactly what you want to attend.</p>
                  </div>
                </div>
                
                <div className="text-right ml-6">
                  <div className="text-lg font-bold text-gray-900">
                    Pay as you choose
                  </div>
                  <div className="text-sm text-gray-500">
                    Build your package
                  </div>
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {/* Navigation */}
        <div className="flex justify-between pt-8">
          <div></div>
          <Button onClick={handleNext}>
            Continue to Personal Info <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}