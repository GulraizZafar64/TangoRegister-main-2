import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, CreditCard, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { Workshop, Milonga, Seat, Addon } from "@shared/schema";

export default function ConfirmationPage() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const registrationId = urlParams.get('id');
  
  console.log('Full URL:', window.location.href);
  console.log('Search params:', window.location.search);
  console.log('Registration ID:', registrationId);

  const { data: registration, isLoading, error } = useQuery({
    queryKey: ['/api/registrations', registrationId],
    queryFn: async () => {
      if (!registrationId) throw new Error('No registration ID');
      const response = await fetch(`/api/registrations/${registrationId}`);
      if (!response.ok) throw new Error('Registration not found');
      return response.json();
    },
    enabled: !!registrationId,
  });

  const { data: workshops } = useQuery<Workshop[]>({ queryKey: ['/api/workshops'] });
  const { data: milongas } = useQuery<Milonga[]>({ queryKey: ['/api/milongas'] });
  const { data: seats } = useQuery<Seat[]>({ queryKey: ['/api/seats'] });
  const { data: addons } = useQuery<Addon[]>({ queryKey: ['/api/addons'] });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Registration Not Found</h2>
            <p className="text-gray-600">The registration details could not be found.</p>
            <p className="text-sm text-gray-500 mt-2">Registration ID: {registrationId}</p>
            <p className="text-sm text-gray-500">Location: {location}</p>
            {error && <p className="text-sm text-red-500 mt-2">Error: {error.message}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedWorkshops = workshops?.filter(w => registration.workshopIds?.includes(w.id)) || [];
  const selectedMilongas = milongas?.filter(m => registration.milongaIds?.includes(m.id)) || [];
  const selectedSeats = seats?.filter(s => registration.seatIds?.includes(s.id)) || [];
  const selectedAddons = registration.addons || [];
  
  // Generate short code from registration ID
  const shortCode = `${registration.packageType?.toUpperCase().substring(0, 3) || 'REG'}-${registration.id.substring(0, 8).toUpperCase()}`;

  const downloadQRCode = async () => {
    try {
      const response = await fetch(`/api/registrations/${registrationId}/qr`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `registration-${registrationId}-qr.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  // Get background color based on package type
  const getBackgroundColor = () => {
    switch(registration.packageType) {
      case 'full': return 'bg-green-100';
      case 'evening': return 'bg-orange-100';
      case 'custom': return 'bg-blue-100';
      default: return 'bg-gray-50';
    }
  };

  return (
    <div className={`min-h-screen py-12 ${getBackgroundColor()}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Check-in Status for Premium Package and Accommodation Packages */}
        {(registration.packageType === 'full' || 
          registration.packageType === 'premium-accommodation-4nights' || 
          registration.packageType === 'premium-accommodation-3nights') && 
          registration.paymentStatus === 'completed' && (
          <div className="bg-green-400 border-4 border-green-500 rounded-lg p-6 mb-6 text-center shadow-lg" style={{backgroundColor: '#39ff14', borderColor: '#32cd32'}}>
            <div className="flex items-center justify-center text-black">
              <CheckCircle2 className="h-8 w-8 mr-3" />
              <span className="font-bold text-2xl">PREMIUM PACKAGE</span>
            </div>
            <p className="text-black font-semibold text-lg mt-2">
              Show this confirmation to event staff for quick check-in
            </p>
          </div>
        )}
        
        {/* Pending Payment Alert for Bank Transfer */}
        {registration.paymentMethod === 'bank_transfer' && registration.paymentStatus === 'pending' && (
          <div className="bg-red-100 border-4 border-red-500 rounded-lg p-6 mb-6 text-center shadow-lg">
            <div className="flex items-center justify-center text-red-800">
              <AlertTriangle className="h-8 w-8 mr-3" />
              <span className="font-bold text-2xl">PAYMENT PENDING</span>
            </div>
            <p className="text-red-800 font-semibold text-lg mt-2">
              Your bank transfer payment is still being processed
            </p>
            <p className="text-red-700 text-base mt-1">
              Please ensure your payment has been sent. Contact us if you need assistance.
            </p>
          </div>
        )}

        <div className="text-center mb-8">
          {/* Package Type Header */}
          <div className="mb-4">
            <div className={`inline-flex items-center px-6 py-3 rounded-full font-bold text-lg ${
              registration.packageType === 'full' ? 'bg-green-500 text-white' :
              registration.packageType === 'evening' ? 'bg-orange-500 text-white' :
              registration.packageType === 'custom' ? 'bg-blue-500 text-white' :
              registration.packageType === 'premium-accommodation-4nights' ? 'bg-purple-500 text-white' :
              registration.packageType === 'premium-accommodation-3nights' ? 'bg-purple-500 text-white' :
              'bg-gray-500 text-white'
            }`}>
              {registration.packageType === 'full' ? '🎉 PREMIUM PACKAGE' :
               registration.packageType === 'evening' ? '🌅 EVENING PACKAGE' :
               registration.packageType === 'custom' ? '✨ CUSTOM PACKAGE' :
               registration.packageType === 'premium-accommodation-4nights' ? '🏨 PREMIUM + 4 NIGHTS' :
               registration.packageType === 'premium-accommodation-3nights' ? '🏨 PREMIUM + 3 NIGHTS' :
               'PACKAGE'}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Confirmed!</h1>
          <p className="text-gray-600">Your registration for Dubai Tango Festival has been confirmed</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* QR Code Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Your QR Code</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="bg-white p-4 inline-block rounded-lg border">
                  <img 
                    src={`/api/registrations/${registrationId}/qr`} 
                    alt="Registration QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Scan this QR code to view your latest registration details
                </p>
                <Button onClick={downloadQRCode} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Registration Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Participant Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Participant Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Registration Code:</span>
                    <span className="font-mono text-lg font-bold text-primary">{shortCode}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Primary Participant</h3>
                    <p>{registration.leaderInfo?.firstName} {registration.leaderInfo?.lastName}</p>
                    <p className="text-sm text-gray-600">{registration.leaderInfo?.email}</p>
                    <p className="text-sm text-gray-600">{registration.leaderInfo?.phone}</p>
                  </div>
                  {registration.role === 'couple' && registration.followerInfo && (
                    <div>
                      <h3 className="font-semibold">Partner</h3>
                      <p>{registration.followerInfo.firstName} {registration.followerInfo.lastName}</p>
                      <p className="text-sm text-gray-600">{registration.followerInfo.email}</p>
                      <p className="text-sm text-gray-600">{registration.followerInfo.phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Package & Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Package & Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Badge 
                      variant="outline" 
                      className={`mb-2 ${
                        registration.packageType === 'full' ? 'border-green-500 text-green-700 bg-green-50' :
                        registration.packageType === 'evening' ? 'border-orange-500 text-orange-700 bg-orange-50' :
                        registration.packageType === 'custom' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                        registration.packageType === 'premium-accommodation-4nights' ? 'border-purple-500 text-purple-700 bg-purple-50' :
                        registration.packageType === 'premium-accommodation-3nights' ? 'border-purple-500 text-purple-700 bg-purple-50' :
                        ''
                      }`}
                    >
                      {registration.packageType === 'full' ? 'Premium Package' :
                       registration.packageType === 'evening' ? 'Evening Package' :
                       registration.packageType === 'custom' ? 'Custom Package' :
                       registration.packageType === 'premium-accommodation-4nights' ? 'Premium + 4 Nights Accommodation' :
                       registration.packageType === 'premium-accommodation-3nights' ? 'Premium + 3 Nights Accommodation' :
                       registration.packageType}
                    </Badge>
                    <p><strong>Role:</strong> {registration.role}</p>
                    {(registration.packageType === 'premium-accommodation-4nights' || registration.packageType === 'premium-accommodation-3nights') && (
                      <p><strong>Occupancy:</strong> {registration.role === 'couple' ? 'Double Occupancy' : 'Single Occupancy'}</p>
                    )}
                    {(registration.packageType === 'full' || registration.packageType === 'premium-accommodation-4nights' || registration.packageType === 'premium-accommodation-3nights') && (
                      <p className="text-xs text-gray-600 mt-1">
                        Includes: Up to 6 workshops, all milongas, gala dinner{registration.packageType === 'premium-accommodation-4nights' ? ', 4 nights accommodation' : registration.packageType === 'premium-accommodation-3nights' ? ', 3 nights accommodation' : ''}
                      </p>
                    )}
                    <p><strong>Total Amount:</strong> AED {registration.totalAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <Badge variant={registration.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                      {registration.paymentStatus}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-2">
                      Registration Code: {shortCode}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Workshops */}
            {selectedWorkshops.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Workshop Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedWorkshops.map(workshop => (
                      <div key={workshop.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{workshop.title}</h3>
                            <p className="text-sm text-gray-600">
                              with {workshop.instructor}
                            </p>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Calendar className="h-4 w-4 mr-1" />
                              {workshop.date} at {workshop.time}
                            </div>
                          </div>
                          <Badge variant="outline">{workshop.level}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Evening Milongas (included with Premium/Evening/Accommodation packages) */}
            {(registration.packageType === 'full' || 
              registration.packageType === 'evening' || 
              registration.packageType === 'premium-accommodation-4nights' || 
              registration.packageType === 'premium-accommodation-3nights') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Evening Milongas (Included)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {milongas?.filter(m => m.type === 'regular').map(milonga => (
                      <div key={milonga.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{milonga.name}</h3>
                            <p className="text-sm text-gray-600">{milonga.description}</p>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Calendar className="h-4 w-4 mr-1" />
                              {milonga.date} at {milonga.time}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-green-600 font-semibold">Included</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected Milongas (for custom packages) */}
            {selectedMilongas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Selected Milonga Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedMilongas.map(milonga => (
                      <div key={milonga.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{milonga.name}</h3>
                            <p className="text-sm text-gray-600">{milonga.description}</p>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Calendar className="h-4 w-4 mr-1" />
                              {milonga.date} at {milonga.time}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">AED {milonga.price}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seat Assignments */}
            {selectedSeats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Gala Dinner Seating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selectedSeats.map(seat => (
                      <div key={seat.id} className="text-center p-2 border rounded">
                        <p className="font-semibold">{seat.tableName}</p>
                        <p className="text-sm">Seat {seat.seatNumber}</p>
                        {seat.isVip && <Badge variant="default" className="text-xs">VIP</Badge>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add-ons */}
            {selectedAddons.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Add-ons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedAddons.map((addonSelection: any, index: number) => {
                      const addon = addons?.find(a => a.id === addonSelection.id);
                      if (!addon) return null;
                      
                      const optionsText = Object.entries(addonSelection.options || {})
                        .filter(([key, value]) => key !== 'allowImageUpload' && value)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');
                      
                      return (
                        <div key={`${addonSelection.id}-${index}`} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <p className="font-semibold">
                              {addon.name} 
                              {optionsText && <span className="text-gray-500 text-sm ml-2">({optionsText})</span>}
                            </p>
                            <p className="text-sm text-gray-600">{addon.description}</p>
                            <p className="text-sm text-gray-500">Quantity: {addonSelection.quantity}</p>
                          </div>
                          <p className="font-semibold">AED {(parseFloat(addon.price) * addonSelection.quantity).toFixed(2)}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-600">
            Keep this QR code handy - it always shows your most up-to-date registration information
          </p>
        </div>
      </div>
    </div>
  );
}