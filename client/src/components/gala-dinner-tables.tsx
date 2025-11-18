import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Users, Crown, CheckCircle } from "lucide-react";

interface Table {
  id: string;
  tableNumber: number;
  totalSeats: number;
  occupiedSeats: number;
  isVip: boolean;
  price: string;
  earlyBirdPrice?: string | null;
  earlyBirdEndDate?: string | null;
  isActive: boolean;
}

interface LayoutSettings {
  id?: string;
  layoutImageUrl?: string | null;
}

interface GalaDinnerTablesProps {
  role: "leader" | "follower" | "couple";
  selectedTableNumber?: number;
  onSelectionChange: (tableNumber: number | undefined) => void;
  className?: string;
  showPrice?: boolean;
}

export function GalaDinnerTables({ 
  role, 
  selectedTableNumber, 
  onSelectionChange,
  className,
  showPrice = false
}: GalaDinnerTablesProps) {
  const [localSelection, setLocalSelection] = useState<number | undefined>(selectedTableNumber);

  const { data: tables = [], isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  const { data: layoutSettings } = useQuery<LayoutSettings>({
    queryKey: ["/api/layout-settings"],
  });

  const bookTableMutation = useMutation({
    mutationFn: async ({ tableNumber, seatsToBook }: { tableNumber: number; seatsToBook: number }) => {
      const response = await fetch(`/api/tables/${tableNumber}/book`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatsToBook }),
      });
      if (!response.ok) {
        throw new Error('Failed to book table');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
    },
  });

  useEffect(() => {
    if (selectedTableNumber !== localSelection) {
      setLocalSelection(selectedTableNumber);
    }
  }, [selectedTableNumber]);

  const handleTableSelect = (tableNumber: number) => {
    const table = tables.find(t => t.tableNumber === tableNumber);
    if (!table) return;

    const seatsNeeded = role === "couple" ? 2 : 1;
    const availableSeats = table.totalSeats - table.occupiedSeats;

    if (availableSeats < seatsNeeded) {
      return; // Table is full, can't select
    }

    if (localSelection === tableNumber) {
      // Deselect current table
      setLocalSelection(undefined);
      onSelectionChange(undefined);
    } else {
      // Select new table
      setLocalSelection(tableNumber);
      onSelectionChange(tableNumber);
    }
  };

  const getTableAvailability = (table: Table) => {
    const seatsNeeded = role === "couple" ? 2 : 1;
    const availableSeats = table.totalSeats - table.occupiedSeats;
    return {
      available: availableSeats >= seatsNeeded,
      availableSeats,
      seatsNeeded
    };
  };

  const computeTablePrice = (table: Table) => {
    const basePrice = parseFloat(table.price || "0");
    const earlyBirdPrice = table.earlyBirdPrice ? parseFloat(table.earlyBirdPrice) : 0;
    const isEarlyBirdActive = table.earlyBirdEndDate ? new Date(table.earlyBirdEndDate) >= new Date() : false;
    if (isEarlyBirdActive && earlyBirdPrice > 0) {
      return { amount: earlyBirdPrice, isEarlyBird: true };
    }
    return { amount: basePrice, isEarlyBird: false };
  };

  const formatCurrency = (value: number) => {
    return `AED ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (tablesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading tables...</span>
      </div>
    );
  }

  const activeTables = tables.filter(table => table.isActive).sort((a, b) => a.tableNumber - b.tableNumber);

  return (
    <div className={className}>
      {/* Layout Image */}
      {layoutSettings?.layoutImageUrl && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Seating Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <img 
                  src={layoutSettings.layoutImageUrl}
                  alt="Gala Dinner Seating Layout" 
                  className="max-w-full h-auto rounded-lg border"
                  style={{ maxHeight: "400px" }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Your Table
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {role === "couple" ? "Choose a table for 2 people" : "Choose a table for 1 person"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeTables.map((table) => {
              const availability = getTableAvailability(table);
              const isSelected = localSelection === table.tableNumber;
              
              return (
                <Card 
                  key={table.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    !availability.available 
                      ? "opacity-50 cursor-not-allowed" 
                      : isSelected 
                        ? "ring-2 ring-primary bg-primary/5" 
                        : "hover:shadow-md hover:scale-105"
                  }`}
                  onClick={() => availability.available && handleTableSelect(table.tableNumber)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="font-bold text-lg">Table {table.tableNumber}</span>
                      {table.isVip && <Crown className="h-4 w-4 text-yellow-500" />}
                    </div>
                    
                    {table.isVip && (
                      <Badge variant="secondary" className="mb-2 bg-yellow-100 text-yellow-800">
                        VIP
                      </Badge>
                    )}
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{availability.availableSeats} / {table.totalSeats} available</span>
                      </div>
                      
                      {showPrice && (
                        <div className="font-semibold text-primary">
                          {(() => {
                            const { amount, isEarlyBird } = computeTablePrice(table);
                            return (
                              <>
                                {formatCurrency(amount)}
                                {isEarlyBird && (
                                  <span className="ml-1 text-xs text-green-600">Early Bird</span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                      
                      {isSelected && (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          <span className="text-xs">Selected</span>
                        </div>
                      )}
                      
                      {!availability.available && (
                        <Badge variant="destructive" className="text-xs">
                          Full
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {activeTables.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tables available at the moment.</p>
            </div>
          )}

          {localSelection && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">
                  Table {localSelection} selected for {role === "couple" ? "2 people" : "1 person"}
                </span>
              </div>
              {showPrice ? (
                <p className="text-sm text-green-700 mt-1">
                  {(() => {
                    const table = tables.find(t => t.tableNumber === localSelection);
                    if (!table) return null;
                    const { amount, isEarlyBird } = computeTablePrice(table);
                    const multiplier = role === "couple" ? 2 : 1;
                    const total = amount * multiplier;
                    return (
                      <>
                        Cost: {formatCurrency(total)}
                        {isEarlyBird && <span className="ml-2 text-xs text-green-600">Early Bird</span>}
                      </>
                    );
                  })()}
                </p>
              ) : (
                <p className="text-sm text-green-700 mt-1">
                  Gala dinner seating is covered by your package.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}