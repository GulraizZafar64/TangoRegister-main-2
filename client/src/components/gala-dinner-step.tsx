import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { RegistrationData } from "@/pages/registration";
import { GalaDinnerTables } from "./gala-dinner-tables";
import type { Table, Event } from "@shared/schema";

interface GalaDinnerStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrev: () => void;
  currentEvent?: Event | null;
}

export function GalaDinnerStep({ data, onUpdate, onNext, onPrev, currentEvent }: GalaDinnerStepProps) {
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | undefined>(
    data.selectedTableNumber
  );
  const [wantsWorkshops, setWantsWorkshops] = useState<boolean | null>(data.wantsWorkshops ?? null);
  const galaIncludedPackages = new Set([
    'full',
    'premium-accommodation-4nights',
    'premium-accommodation-3nights',
    'evening'
  ]);
  const galaIncluded = data.packageType ? galaIncludedPackages.has(data.packageType) : false;
  const { data: tables = [] } = useQuery<Table[]>({ queryKey: ["/api/tables"] });
  const seatsMultiplier = data.role === 'couple' ? 2 : 1;
  const galaSubtitle = currentEvent
    ? `${currentEvent.venue} • ${new Date(currentEvent.startDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
    : 'Venue and timing will be shared closer to the festival.';

  const computePerSeatPrice = (tableNumber?: number) => {
    if (!tableNumber) return 0;
    const table = tables.find(t => t.tableNumber === tableNumber);
    if (!table) return 0;
    const basePrice = parseFloat(table.price || "0");
    const earlyBirdPrice = table.earlyBirdPrice ? parseFloat(table.earlyBirdPrice) : 0;
    const earlyBirdActive = table.earlyBirdEndDate ? new Date(table.earlyBirdEndDate) >= new Date() : false;
    return earlyBirdActive && earlyBirdPrice > 0 ? earlyBirdPrice : basePrice;
  };
  const computeSeatCharge = (tableNumber?: number) => {
    if (galaIncluded || data.packageType !== 'custom') {
      return 0;
    }
    const perSeatPrice = computePerSeatPrice(tableNumber);
    if (!perSeatPrice) return 0;
    return perSeatPrice * seatsMultiplier;
  };

  const calculateGalaDinnerTotal = () => computeSeatCharge(selectedTableNumber);

  const handleTableSelectionChange = (tableNumber: number | undefined) => {
    setSelectedTableNumber(tableNumber);
    onUpdate({ 
      selectedTableNumber: tableNumber,
      seatTotal: computeSeatCharge(tableNumber)
    });
  };

  const handleWorkshopPreference = (value: boolean) => {
    setWantsWorkshops(value);
    if (!value) {
      onUpdate({
        wantsWorkshops: value,
        workshopIds: [],
        workshopSelections: [],
      });
    } else {
      onUpdate({ wantsWorkshops: value });
    }
  };

  useEffect(() => {
    if (selectedTableNumber) {
      onUpdate({
        seatTotal: computeSeatCharge(selectedTableNumber)
      });
    }
  }, [tables, selectedTableNumber, seatsMultiplier, galaIncluded, data.packageType, onUpdate]);

  const handleNext = () => {
    onUpdate({ 
      selectedTableNumber,
      seatTotal: calculateGalaDinnerTotal(),
      ...(data.packageType === 'evening' && wantsWorkshops !== null && { wantsWorkshops }),
      ...(data.packageType === 'evening' && wantsWorkshops === false && { workshopIds: [], workshopSelections: [] })
    });
    onNext();
  };

  const getGalaDinnerLabel = () => {
    if (galaIncluded) {
      return 'Provided with Package';
    }
    return 'Optional Add-on';
  };

  const canProceed = () => {
    if (galaIncluded) {
      if (data.packageType === 'evening') {
        return selectedTableNumber !== undefined && wantsWorkshops !== null;
      }
      return selectedTableNumber !== undefined;
    }
    
    // For custom packages, they can proceed with or without gala dinner
    return true;
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gala Dinner Seating</h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            {data.packageType === 'custom' 
              ? 'Select your preferred table for the festival gala dinner (optional)' 
              : 'Select your preferred table for the festival gala dinner'
            }
          </p>
        </div>

        {/* Package Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Info className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Gala Dinner: {getGalaDinnerLabel()}
              </p>
              <p className="text-xs text-blue-700">
                {galaSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Table Selection */}
        {data.role && (
          <GalaDinnerTables 
            role={data.role}
            selectedTableNumber={selectedTableNumber}
            onSelectionChange={handleTableSelectionChange}
            className="mb-8"
            showPrice={data.packageType === 'custom'}
          />
        )}

        {/* Workshop prompt for Evening package */}
        {data.packageType === 'evening' && selectedTableNumber && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-3">
              <Info className="h-5 w-5 text-orange-600 mr-2" />
              <p className="text-sm font-medium text-orange-800">
                Would you like to attend any workshops?
              </p>
            </div>
            <p className="text-xs text-orange-700 mb-4">
              Evening package includes gala dinner and milongas. Workshops can be added separately.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={wantsWorkshops === true ? "default" : "outline"}
                size="sm"
                onClick={() => handleWorkshopPreference(true)}
                className={wantsWorkshops === true ? "bg-orange-600 hover:bg-orange-700" : "border-orange-300 text-orange-700 hover:bg-orange-50"}
              >
                Yes, show workshops
              </Button>
              <Button
                type="button"
                variant={wantsWorkshops === false ? "default" : "outline"}
                size="sm"
                onClick={() => handleWorkshopPreference(false)}
                className={wantsWorkshops === false ? "bg-orange-600 hover:bg-orange-700" : "border-orange-300 text-orange-700 hover:bg-orange-50"}
              >
                No, skip workshops
              </Button>
            </div>
          </div>
        )}

        {/* Package-specific messaging */}
        {data.packageType === 'custom' && !selectedTableNumber && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> You can skip the gala dinner and proceed to the next step, 
              or select a table to add it to your custom package.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}