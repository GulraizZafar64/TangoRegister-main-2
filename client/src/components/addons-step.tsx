import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Plus, Minus } from "lucide-react";
import { RegistrationData } from "@/pages/registration";
import { Addon } from "@shared/schema";

interface AddonsStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface AddonSelection {
  id: string;
  quantity: number;
  options: Record<string, string>;
}

interface TshirtSelection {
  id: string; // unique id for this specific size selection
  size: string;
  quantity: number;
}

export function AddonsStep({ data, onUpdate, onNext, onPrev }: AddonsStepProps) {
  const { data: addons, isLoading } = useQuery<Addon[]>({
    queryKey: ['/api/addons'],
  });

  const [addonSelections, setAddonSelections] = useState<AddonSelection[]>([]);
  
  // Separate state for size-based addon selections (e.g., t-shirts)
  const [sizeBasedSelections, setSizeBasedSelections] = useState<Record<string, TshirtSelection[]>>({});
  
  // State for size selection per addon
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  // Initialize selections from existing data
  useEffect(() => {
    if (!addons) return;
    
    // Initialize regular addon selections (non-size-based)
    const regularSelections = data.addons
      .filter(addon => {
        const addonData = addons.find(a => a.id === addon.id);
        return !(addonData?.options?.sizes && Array.isArray(addonData.options.sizes));
      })
      .map(addon => ({ 
        id: addon.id, 
        quantity: addon.quantity, 
        options: addon.options || {}
      }));
    setAddonSelections(regularSelections);
    
    // Initialize size-based selections
    const initial: Record<string, TshirtSelection[]> = {};
    data.addons.forEach(addon => {
      const addonData = addons.find(a => a.id === addon.id);
      if (addonData?.options?.sizes && Array.isArray(addonData.options.sizes)) {
        if (!initial[addon.id]) {
          initial[addon.id] = [];
        }
        if (addon.options?.size) {
          initial[addon.id].push({
            id: `${addon.id}-${addon.options.size}-${Date.now()}`,
            size: addon.options.size,
            quantity: addon.quantity
          });
        }
      }
    });
    setSizeBasedSelections(initial);
  }, [addons, data.addons]);

  const updateAddonSelection = (addonId: string, updates: Partial<AddonSelection>) => {
    setAddonSelections(prev => {
      const existing = prev.find(s => s.id === addonId);
      if (existing) {
        return prev.map(s => s.id === addonId ? { ...s, ...updates } : s);
      } else {
        return [...prev, { 
          id: addonId, 
          quantity: 0, 
          options: {}, 
          ...updates 
        }];
      }
    });
  };

  const changeQuantity = (addonId: string, delta: number) => {
    const current = addonSelections.find(s => s.id === addonId)?.quantity || 0;
    const newQuantity = Math.max(0, current + delta);
    updateAddonSelection(addonId, { quantity: newQuantity });
  };

  const addSizeBasedAddon = (addonId: string, size: string) => {
    setSizeBasedSelections(prev => {
      const addonSelections = prev[addonId] || [];
      const existing = addonSelections.find(t => t.size === size);
      if (existing) {
        return {
          ...prev,
          [addonId]: addonSelections.map(t => t.size === size ? { ...t, quantity: t.quantity + 1 } : t)
        };
      } else {
        return {
          ...prev,
          [addonId]: [...addonSelections, { id: `${addonId}-${size}-${Date.now()}`, size, quantity: 1 }]
        };
      }
    });
    setSelectedSizes(prev => ({ ...prev, [addonId]: '' }));
  };
  
  const removeSizeBasedAddon = (addonId: string, selectionId: string) => {
    setSizeBasedSelections(prev => ({
      ...prev,
      [addonId]: (prev[addonId] || []).filter(t => t.id !== selectionId)
    }));
  };
  
  const updateSizeBasedQuantity = (addonId: string, selectionId: string, delta: number) => {
    setSizeBasedSelections(prev => ({
      ...prev,
      [addonId]: (prev[addonId] || [])
        .map(t => {
          if (t.id === selectionId) {
            const newQuantity = Math.max(0, t.quantity + delta);
            return { ...t, quantity: newQuantity };
          }
          return t;
        })
        .filter(t => t.quantity > 0)
    }));
  };

  const calculateAddonsTotal = () => {
    if (!addons) return 0;
    
    const regularAddonsTotal = addonSelections.reduce((total, selection) => {
      const addon = addons.find(a => a.id === selection.id);
      return total + (parseFloat(addon?.price || '0') * selection.quantity);
    }, 0);
    
    // Calculate total for size-based addons
    let sizeBasedTotal = 0;
    Object.entries(sizeBasedSelections).forEach(([addonId, selections]) => {
      const addon = addons.find(a => a.id === addonId);
      if (addon) {
        sizeBasedTotal += selections.reduce((total, selection) => {
          return total + (parseFloat(addon.price || '0') * selection.quantity);
        }, 0);
      }
    });
    
    return regularAddonsTotal + sizeBasedTotal;
  };



  const handleNext = () => {
    const regularAddons = addonSelections.filter(s => s.quantity > 0).map(selection => {
      const addon = addons?.find(a => a.id === selection.id);
      return {
        id: selection.id,
        quantity: selection.quantity,
        price: addon?.price || '0',
        options: selection.options
      };
    });
    
    // Build size-based addons
    const sizeBasedAddons: any[] = [];
    Object.entries(sizeBasedSelections).forEach(([addonId, selections]) => {
      const addon = addons?.find(a => a.id === addonId);
      if (addon) {
        selections.forEach(selection => {
          sizeBasedAddons.push({
            id: addonId,
            quantity: selection.quantity,
            price: addon.price || '0',
            options: { size: selection.size }
          });
        });
      }
    });
    
    onUpdate({ 
      addons: [...regularAddons, ...sizeBasedAddons],
      addonsTotal: calculateAddonsTotal()
    });
    onNext();
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Festival Add-ons</h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Enhance your festival experience with our exclusive merchandise and extras</p>
        </div>

        {/* Add-ons */}
        <div className="w-full space-y-6 mb-6 sm:mb-8">
          {addons?.map((addon) => {
            const selection = addonSelections.find(s => s.id === addon.id);
            const quantity = selection?.quantity || 0;
            const options = selection?.options || {};
            
            // Special layout for addons with size options (e.g., t-shirts)
            if (addon.options?.sizes && Array.isArray(addon.options.sizes)) {
              const addonSelections = sizeBasedSelections[addon.id] || [];
              const selectedSize = selectedSizes[addon.id] || '';
              
              return (
                <div key={addon.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Image Column */}
                    <div className="bg-gray-100 p-6 flex items-center justify-center min-h-[300px]">
                      <div className="text-center">
                        <div className="w-48 h-48 bg-white rounded-lg shadow-md flex items-center justify-center mb-4 mx-auto">
                          {addon.options?.image ? (
                            <img src={addon.options.image} alt={addon.name} className="w-full h-full object-contain rounded-lg" />
                          ) : (
                            <span className="text-6xl">👕</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{addon.name}</p>
                      </div>
                    </div>
                    
                    {/* Details Column */}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{addon.name}</h3>
                      <p className="text-gray-600 mb-4">{addon.description}</p>
                      <div className="text-2xl font-bold text-primary mb-6">AED {addon.price}</div>
                      
                      {/* Size Selection */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Size
                        </label>
                        <Select 
                          value={selectedSize} 
                          onValueChange={(value) => setSelectedSizes(prev => ({ ...prev, [addon.id]: value }))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Choose size" />
                          </SelectTrigger>
                          <SelectContent>
                            {addon.options.sizes.map((size: string) => (
                              <SelectItem key={size} value={size}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button
                        className="w-full bg-primary hover:bg-primary/90 mb-6"
                        onClick={() => {
                          if (selectedSize) {
                            addSizeBasedAddon(addon.id, selectedSize);
                          }
                        }}
                        disabled={!selectedSize}
                      >
                        Add {addon.name}
                      </Button>
                      
                      {!selectedSize && (
                        <p className="text-sm text-red-500 text-center mb-4">
                          Please select a size first
                        </p>
                      )}
                      
                      {/* Selected Items */}
                      {addonSelections.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">Selected Items:</h4>
                          {addonSelections.map((selection) => (
                            <div key={selection.id} className="bg-gray-50 p-3 rounded border flex items-center justify-between">
                              <div>
                                <span className="font-medium">Size {selection.size}</span>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-8 h-8"
                                    onClick={() => updateSizeBasedQuantity(addon.id, selection.id, -1)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center text-sm">{selection.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-8 h-8"
                                    onClick={() => updateSizeBasedQuantity(addon.id, selection.id, 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600">AED {(parseFloat(addon.price) * selection.quantity).toFixed(2)}</p>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeSizeBasedAddon(addon.id, selection.id)}
                                  className="text-xs mt-1"
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium text-gray-900">
                              Total: AED {addonSelections.reduce((total, sel) => total + (parseFloat(addon.price) * sel.quantity), 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            
            // Desert Safari with checkbox layout
            if (addon.id === 'addon-desert-transport') {
              return (
                <div key={addon.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-20 h-20 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl">🐪</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 mr-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{addon.name}</h3>
                          <p className="text-gray-600 text-sm mb-3">{addon.description}</p>
                          <div className="text-xl font-bold text-primary">AED {addon.price}</div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`desert-transport-${addon.id}`}
                            checked={quantity > 0}
                            onCheckedChange={(checked) => {
                              const newQuantity = checked ? (data.role === 'couple' ? 2 : 1) : 0;
                              updateAddonSelection(addon.id, { quantity: newQuantity });
                            }}
                            className=""
                          />
                          <Label 
                            htmlFor={`desert-transport-${addon.id}`} 
                            className="text-sm font-medium cursor-pointer"
                          >
                            Include Transport
                          </Label>
                        </div>
                      </div>
                      {quantity > 0 && (
                        <p className="text-sm text-green-600 mt-3 font-medium">
                          ✓ {data.role === 'couple' ? 'Transport for 2 people' : 'Transport for 1 person'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            
            // Default layout for other add-ons
            return (
              <div key={addon.id} className="border border-gray-200 rounded-lg p-4 sm:p-6 w-full">
                <div className="flex items-start space-x-4">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    {(addon.options as any)?.icon ? (
                      <span className="text-3xl">{(addon.options as any).icon}</span>
                    ) : (
                      <span className="text-gray-500 text-xs text-center">{addon.name}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{addon.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{addon.description}</p>
                    <div className="text-xl font-bold text-primary mb-4">AED {addon.price}</div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                      <div className="flex items-center justify-center space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => changeQuantity(addon.id, -1)}
                          disabled={quantity === 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => changeQuantity(addon.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <Button
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => changeQuantity(addon.id, 1)}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Summary */}
        {addonSelections.some(s => s.quantity > 0) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">Add-ons Cart</h4>
            <div className="space-y-2">
              {addonSelections
                .filter(selection => selection.quantity > 0)
                .map((selection) => {
                  const addon = addons?.find(a => a.id === selection.id);
                  if (!addon) return null;
                  
                  const optionsText = Object.entries(selection.options)
                    .map(([key, value]) => `${value}`)
                    .join(', ');
                  
                  return (
                    <div key={selection.id} className="flex justify-between items-center text-sm">
                      <span>
                        {addon.name} {optionsText && `(${optionsText})`} x{selection.quantity}
                      </span>
                      <span className="font-medium">
                        AED {(parseFloat(addon.price) * selection.quantity).toFixed(0)}
                      </span>
                    </div>
                  );
                })}
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="flex justify-between items-center font-semibold">
                <span>Add-ons Subtotal:</span>
                <span>AED {calculateAddonsTotal().toFixed(0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={handleNext} className="bg-primary hover:bg-primary/90">
            Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
