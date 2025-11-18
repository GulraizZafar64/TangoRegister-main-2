import { useState, useEffect } from 'react';
import { CountdownTimer } from './countdown-timer';
import { Badge } from '@/components/ui/badge';

interface PricingTier {
  standardPrice: number;
  earlyBirdPrice: number;
  earlyBirdEndDate: string;
  dealPrice: number;
  dealStartDate: string;
  dealEndDate: string;
}

interface PackagePricingDisplayProps {
  packageType: 'full' | 'evening' | 'premium-accommodation-4nights' | 'premium-accommodation-3nights';
  pricing?: PricingTier | null;
  role?: 'individual' | 'couple' | 'leader' | 'follower';
  className?: string;
}

export function PackagePricingDisplay({ 
  packageType, 
  pricing, 
  role = 'individual',
  className = "" 
}: PackagePricingDisplayProps) {
  const [currentTier, setCurrentTier] = useState<'standard' | 'earlybird' | '24hour'>('standard');
  const [currentPrice, setCurrentPrice] = useState(0);

  // Convert decimal strings to numbers if pricing exists
  const activePricing = pricing ? {
    ...pricing,
    standardPrice: Number(pricing.standardPrice),
    earlyBirdPrice: Number(pricing.earlyBirdPrice),
    dealPrice: Number(pricing.dealPrice),
  } : null;

  // Early return after all hooks are called
  if (!pricing || !activePricing) {
    return (
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Pricing not configured</p>
      </div>
    );
  }

  const determineCurrentTier = () => {
    const now = new Date();
    const isAccommodationPackage = packageType.startsWith('premium-accommodation');
    
    // Accommodation packages don't have 24-hour deals, only early bird
    if (isAccommodationPackage) {
      // Check early bird offer - must have valid date and price > 0
      if (activePricing.earlyBirdEndDate && 
          activePricing.earlyBirdPrice > 0 && 
          !isNaN(Date.parse(activePricing.earlyBirdEndDate)) &&
          new Date(activePricing.earlyBirdEndDate) > now) {
        setCurrentTier('earlybird');
        setCurrentPrice(activePricing.earlyBirdPrice);
        return;
      }
      
      // Default to standard pricing
      setCurrentTier('standard');
      setCurrentPrice(activePricing.standardPrice);
      return;
    }
    
    // For regular packages (full/evening), check 24-hour deal first (highest priority)
    if (activePricing.dealStartDate && 
        activePricing.dealEndDate && 
        activePricing.dealPrice > 0 && 
        !isNaN(Date.parse(activePricing.dealStartDate)) &&
        !isNaN(Date.parse(activePricing.dealEndDate))) {
      
      const startDate = new Date(activePricing.dealStartDate);
      const endDate = new Date(activePricing.dealEndDate);
      
      // Deal must be currently active (between start and end dates)
      if (now >= startDate && now <= endDate) {
        setCurrentTier('24hour');
        setCurrentPrice(activePricing.dealPrice);
        return;
      }
    }
    
    // Check early bird offer - must have valid date and price > 0
    if (activePricing.earlyBirdEndDate && 
        activePricing.earlyBirdPrice > 0 && 
        !isNaN(Date.parse(activePricing.earlyBirdEndDate)) &&
        new Date(activePricing.earlyBirdEndDate) > now) {
      setCurrentTier('earlybird');
      setCurrentPrice(activePricing.earlyBirdPrice);
      return;
    }
    
    // Default to standard pricing
    setCurrentTier('standard');
    setCurrentPrice(activePricing.standardPrice);
  };

  useEffect(() => {
    determineCurrentTier();
  }, [activePricing]);

  const isCouple = role === 'couple';
  const isAccommodationPackage = packageType.startsWith('premium-accommodation');
  
  // For accommodation packages, price is already per person/couple (no multiplier needed)
  // For regular packages, multiply by 2 for couples
  const displayPrice = isAccommodationPackage 
    ? currentPrice 
    : (isCouple ? currentPrice * 2 : currentPrice);
  const standardDisplayPrice = isAccommodationPackage
    ? activePricing.standardPrice
    : (isCouple ? activePricing.standardPrice * 2 : activePricing.standardPrice);

  return (
    <div className={`text-right ${className}`} data-testid={`pricing-display-${packageType}`}>
      {/* Deal Badge and Timer */}
      {currentTier === '24hour' && (
        <div className="flex flex-col items-end gap-1 mb-2">
          <Badge variant="destructive" className="text-xs font-semibold bg-red-600">
            ⚡ 24-Hour Flash Deal!
          </Badge>
          <CountdownTimer 
            endDate={activePricing.dealEndDate} 
            onExpired={determineCurrentTier}
            className="text-xs"
          />
        </div>
      )}
      
      {currentTier === 'earlybird' && (
        <div className="mb-2">
          <Badge variant="secondary" className="text-xs font-semibold bg-blue-100 text-blue-800">
            🐣 Early Bird Special
          </Badge>
        </div>
      )}

      {/* Price Display */}
      <div className="space-y-1">
        {currentTier !== 'standard' && (
          <div className="text-lg text-gray-500 line-through" data-testid={`standard-price-${packageType}`}>
            AED {standardDisplayPrice.toLocaleString()}
          </div>
        )}
        
        <div className={`text-2xl font-bold ${
          currentTier === '24hour' ? 'text-red-600' : 
          currentTier === 'earlybird' ? 'text-blue-600' : 
          'text-gray-900'
        }`} data-testid={`current-price-${packageType}`}>
          AED {displayPrice.toLocaleString()}
        </div>
        
        <div className="text-sm text-gray-500">
          per {isCouple ? 'couple' : 'person'}
        </div>
        
        {currentTier !== 'standard' && (
          <div className="text-xs font-medium text-green-600">
            Save AED {(standardDisplayPrice - displayPrice).toLocaleString()}!
          </div>
        )}
      </div>
    </div>
  );
}