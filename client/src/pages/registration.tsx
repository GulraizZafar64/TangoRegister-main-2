import { useState } from "react";
import { ProgressIndicator } from "@/components/progress-indicator";
import { PackageSelectionStep } from "@/components/package-selection-step";
import { PersonalInfoStep } from "@/components/personal-info-step";
import { WorkshopSelectionStep } from "@/components/workshop-selection-step";
import { MilongaSelectionStep } from "@/components/milonga-selection-step";
import { GalaDinnerStep } from "@/components/gala-dinner-step";
import { AddonsStep } from "@/components/addons-step";
import { CheckoutStep } from "@/components/checkout-step";
import { Music } from "lucide-react";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { PackagePricingDisplay } from "@/components/package-pricing-display";

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  level: string;
}

export interface RegistrationData {
  packageType?: 'full' | 'evening' | 'custom' | 'premium-accommodation-4nights' | 'premium-accommodation-3nights';
  role?: 'leader' | 'follower' | 'couple';
  leaderInfo?: PersonalInfo;
  followerInfo?: PersonalInfo;
  workshopIds: string[];
  workshopSelections?: Array<{
    id: string;
    price: number;
  }>;
  seatIds: string[];
  milongaIds: string[];
  selectedTableNumber?: number;
  wantsWorkshops?: boolean;
  addons: Array<{
    id: string;
    quantity: number;
    price: string;
    options?: Record<string, string>;
    customImage?: string;
  }>;
  totalAmount: number;
  milongaTotal?: number;
  seatTotal?: number;
  addonsTotal?: number;
  agreedToTerms?: boolean;
}

const calculateTotal = (data: RegistrationData, currentEvent?: any): number => {
  const multiplier = data.role === 'couple' ? 2 : 1;
  const isSingleOccupancy = data.role !== 'couple';
  const now = new Date();
  const packagesWithIncludedWorkshops = new Set([
    'full',
    'premium-accommodation-4nights',
    'premium-accommodation-3nights'
  ]);
  const galaIncludedPackages = new Set([
    'full',
    'premium-accommodation-4nights',
    'premium-accommodation-3nights',
    'evening'
  ]);
  
  // Helper function to get current pricing for a package type
  const getPackagePrice = (packageType: 'full' | 'evening') => {
    if (!currentEvent) {
      return 0; // No fallback prices - return 0 if no event
    }
    
    if (packageType === 'full') {
      // Check 24-hour deal first
      if (currentEvent.fullPackage24HourStartDate && 
          currentEvent.fullPackage24HourEndDate && 
          currentEvent.fullPackage24HourPrice > 0) {
        const startDate = new Date(currentEvent.fullPackage24HourStartDate);
        const endDate = new Date(currentEvent.fullPackage24HourEndDate);
        if (now >= startDate && now <= endDate) {
          return Number(currentEvent.fullPackage24HourPrice);
        }
      }
      
      // Check early bird
      if (currentEvent.fullPackageEarlyBirdEndDate && 
          currentEvent.fullPackageEarlyBirdPrice > 0 && 
          new Date(currentEvent.fullPackageEarlyBirdEndDate) > now) {
        return Number(currentEvent.fullPackageEarlyBirdPrice);
      }
      
      // Standard price
      return Number(currentEvent.fullPackageStandardPrice) || 0;
    } else {
      // Evening package
      // Check 24-hour deal first
      if (currentEvent.eveningPackage24HourStartDate && 
          currentEvent.eveningPackage24HourEndDate && 
          currentEvent.eveningPackage24HourPrice > 0) {
        const startDate = new Date(currentEvent.eveningPackage24HourStartDate);
        const endDate = new Date(currentEvent.eveningPackage24HourEndDate);
        if (now >= startDate && now <= endDate) {
          return Number(currentEvent.eveningPackage24HourPrice);
        }
      }
      
      // Check early bird
      if (currentEvent.eveningPackageEarlyBirdEndDate && 
          currentEvent.eveningPackageEarlyBirdPrice > 0 && 
          new Date(currentEvent.eveningPackageEarlyBirdEndDate) > now) {
        return Number(currentEvent.eveningPackageEarlyBirdPrice);
      }
      
      // Standard price
      return Number(currentEvent.eveningPackageStandardPrice) || 0;
    }
  };

  // Helper function to get accommodation package pricing
  const getAccommodationPrice = (nights: 3 | 4) => {
    if (!currentEvent) return 0;
    
    const isEarlyBird = nights === 4
      ? (currentEvent.premiumAccommodation4NightsEarlyBirdEndDate && 
         new Date(currentEvent.premiumAccommodation4NightsEarlyBirdEndDate) > now)
      : (currentEvent.premiumAccommodation3NightsEarlyBirdEndDate && 
         new Date(currentEvent.premiumAccommodation3NightsEarlyBirdEndDate) > now);
    
    if (nights === 4) {
      if (isEarlyBird) {
        return isSingleOccupancy
          ? Number(currentEvent.premiumAccommodation4NightsEarlyBirdSinglePrice || 0)
          : Number(currentEvent.premiumAccommodation4NightsEarlyBirdDoublePrice || 0);
      }
      return isSingleOccupancy
        ? Number(currentEvent.premiumAccommodation4NightsSinglePrice || 0)
        : Number(currentEvent.premiumAccommodation4NightsDoublePrice || 0);
    } else {
      if (isEarlyBird) {
        return isSingleOccupancy
          ? Number(currentEvent.premiumAccommodation3NightsEarlyBirdSinglePrice || 0)
          : Number(currentEvent.premiumAccommodation3NightsEarlyBirdDoublePrice || 0);
      }
      return isSingleOccupancy
        ? Number(currentEvent.premiumAccommodation3NightsSinglePrice || 0)
        : Number(currentEvent.premiumAccommodation3NightsDoublePrice || 0);
    }
  };
  
  // Package base cost - use dynamic pricing
  let packageTotal = 0;
  if (data.packageType === 'full') {
    packageTotal = getPackagePrice('full') * multiplier;
  } else if (data.packageType === 'evening') {
    packageTotal = getPackagePrice('evening') * multiplier;
  } else if (data.packageType === 'premium-accommodation-4nights') {
    // Accommodation packages: price is already per person/couple, no multiplier needed
    packageTotal = getAccommodationPrice(4);
  } else if (data.packageType === 'premium-accommodation-3nights') {
    // Accommodation packages: price is already per person/couple, no multiplier needed
    packageTotal = getAccommodationPrice(3);
  }
  // Custom package has no base cost, everything is pay-as-you-go
  
  // Workshop costs
  let workshopTotal = 0;
  const workshopPrices = (data.workshopIds || []).map((workshopId) => {
    const selection = data.workshopSelections?.find((item) => item.id === workshopId);
    return selection?.price ?? 0;
  });
  const hasIncludedWorkshops = data.packageType ? packagesWithIncludedWorkshops.has(data.packageType) : false;
  const includedLimit = hasIncludedWorkshops ? 6 : 0;

  workshopPrices.forEach((price, index) => {
    if (hasIncludedWorkshops && index < includedLimit) {
      return;
    }
    workshopTotal += price * multiplier;
  });
  
  // Milonga costs (only for custom package, included in full/evening packages)
  let milongaTotal = 0;
  if (data.packageType === 'custom') {
    milongaTotal = data.milongaTotal || 0;
  }
  
  // Seat costs (gala dinner)
  let seatTotal = 0;
  if (!galaIncludedPackages.has(data.packageType || '')) {
    seatTotal = data.seatTotal || 0;
  }
  
  // Addon costs
  const addonTotal = data.addons?.reduce((total, addon) => {
    return total + (parseFloat(addon.price || '0') * addon.quantity);
  }, 0) || 0;
  
  return packageTotal + workshopTotal + milongaTotal + seatTotal + addonTotal;
};

export default function Registration() {
  const { currentEvent } = useCurrentEvent();
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    workshopIds: [],
    workshopSelections: [],
    seatIds: [],
    milongaIds: [],
    addons: [],
    totalAmount: 0,
    seatTotal: 0,
    agreedToTerms: false,
  });

  const updateRegistrationData = (updates: Partial<RegistrationData>) => {
    const newData = { ...registrationData, ...updates };
    const totalAmount = calculateTotal(newData, currentEvent);
    setRegistrationData({ ...newData, totalAmount });
  };

  const getMaxSteps = () => {
    return registrationData.packageType === 'custom' ? 7 : 6;
  };

  const nextStep = () => {
    if (currentStep < getMaxSteps()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const shouldShowMilongaStep = () => {
    return registrationData.packageType === 'custom';
  };

  const shouldShowGalaDinnerStep = () => {
    if (registrationData.packageType === 'custom') {
      // For custom package, only show gala dinner if Gala Milonga is selected
      return registrationData.milongaIds?.includes('milonga-gala');
    }
    // For full, evening, and accommodation packages, always show gala dinner
    return true;
  };

  const renderCurrentStep = () => {
    const isCustomPackage = registrationData.packageType === 'custom';
    const isPremiumOrAccommodation = registrationData.packageType === 'full' || 
                                      registrationData.packageType === 'premium-accommodation-4nights' || 
                                      registrationData.packageType === 'premium-accommodation-3nights';
    
    switch (currentStep) {
      case 1:
        return (
          <PackageSelectionStep
            data={registrationData}
            onUpdate={updateRegistrationData}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <PersonalInfoStep
            data={registrationData}
            onUpdate={updateRegistrationData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        // Evening package: Gala dinner first, then workshop prompt
        if (registrationData.packageType === 'evening') {
          return (
            <GalaDinnerStep
              data={registrationData}
              onUpdate={updateRegistrationData}
              onNext={nextStep}
            onPrev={prevStep}
            currentEvent={currentEvent}
            />
          );
        }
        // Premium, accommodation, and custom packages: Workshop selection
        // Note: Custom packages will branch to milonga selection at step 4
        return (
          <WorkshopSelectionStep
            data={registrationData}
            onUpdate={updateRegistrationData}
            onNext={nextStep}
            onPrev={prevStep}
            currentEvent={currentEvent}
          />
        );
      case 4:
        // For custom package: Milonga selection
        // For evening package: Workshop prompt or workshops
        // For premium and accommodation packages: Gala dinner
        if (isCustomPackage) {
          return (
            <MilongaSelectionStep
              data={registrationData}
              onUpdate={updateRegistrationData}
              onNext={nextStep}
              onBack={prevStep}
            />
          );
        } else if (registrationData.packageType === 'evening') {
          // Evening package: Show workshop selection if they want workshops
          if (registrationData.wantsWorkshops === true) {
            return (
              <WorkshopSelectionStep
                data={registrationData}
                onUpdate={updateRegistrationData}
                onNext={nextStep}
                onPrev={prevStep}
                currentEvent={currentEvent}
              />
            );
          } else {
            // Skip to addons if they don't want workshops
            return (
              <AddonsStep
                data={registrationData}
                onUpdate={updateRegistrationData}
                onNext={nextStep}
                onPrev={prevStep}
              />
            );
          }
        } else if (isPremiumOrAccommodation) {
          // Premium and accommodation packages: Gala dinner
          return (
            <GalaDinnerStep
              data={registrationData}
              onUpdate={updateRegistrationData}
              onNext={nextStep}
              onPrev={prevStep}
              currentEvent={currentEvent}
            />
          );
        } else {
          // Fallback (shouldn't happen)
          return null;
        }
      case 5:
        // For custom package: Conditional gala dinner or addons
        // For premium package: Addons
        // For evening package: Addons (after workshops or directly)
        if (isCustomPackage && shouldShowGalaDinnerStep()) {
          return (
            <GalaDinnerStep
              data={registrationData}
              onUpdate={updateRegistrationData}
              onNext={nextStep}
              onPrev={prevStep}
              currentEvent={currentEvent}
            />
          );
        } else {
          return (
            <AddonsStep
              data={registrationData}
              onUpdate={updateRegistrationData}
              onNext={nextStep}
              onPrev={prevStep}
            />
          );
        }
      case 6:
        // For custom package: Addons or checkout
        // For premium/evening/accommodation: Checkout
        if (isCustomPackage && shouldShowGalaDinnerStep()) {
          return (
            <AddonsStep
              data={registrationData}
              onUpdate={updateRegistrationData}
              onNext={nextStep}
              onPrev={prevStep}
            />
          );
        } else {
          return (
            <CheckoutStep
              data={registrationData}
              onUpdate={updateRegistrationData}
              onPrev={prevStep}
            />
          );
        }
      case 7:
        // Only for custom package with gala dinner
        return (
          <CheckoutStep
            data={registrationData}
            onUpdate={updateRegistrationData}
            onPrev={prevStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:h-16 gap-3 sm:gap-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center">
                <Music className="text-white h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">{currentEvent?.name}</h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  {currentEvent?.year && `${currentEvent.year} Registration Portal`}
                </p>
              </div>
            </div>
            {currentEvent && (
              <div className="text-left sm:text-right w-full sm:w-auto">
                <p className="text-sm font-medium text-gray-900">
                  {`${new Date(currentEvent.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} - ${new Date(currentEvent.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                </p>
                <p className="text-xs text-gray-500">{currentEvent.venue}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <ProgressIndicator currentStep={currentStep} packageType={registrationData.packageType} />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentStep()}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Music className="text-white h-4 w-4" />
              </div>
              <span className="text-xl font-bold">{currentEvent?.name || "Dubai Tango Festival"}</span>
            </div>
            <p className="text-gray-400 text-sm">For support, contact us at support@dubaitangofestival.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
