import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Lock, CreditCard, University } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { RegistrationData } from "@/pages/registration";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Workshop, Seat, Addon, Milonga, Table } from "@shared/schema";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface CheckoutStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onPrev: () => void;
}

function CheckoutForm({ data, onComplete }: { data: RegistrationData; onComplete: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Mark stripe payment as completed on backend
        const urlParams = new URLSearchParams(window.location.search);
        const registrationId = urlParams.get('registrationId') || localStorage.getItem('currentRegistrationId');
        
        if (registrationId) {
          try {
            await apiRequest("PUT", `/api/registrations/${registrationId}/payment`, {
              paymentStatus: 'completed'
            });
          } catch (error) {
            console.error('Failed to update payment status:', error);
          }
        }
        
        toast({
          title: "Payment Successful",
          description: "Your registration has been completed!",
        });
        
        if (registrationId) {
          window.location.href = `/confirmation?id=${registrationId}`;
        } else {
          onComplete();
        }
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <div className="w-full">
        <PaymentElement />
      </div>
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Complete Registration
          </>
        )}
      </Button>
    </form>
  );
}

export function CheckoutStep({ data, onUpdate, onPrev }: CheckoutStepProps) {
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'offline'>('stripe');
  const [agreedToTerms, setAgreedToTerms] = useState(data.agreedToTerms ?? false);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentEvent } = useCurrentEvent();

  const { data: workshops } = useQuery<Workshop[]>({ queryKey: ['/api/workshops'] });
  const { data: seats } = useQuery<Seat[]>({ queryKey: ['/api/seats'] });
  const { data: addons } = useQuery<Addon[]>({ queryKey: ['/api/addons'] });
  const { data: milongas } = useQuery<Milonga[]>({ queryKey: ['/api/milongas'] });
  const { data: tables } = useQuery<Table[]>({ queryKey: ['/api/tables'] });
  const formatCurrency = (value: number) =>
    `AED ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    setAgreedToTerms(data.agreedToTerms ?? false);
  }, [data.agreedToTerms]);

  const handleTermsChange = (checked: boolean) => {
    setAgreedToTerms(checked);
    onUpdate({ agreedToTerms: checked });
  };

  const isGalaIncluded = data.packageType === 'full' || 
    data.packageType === 'premium-accommodation-4nights' || 
    data.packageType === 'premium-accommodation-3nights' ||
    data.packageType === 'evening';

  const getTablePricingDetails = () => {
    if (!data.selectedTableNumber) return null;
    const table = tables?.find(t => t.tableNumber === data.selectedTableNumber);
    if (!table) return { included: isGalaIncluded, amount: 0, isEarlyBird: false };
    const earlyBirdPrice = table.earlyBirdPrice ? parseFloat(table.earlyBirdPrice) : 0;
    const earlyBirdActive = table.earlyBirdEndDate ? new Date(table.earlyBirdEndDate) >= new Date() : false;
    const basePrice = parseFloat(table.price || "0");
    const perSeat = earlyBirdActive && earlyBirdPrice > 0 ? earlyBirdPrice : basePrice;
    const multiplier = data.role === 'couple' ? 2 : 1;
    return {
      included: isGalaIncluded,
      amount: perSeat * multiplier,
      isEarlyBird: earlyBirdActive && earlyBirdPrice > 0
    };
  };

  const tablePricing = getTablePricingDetails();

  const workshopEntries = (data.workshopIds || []).map((workshopId) => {
    const selection = data.workshopSelections?.find(item => item.id === workshopId);
    const workshop = workshops?.find(w => w.id === workshopId);
    const price = selection?.price ?? (workshop ? parseFloat(workshop.price) : 0);
    return { id: workshopId, price };
  });

  const workshopMultiplier = data.role === 'couple' ? 2 : 1;
  const WORKSHOPS_INCLUDED_LIMIT = 6;
  const workshopAllowancePackages = new Set(['full', 'premium-accommodation-4nights', 'premium-accommodation-3nights']);
  const hasWorkshopAllowance = data.packageType ? workshopAllowancePackages.has(data.packageType) : false;
  const additionalWorkshopEntries = hasWorkshopAllowance ? workshopEntries.slice(WORKSHOPS_INCLUDED_LIMIT) : workshopEntries;
  const additionalWorkshopsTotal = additionalWorkshopEntries.reduce((sum, entry) => sum + entry.price * workshopMultiplier, 0);
  const totalWorkshopCharge = workshopEntries.reduce((sum, entry) => sum + entry.price * workshopMultiplier, 0);


  // Helper function to get package price for display
  const getPackagePriceDisplay = () => {
    if (!currentEvent || data.packageType === 'custom') return null;
    
    const multiplier = data.role === 'couple' ? 2 : 1;
    const isSingleOccupancy = data.role !== 'couple';
    const now = new Date();
    
    if (data.packageType === 'full') {
      // Check 24-hour deal first
      if (currentEvent.fullPackage24HourStartDate && 
          currentEvent.fullPackage24HourEndDate && 
          currentEvent.fullPackage24HourPrice > 0) {
        const startDate = new Date(currentEvent.fullPackage24HourStartDate);
        const endDate = new Date(currentEvent.fullPackage24HourEndDate);
        if (now >= startDate && now <= endDate) {
          return Number(currentEvent.fullPackage24HourPrice) * multiplier;
        }
      }
      
      // Check early bird
      if (currentEvent.fullPackageEarlyBirdEndDate && 
          currentEvent.fullPackageEarlyBirdPrice > 0 && 
          new Date(currentEvent.fullPackageEarlyBirdEndDate) > now) {
        return Number(currentEvent.fullPackageEarlyBirdPrice) * multiplier;
      }
      
      // Standard price
      return Number(currentEvent.fullPackageStandardPrice || 0) * multiplier;
    } else if (data.packageType === 'evening') {
      // Check 24-hour deal first
      if (currentEvent.eveningPackage24HourStartDate && 
          currentEvent.eveningPackage24HourEndDate && 
          currentEvent.eveningPackage24HourPrice > 0) {
        const startDate = new Date(currentEvent.eveningPackage24HourStartDate);
        const endDate = new Date(currentEvent.eveningPackage24HourEndDate);
        if (now >= startDate && now <= endDate) {
          return Number(currentEvent.eveningPackage24HourPrice) * multiplier;
        }
      }
      
      // Check early bird
      if (currentEvent.eveningPackageEarlyBirdEndDate && 
          currentEvent.eveningPackageEarlyBirdPrice > 0 && 
          new Date(currentEvent.eveningPackageEarlyBirdEndDate) > now) {
        return Number(currentEvent.eveningPackageEarlyBirdPrice) * multiplier;
      }
      
      // Standard price
      return Number(currentEvent.eveningPackageStandardPrice || 0) * multiplier;
    } else if (data.packageType === 'premium-accommodation-4nights') {
      const isEarlyBird = currentEvent.premiumAccommodation4NightsEarlyBirdEndDate && 
                          new Date(currentEvent.premiumAccommodation4NightsEarlyBirdEndDate) > now;
      
      if (isEarlyBird) {
        return isSingleOccupancy
          ? Number(currentEvent.premiumAccommodation4NightsEarlyBirdSinglePrice || 0)
          : Number(currentEvent.premiumAccommodation4NightsEarlyBirdDoublePrice || 0);
      }
      return isSingleOccupancy
        ? Number(currentEvent.premiumAccommodation4NightsSinglePrice || 0)
        : Number(currentEvent.premiumAccommodation4NightsDoublePrice || 0);
    } else if (data.packageType === 'premium-accommodation-3nights') {
      const isEarlyBird = currentEvent.premiumAccommodation3NightsEarlyBirdEndDate && 
                          new Date(currentEvent.premiumAccommodation3NightsEarlyBirdEndDate) > now;
      
      if (isEarlyBird) {
        return isSingleOccupancy
          ? Number(currentEvent.premiumAccommodation3NightsEarlyBirdSinglePrice || 0)
          : Number(currentEvent.premiumAccommodation3NightsEarlyBirdDoublePrice || 0);
      }
      return isSingleOccupancy
        ? Number(currentEvent.premiumAccommodation3NightsSinglePrice || 0)
        : Number(currentEvent.premiumAccommodation3NightsDoublePrice || 0);
    }
    
    return null;
  };

  const createRegistrationMutation = useMutation({
    mutationFn: async (registrationData: any) => {
      const response = await apiRequest("POST", "/api/registrations", registrationData);
      return response.json();
    },
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: async ({ registrationId }: { registrationId: string }) => {
      const response = await apiRequest("POST", "/api/create-payment-intent", { registrationId });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
  });

  const handleCompleteRegistration = async () => {
    if (!agreedToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!currentEvent?.id) {
      toast({
        title: "Event Required",
        description: "No current event found. Please refresh the page or contact support.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create registration with event ID
      const { workshopSelections, ...safeData } = data;
      const registrationData = {
        ...safeData,
        eventId: currentEvent.id,
        paymentMethod,
        totalAmount: data.totalAmount,
        workshopIds: data.workshopIds || [],
        seatIds: data.seatIds || [],
        milongaIds: data.milongaIds || [],
        addons: data.addons || [],
      };

      const registration = await createRegistrationMutation.mutateAsync(registrationData);

      if (paymentMethod === 'stripe') {
        // Store registration ID for redirect after payment
        localStorage.setItem('currentRegistrationId', registration.id);
        // Create payment intent
        await createPaymentIntentMutation.mutateAsync({
          registrationId: registration.id,
        });
      } else {
        // Offline payment
        toast({
          title: "Registration Created",
          description: "Your registration has been created. Payment instructions will be sent to your email.",
        });
        
        // Add a small delay to show loading state before redirect
        setTimeout(() => {
          console.log('Redirecting to confirmation with ID:', registration.id);
          setLocation(`/confirmation?id=${registration.id}`);
        }, 1500);
      }
    } catch (error: any) {
      setIsSubmitting(false);
      toast({
        title: "Registration Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePaymentComplete = () => {
    toast({
      title: "Registration Complete",
      description: `Thank you for registering for ${currentEvent?.name || "Dubai Tango Festival"}${currentEvent?.year ? ` ${currentEvent.year}` : ""}!`,
    });
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Checkout & Payment</h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Review your registration and complete payment</p>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {/* Order Summary */}
          <div>
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Summary</h3>
              
              {/* Personal Info */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Registrants</h4>
                <div className="text-sm space-y-1">
                  {data.role === 'couple' && (
                    <>
                      <div className="flex justify-between">
                        <span>Leader: {data.leaderInfo?.firstName} {data.leaderInfo?.lastName}</span>
                        <span className="text-gray-500">{data.leaderInfo?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Follower: {data.followerInfo?.firstName} {data.followerInfo?.lastName}</span>
                        <span className="text-gray-500">{data.followerInfo?.email}</span>
                      </div>
                    </>
                  )}
                  {data.role === 'leader' && data.leaderInfo && (
                    <div className="flex justify-between">
                      <span>Leader: {data.leaderInfo.firstName} {data.leaderInfo.lastName}</span>
                      <span className="text-gray-500">{data.leaderInfo.email}</span>
                    </div>
                  )}
                  {data.role === 'follower' && data.followerInfo && (
                    <div className="flex justify-between">
                      <span>Follower: {data.followerInfo.firstName} {data.followerInfo.lastName}</span>
                      <span className="text-gray-500">{data.followerInfo.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Package */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Package</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>
                      {data.packageType === 'full' ? 'Premium Package' : 
                       data.packageType === 'premium-accommodation-4nights' ? 'Premium Package + 4 Nights Accommodation' :
                       data.packageType === 'premium-accommodation-3nights' ? 'Premium Package + 3 Nights Accommodation' :
                       data.packageType === 'evening' ? 'Evening Package' : 
                       'Create Your Own Package'}
                      {data.packageType === 'premium-accommodation-4nights' || data.packageType === 'premium-accommodation-3nights' ? (
                        <span className="text-gray-600 ml-2">
                          ({data.role === 'couple' ? 'Double Occupancy' : 'Single Occupancy'})
                        </span>
                      ) : (
                        data.role === 'couple' && ' (couple)'
                      )}
                    </span>
                    <span>
                      {data.packageType === 'custom' ? (
                        'Pay as you choose'
                      ) : (
                        (() => {
                          const packagePrice = getPackagePriceDisplay();
                          return packagePrice !== null ? `AED ${packagePrice.toLocaleString()}` : 'AED 0';
                        })()
                      )}
                    </span>
                  </div>
                  {(data.packageType === 'premium-accommodation-4nights' || data.packageType === 'premium-accommodation-3nights') && (
                    <div className="text-xs text-gray-600 mt-1">
                      Includes: Up to 6 workshops, all milongas, gala dinner, and {data.packageType === 'premium-accommodation-4nights' ? '4' : '3'} nights accommodation
                    </div>
                  )}
                  {data.packageType === 'full' && (
                    <div className="text-xs text-gray-600 mt-1">
                      Includes: Up to 6 workshops, all milongas, and gala dinner
                    </div>
                  )}
                </div>
              </div>

              {/* Workshops */}
              {data.workshopIds.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {(data.packageType === 'full' || data.packageType === 'premium-accommodation-4nights' || data.packageType === 'premium-accommodation-3nights') ? 'Workshop Details' : 'Workshops'}
                  </h4>
                  <div className="text-sm space-y-1">
                    {(data.packageType === 'full' || data.packageType === 'premium-accommodation-4nights' || data.packageType === 'premium-accommodation-3nights') && data.workshopIds.length <= 6 && (
                      <div className="flex justify-between text-green-600">
                        <span>{data.workshopIds.length} workshops covered by package</span>
                        <span>AED 0</span>
                      </div>
                    )}
                    {(data.packageType === 'full' || data.packageType === 'premium-accommodation-4nights' || data.packageType === 'premium-accommodation-3nights') && data.workshopIds.length > WORKSHOPS_INCLUDED_LIMIT && (
                      <>
                        <div className="flex justify-between text-green-600">
                          <span>{WORKSHOPS_INCLUDED_LIMIT} workshops covered by package</span>
                          <span>AED 0</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{data.workshopIds.length - WORKSHOPS_INCLUDED_LIMIT} additional workshops {data.role === 'couple' && '(x2)'}</span>
                          <span>{formatCurrency(additionalWorkshopsTotal)}</span>
                        </div>
                      </>
                    )}
                    {(data.packageType === 'evening' || data.packageType === 'custom') && (
                      <div className="flex justify-between">
                        <span>{data.workshopIds.length} workshops {data.role === 'couple' && '(x2)'}</span>
                        <span>{formatCurrency(totalWorkshopCharge)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Workshop Schedule */}
              {data.workshopIds.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Workshop Schedule</h4>
                  <div className="text-xs space-y-1 text-gray-600">
                    {data.workshopIds.map((workshopId) => {
                      const workshop = workshops?.find(w => w.id === workshopId);
                      if (!workshop) return null;
                      
                      return (
                        <div key={workshopId}>
                          {workshop.title} - {workshop.date} at {workshop.time}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Milongas (for custom package) */}
              {data.packageType === 'custom' && data.milongaIds && data.milongaIds.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Milonga Events</h4>
                  <div className="text-sm space-y-1">
                    {data.milongaIds.map((milongaId) => {
                      const milonga = milongas?.find((m: any) => m.id === milongaId);
                      const multiplier = data.role === 'couple' ? 2 : 1;
                      
                      // Calculate price with early bird logic
                      let pricePerPerson = milonga ? parseFloat(milonga.price) : 0;
                      if (milonga) {
                        const now = new Date();
                        const earlyBirdPrice = milonga.earlyBirdPrice ? parseFloat(milonga.earlyBirdPrice) : 0;
                        const earlyBirdEndDate = milonga.earlyBirdEndDate;
                        
                        if (earlyBirdPrice > 0 && earlyBirdEndDate) {
                          const endDate = new Date(earlyBirdEndDate);
                          if (endDate >= now) {
                            pricePerPerson = earlyBirdPrice;
                          }
                        }
                      }
                      
                      const price = pricePerPerson * multiplier;
                      
                      return (
                        <div key={milongaId} className="flex justify-between">
                          <span>
                            {milonga ? milonga.name : 'Milonga Event'} 
                            {data.role === 'couple' && ' (x2)'}
                          </span>
                          <span>AED {price.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Milonga Details */}
              {data.packageType === 'custom' && data.milongaIds && data.milongaIds.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Milonga Details</h4>
                  <div className="text-xs space-y-1 text-gray-600">
                    {data.milongaIds.map((milongaId) => {
                      const milonga = milongas?.find((m: any) => m.id === milongaId);
                      if (!milonga) return null;
                      
                      return (
                        <div key={milongaId}>
                          {milonga.name} - {milonga.date} at {milonga.time}
                          {milonga.venue && ` at ${milonga.venue}`}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Gala Dinner */}
              {data.selectedTableNumber && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Gala Dinner Seating</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>
                        Table {data.selectedTableNumber} ({data.role === 'couple' ? '2 seats' : '1 seat'})
                      </span>
                      <span className={tablePricing?.included ? 'text-green-600' : 'text-gray-900'}>
                        {tablePricing?.included ? (
                          'Covered by package'
                        ) : tablePricing ? (
                          <>
                            {formatCurrency(tablePricing.amount)}
                            {tablePricing.isEarlyBird && (
                              <span className="ml-1 text-xs text-green-600">Early Bird</span>
                            )}
                          </>
                        ) : (
                          'Calculating...'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {data.addons.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Add-ons</h4>
                  <div className="text-sm space-y-1">
                    {data.addons.map((addonSelection) => {
                      const addon = addons?.find(a => a.id === addonSelection.id);
                      if (!addon) return null;
                      
                      const price = parseFloat(addon.price) * addonSelection.quantity;
                      const optionsText = Object.entries(addonSelection.options || {})
                        .filter(([key, value]) => key !== 'allowImageUpload' && value)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');
                      
                      return (
                        <div key={addonSelection.id} className="flex justify-between">
                          <span>
                            {addon.name} {optionsText && `(${optionsText})`} x{addonSelection.quantity}
                          </span>
                          <span>AED {price.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Evening and Afternoon Milongas (included with packages) */}
              {(data.packageType === 'full' || data.packageType === 'premium-accommodation-4nights' || data.packageType === 'premium-accommodation-3nights' || data.packageType === 'evening') && milongas && milongas.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Evening & Afternoon Milongas (Included)</h4>
                  <div className="text-sm space-y-1">
                    {milongas.filter(m => m.type === 'regular').map((milonga) => (
                      <div key={milonga.id} className="flex justify-between">
                        <span>{milonga.name}</span>
                        <span className="text-green-600">Included</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs space-y-1 text-gray-600 mt-2">
                    {milongas.filter(m => m.type === 'regular').map((milonga) => (
                      <div key={milonga.id}>
                        {milonga.name} - {milonga.date} at {milonga.time}
                        {milonga.venue && ` at ${milonga.venue}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              {(data.packageType === 'full' || data.packageType === 'premium-accommodation-4nights' || data.packageType === 'premium-accommodation-3nights') && (
                <div className="mb-6 border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Price Breakdown</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Package Price:</span>
                      <span>{(() => {
                        const packagePrice = getPackagePriceDisplay();
                        return packagePrice !== null ? `AED ${packagePrice.toLocaleString()}` : 'AED 0';
                      })()}</span>
                    </div>
                    {(data.packageType === 'premium-accommodation-4nights' || data.packageType === 'premium-accommodation-3nights') && (
                      <div className="text-xs text-gray-600 pl-2">
                        ({data.role === 'couple' ? 'Double' : 'Single'} Occupancy)
                      </div>
                    )}
                    {hasWorkshopAllowance && additionalWorkshopEntries.length > 0 && (
                      <div className="flex justify-between">
                        <span>Additional Workshops ({additionalWorkshopEntries.length}{data.role === 'couple' ? ' × 2' : ''}):</span>
                        <span>{formatCurrency(additionalWorkshopsTotal)}</span>
                      </div>
                    )}
                    {data.addons.length > 0 && (
                      <div className="flex justify-between">
                        <span>Add-ons:</span>
                        <span>AED {data.addons.reduce((total, addon) => total + (parseFloat(addon.price || '0') * addon.quantity), 0).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>AED {data.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>Registration Code:</span>
                  <span>{data.packageType?.toUpperCase().substring(0, 3) || 'REG'}-XXXXXX</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
              
              {/* Payment Option Selection */}
              <RadioGroup value={paymentMethod} onValueChange={(value: 'stripe' | 'offline') => setPaymentMethod(value)} className="space-y-3 mb-6">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="stripe" id="stripe" />
                  <Label htmlFor="stripe" className="flex items-center cursor-pointer flex-1 p-3 border rounded-lg hover:bg-gray-50">
                    <CreditCard className="h-4 w-4 text-gray-400 mr-3" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Card Payment</div>
                      <div className="text-sm text-gray-500">Pay securely with Stripe</div>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="offline" id="offline" />
                  <Label htmlFor="offline" className="flex items-center cursor-pointer flex-1 p-3 border rounded-lg hover:bg-gray-50">
                    <University className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">Bank Transfer</div>
                      <div className="text-sm text-gray-500">Pay via wire transfer</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {/* Stripe Payment Form */}
              {paymentMethod === 'stripe' && clientSecret && (
                <div className="w-full">
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm data={data} onComplete={handlePaymentComplete} />
                  </Elements>
                </div>
              )}

              {/* Terms & Conditions */}
              <div className="mb-6">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                  onCheckedChange={(checked) => handleTermsChange(!!checked)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer leading-5">
                    I agree to the <a href="#" className="text-red-600 hover:text-red-800">Terms & Conditions</a> and <a href="#" className="text-red-600 hover:text-red-800">Privacy Policy</a>
                  </Label>
                </div>
              </div>

              {/* Offline Payment */}
              {paymentMethod === 'offline' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Payment instructions will be sent to your email after registration.
                  </p>
                  <Button
                    onClick={handleCompleteRegistration}
                    disabled={!agreedToTerms || createRegistrationMutation.isPending || isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {createRegistrationMutation.isPending || isSubmitting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        {isSubmitting ? 'Completing Registration...' : 'Creating Registration...'}
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Complete Registration
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Stripe Payment Intent Creation */}
              {paymentMethod === 'stripe' && !clientSecret && (
                <Button
                  onClick={handleCompleteRegistration}
                  disabled={!agreedToTerms || createRegistrationMutation.isPending || createPaymentIntentMutation.isPending || isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {createRegistrationMutation.isPending || createPaymentIntentMutation.isPending || isSubmitting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Preparing Payment...
                    </>
                  ) : (
                    'Proceed to Payment'
                  )}
                </Button>
              )}

              <p className="text-xs text-gray-500 mt-4 text-center">
                Your payment is secured with 256-bit SSL encryption
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-8">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div></div>
        </div>
      </CardContent>
    </Card>
  );
}
