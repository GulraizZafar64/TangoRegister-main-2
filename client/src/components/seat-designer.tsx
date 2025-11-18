import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Move, Settings, Music, Trash2, Save } from "lucide-react";
import { Seat } from "@shared/schema";

interface TableConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  seats: number;
  type: 'regular' | 'vip' | 'sponsor';
  rotation: number;
}

interface StageConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export function SeatDesigner() {
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [stage, setStage] = useState<StageConfig>({ x: 400, y: 50, width: 200, height: 80, rotation: 0 });
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingStage, setIsDraggingStage] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<TableConfig | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: seats, refetch: refetchSeats } = useQuery<Seat[]>({ 
    queryKey: ['/api/seats'],
    refetchInterval: 5000, // Auto-refetch every 5 seconds to stay in sync
  });

  const { data: savedLayout } = useQuery({
    queryKey: ['/api/seating-layout'],
    refetchOnMount: true,
  });

  // Load existing tables from seats data and apply saved layout
  useEffect(() => {
    console.log('Loading seats and layout:', { seats: seats?.length, savedLayout });
    
    if (seats) {
      const tableMap = new Map<string, TableConfig>();
      
      seats.forEach(seat => {
        const tableName = seat.tableName;
        if (!tableMap.has(tableName)) {
          // Generate position based on table name for initial layout
          const hash = tableName.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          
          tableMap.set(tableName, {
            id: tableName.toLowerCase().replace(/\s+/g, '-'),
            name: tableName,
            x: 100 + (Math.abs(hash) % 600),
            y: 200 + (Math.abs(hash >> 8) % 300),
            seats: 0,
            type: seat.isVip ? 'vip' : 'regular',
            rotation: 0
          });
        }
        
        const table = tableMap.get(tableName)!;
        table.seats++;
      });
      
      let generatedTables = Array.from(tableMap.values());
      console.log('Generated tables from seats:', generatedTables);
      
      // Apply saved layout if available
      if (savedLayout?.tables && savedLayout.tables.length > 0) {
        console.log('Applying saved layout:', savedLayout.tables);
        generatedTables = generatedTables.map(table => {
          const savedTable = savedLayout.tables.find((st: any) => st.id === table.id || st.name === table.name);
          if (savedTable) {
            return {
              ...table,
              x: savedTable.x,
              y: savedTable.y,
              rotation: savedTable.rotation || 0
            };
          }
          return table;
        });
      }
      
      setTables(generatedTables);
      console.log('Final tables set:', generatedTables);
      
      // Apply saved stage position if available
      if (savedLayout?.stage) {
        console.log('Applying saved stage:', savedLayout.stage);
        setStage(savedLayout.stage);
      }
    }
  }, [seats, savedLayout]);

  const saveLayoutMutation = useMutation({
    mutationFn: async (layoutData: { tables: TableConfig[]; stage: StageConfig }) => {
      console.log('Saving layout data:', layoutData);
      const response = await apiRequest("POST", "/api/seating-layout", layoutData);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Layout saved successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/seating-layout'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seats'] });
      toast({
        title: "Layout Saved",
        description: "Seating layout has been saved and will persist on reload.",
      });
    },
    onError: (error) => {
      console.error('Failed to save layout:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save seating layout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async (tableData: { name: string; seats: number; type: string }) => {
      const response = await apiRequest("POST", "/api/tables", tableData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seats'] });
      toast({
        title: "Table Created",
        description: "New table has been created successfully.",
      });
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: async ({ tableId, updates }: { tableId: string; updates: any }) => {
      const response = await apiRequest("PUT", `/api/tables/${tableId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seats'] });
      toast({
        title: "Table Updated",
        description: "Table has been updated successfully.",
      });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (tableId: string) => {
      const response = await apiRequest("DELETE", `/api/tables/${tableId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seats'] });
      setTables(tables.filter(t => t.id !== selectedTable));
      setSelectedTable(null);
      toast({
        title: "Table Deleted",
        description: "Table has been deleted successfully.",
      });
    },
  });

  const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    setSelectedTable(tableId);
    setIsDragging(true);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - table.x,
        y: e.clientY - rect.top - table.y
      });
    }
  };

  const handleStageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingStage(true);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - stage.x,
        y: e.clientY - rect.top - stage.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isDragging && selectedTable) {
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      setTables(tables.map(table => 
        table.id === selectedTable 
          ? { ...table, x: Math.max(0, Math.min(newX, 720)), y: Math.max(0, Math.min(newY, 520)) }
          : table
      ));
    }

    if (isDraggingStage) {
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      setStage({
        ...stage,
        x: Math.max(0, Math.min(newX, 600)),
        y: Math.max(0, Math.min(newY, 520))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingStage(false);
  };

  const addNewTable = () => {
    const newTable: TableConfig = {
      id: `table-${Date.now()}`,
      name: `Table ${tables.length + 1}`,
      x: 200,
      y: 200,
      seats: 6,
      type: 'regular',
      rotation: 0
    };
    
    setTables([...tables, newTable]);
    setEditingTable(newTable);
    setShowTableDialog(true);
  };

  const handleTableSave = (tableData: { name: string; seats: number; type: string }) => {
    if (editingTable) {
      if (editingTable.id.startsWith('table-')) {
        // New table
        createTableMutation.mutate(tableData);
        setTables(tables.map(t => 
          t.id === editingTable.id 
            ? { ...t, ...tableData }
            : t
        ));
      } else {
        // Existing table
        updateTableMutation.mutate({ 
          tableId: editingTable.id, 
          updates: tableData 
        });
        setTables(tables.map(t => 
          t.id === editingTable.id 
            ? { ...t, ...tableData }
            : t
        ));
      }
    }
    setShowTableDialog(false);
    setEditingTable(null);
  };

  const deleteTable = () => {
    if (selectedTable) {
      deleteTableMutation.mutate(selectedTable);
    }
  };

  const saveLayout = () => {
    // Ensure we have valid table data before saving
    if (tables.length === 0) {
      toast({
        title: "Nothing to Save",
        description: "Please position some tables before saving the layout.",
        variant: "destructive",
      });
      return;
    }
    
    const layoutData = {
      tables: tables.map(table => ({
        id: table.id,
        name: table.name,
        x: table.x,
        y: table.y,
        rotation: table.rotation,
        seats: table.seats,
        type: table.type
      })),
      stage: {
        x: stage.x,
        y: stage.y,
        width: stage.width,
        height: stage.height,
        rotation: stage.rotation
      }
    };
    
    console.log('Attempting to save layout:', layoutData);
    console.log('Current tables state:', tables);
    console.log('Current stage state:', stage);
    
    saveLayoutMutation.mutate(layoutData);
  };

  const getTableColor = (type: string) => {
    switch (type) {
      case 'vip': return '#fbbf24';
      case 'sponsor': return '#8b5cf6';
      default: return '#3b82f6';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Seating Layout Designer</h2>
        <div className="flex gap-2">
          <Button onClick={addNewTable} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </Button>
          <Button onClick={saveLayout} disabled={saveLayoutMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveLayoutMutation.isPending ? 'Saving...' : 'Save Layout'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              <div 
                ref={canvasRef}
                className="relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg"
                style={{ width: '800px', height: '600px', margin: '0 auto' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Grid */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Stage */}
                <div
                  className="absolute bg-gray-800 flex items-center justify-center text-white font-semibold cursor-move border-2 border-gray-600"
                  style={{
                    left: stage.x,
                    top: stage.y,
                    width: stage.width,
                    height: stage.height,
                    transform: `rotate(${stage.rotation}deg)`
                  }}
                  onMouseDown={handleStageMouseDown}
                >
                  <Music className="h-6 w-6 mr-2" />
                  STAGE
                </div>

                {/* Tables */}
                {tables.map((table) => {
                  // Check seat availability for this table
                  const tableSeats = seats?.filter(seat => seat.tableName === table.name) || [];
                  const availableSeats = tableSeats.filter(seat => seat.isAvailable).length;
                  const occupiedSeats = tableSeats.length - availableSeats;
                  
                  return (
                    <div
                      key={table.id}
                      className={`absolute cursor-move border-2 rounded-full flex flex-col items-center justify-center text-white font-semibold transition-all ${
                        selectedTable === table.id ? 'ring-4 ring-blue-300' : ''
                      }`}
                      style={{
                        left: table.x,
                        top: table.y,
                        width: '80px',
                        height: '80px',
                        backgroundColor: getTableColor(table.type),
                        borderColor: selectedTable === table.id ? '#3b82f6' : 'transparent',
                        transform: `rotate(${table.rotation}deg)`,
                        opacity: occupiedSeats > 0 ? 0.7 : 1.0
                      }}
                      onMouseDown={(e) => handleMouseDown(e, table.id)}
                      onDoubleClick={() => {
                        setEditingTable(table);
                        setShowTableDialog(true);
                      }}
                    >
                      <div className="text-xs text-center">
                        <div>{table.name}</div>
                        <div>{table.seats} seats</div>
                        {occupiedSeats > 0 && (
                          <div className="text-red-200 text-xs">{occupiedSeats} occupied</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>• Drag tables to reposition • Double-click to edit • Use the controls panel to modify properties</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-xs">Regular Table</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-xs">VIP Table</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                <span className="text-xs">Sponsor Table</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-800 rounded"></div>
                <span className="text-xs">Stage</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-300 rounded-full border opacity-70"></div>
                <span className="text-xs">Has Occupied Seats</span>
              </div>
            </CardContent>
          </Card>

          {selectedTable && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Selected Table</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const table = tables.find(t => t.id === selectedTable);
                  if (!table) return null;
                  
                  return (
                    <>
                      <div>
                        <Label className="text-xs">Table Name</Label>
                        <p className="font-medium">{table.name}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Seats</Label>
                        <p className="font-medium">{table.seats}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Badge variant="outline">{table.type}</Badge>
                      </div>
                      <div>
                        <Label className="text-xs">Position</Label>
                        <p className="text-xs text-gray-600">x: {table.x}, y: {table.y}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEditingTable(table);
                            setShowTableDialog(true);
                          }}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={deleteTable}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Total Tables:</span>
                <span>{tables.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Total Seats:</span>
                <span>{tables.reduce((sum, t) => sum + t.seats, 0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Available Seats:</span>
                <span>{seats?.filter(seat => seat.isAvailable).length || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Occupied Seats:</span>
                <span>{seats?.filter(seat => !seat.isAvailable).length || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>VIP Tables:</span>
                <span>{tables.filter(t => t.type === 'vip').length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table Edit Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable?.id.startsWith('table-') ? 'Add New Table' : 'Edit Table'}
            </DialogTitle>
          </DialogHeader>
          <TableEditForm 
            table={editingTable}
            onSave={handleTableSave}
            onCancel={() => {
              setShowTableDialog(false);
              setEditingTable(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TableEditForm({ 
  table, 
  onSave, 
  onCancel 
}: { 
  table: TableConfig | null; 
  onSave: (data: { name: string; seats: number; type: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(table?.name || '');
  const [seats, setSeats] = useState(table?.seats || 6);
  const [type, setType] = useState(table?.type || 'regular');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, seats, type });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="tableName">Table Name</Label>
        <Input
          id="tableName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Table 1, VIP 1"
          required
        />
      </div>

      <div>
        <Label htmlFor="seats">Number of Seats</Label>
        <Input
          id="seats"
          type="number"
          min="2"
          max="12"
          value={seats}
          onChange={(e) => setSeats(parseInt(e.target.value))}
          required
        />
      </div>

      <div>
        <Label htmlFor="type">Table Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="sponsor">Sponsor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Table
        </Button>
      </div>
    </form>
  );
}