import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, ArrowLeft, Heart, User, Users } from "lucide-react";
import { RegistrationData, PersonalInfo } from "@/pages/registration";
import { useToast } from "@/hooks/use-toast";

interface PersonalInfoStepProps {
  data: RegistrationData;
  onUpdate: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrev?: () => void;
}

export function PersonalInfoStep({ data, onUpdate, onNext, onPrev }: PersonalInfoStepProps) {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>(data.role || "");
  
  const [leaderInfo, setLeaderInfo] = useState<PersonalInfo>(
    data.leaderInfo || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      country: "",
      level: "",
    }
  );
  
  const [followerInfo, setFollowerInfo] = useState<PersonalInfo>(
    data.followerInfo || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      country: "",
      level: "",
    }
  );

  const countries = [
    "United Arab Emirates",
    "Argentina",
    "United States",
    "United Kingdom",
    "Germany",
    "France",
    "Italy",
    "Spain",
    "Brazil",
    "Other"
  ];

  const levels = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
    { value: "professional", label: "Professional" },
  ];

  const handleRoleChange = (role: 'leader' | 'follower' | 'couple') => {
    setSelectedRole(role);
    onUpdate({ role });
  };

  const validateForm = () => {
    const validatePersonalInfo = (info: PersonalInfo, role: string) => {
      if (!info.firstName || !info.lastName || !info.email || !info.phone || !info.country || !info.level) {
        toast({
          title: "Validation Error",
          description: `Please fill in all required fields for ${role}`,
          variant: "destructive",
        });
        return false;
      }
      
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(info.email)) {
        toast({
          title: "Validation Error",
          description: `Please enter a valid email address for ${role}`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    };

    if (data.role === 'couple') {
      return validatePersonalInfo(leaderInfo, 'Leader') && validatePersonalInfo(followerInfo, 'Follower');
    } else if (data.role === 'leader') {
      return validatePersonalInfo(leaderInfo, 'Leader');
    } else {
      return validatePersonalInfo(followerInfo, 'Follower');
    }
  };

  const handleNext = () => {
    if (!validateForm()) return;

    const updates: Partial<RegistrationData> = {};
    
    if (data.role === 'couple') {
      updates.leaderInfo = leaderInfo;
      updates.followerInfo = followerInfo;
    } else if (data.role === 'leader') {
      updates.leaderInfo = leaderInfo;
      updates.followerInfo = undefined;
    } else {
      updates.followerInfo = followerInfo;
      updates.leaderInfo = undefined;
    }

    onUpdate(updates);
    onNext();
  };

  const renderPersonalForm = (
    info: PersonalInfo, 
    setInfo: (info: PersonalInfo) => void, 
    title: string, 
    bgColor: string,
    icon: React.ReactNode
  ) => (
    <div className={`${bgColor} rounded-lg p-6`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        {icon}
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${title}-firstName`}>First Name *</Label>
          <Input
            id={`${title}-firstName`}
            value={info.firstName}
            onChange={(e) => setInfo({ ...info, firstName: e.target.value })}
            placeholder="Carlos"
          />
        </div>
        <div>
          <Label htmlFor={`${title}-lastName`}>Last Name *</Label>
          <Input
            id={`${title}-lastName`}
            value={info.lastName}
            onChange={(e) => setInfo({ ...info, lastName: e.target.value })}
            placeholder="Rodriguez"
          />
        </div>
        <div>
          <Label htmlFor={`${title}-email`}>Email *</Label>
          <Input
            id={`${title}-email`}
            type="email"
            value={info.email}
            onChange={(e) => setInfo({ ...info, email: e.target.value })}
            placeholder="carlos@example.com"
          />
        </div>
        <div>
          <Label htmlFor={`${title}-phone`}>Phone *</Label>
          <Input
            id={`${title}-phone`}
            type="tel"
            value={info.phone}
            onChange={(e) => setInfo({ ...info, phone: e.target.value })}
            placeholder="+971 50 123 4567"
          />
        </div>
        <div>
          <Label htmlFor={`${title}-country`}>Country *</Label>
          <select 
            id={`${title}-country`}
            value={info.country} 
            onChange={(e) => setInfo({ ...info, country: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">Select country</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`${title}-level`}>Experience Level *</Label>
          <select 
            id={`${title}-level`}
            value={info.level} 
            onChange={(e) => setInfo({ ...info, level: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">Select level</option>
            {levels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  // Show only role selection initially
  if (!data.role) {
    return (
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
            <p className="mt-2 text-gray-600">Please select how you are registering</p>
          </div>

          {/* Role Selection Only */}
          <div className="mb-8">
            <Label className="text-base font-semibold text-gray-900 block text-center mb-6">I am registering as:</Label>
            <RadioGroup
              value={selectedRole}
              onValueChange={handleRoleChange}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <div className="relative">
                <RadioGroupItem value="leader" id="leader" className="sr-only" />
                <Label
                  htmlFor="leader"
                  className="flex items-center p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-all hover:border-blue-300"
                >
                  <User className="h-8 w-8 text-blue-600 mr-4" />
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">Leader</div>
                    <div className="text-sm text-gray-500">Individual registration</div>
                  </div>
                </Label>
              </div>
              
              <div className="relative">
                <RadioGroupItem value="follower" id="follower" className="sr-only" />
                <Label
                  htmlFor="follower"
                  className="flex items-center p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-all hover:border-pink-300"
                >
                  <Heart className="h-8 w-8 text-pink-600 mr-4" />
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">Follower</div>
                    <div className="text-sm text-gray-500">Individual registration</div>
                  </div>
                </Label>
              </div>
              
              <div className="relative">
                <RadioGroupItem value="couple" id="couple" className="sr-only" />
                <Label
                  htmlFor="couple"
                  className="flex items-center p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-all hover:border-purple-300"
                >
                  <Users className="h-8 w-8 text-purple-600 mr-4" />
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">Couple</div>
                    <div className="text-sm text-gray-500">Joint registration</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            {onPrev ? (
              <Button variant="outline" onClick={onPrev}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            ) : (
              <div></div>
            )}
            <div></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
          <p className="mt-2 text-gray-600">Please provide your contact details</p>
        </div>

        {/* Selected Role Display with Option to Change */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-semibold text-gray-900">Registration Type:</Label>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onUpdate({ role: undefined })}
            >
              Change Role
            </Button>
          </div>
          <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            {data.role === 'leader' && <User className="h-6 w-6 mr-3 text-blue-600" />}
            {data.role === 'follower' && <Heart className="h-6 w-6 mr-3 text-pink-600" />}
            {data.role === 'couple' && <Users className="h-6 w-6 mr-3 text-purple-600" />}
            <div>
              <div className="font-semibold text-gray-900 capitalize">{data.role}</div>
              <div className="text-sm text-gray-600">
                {data.role === 'couple' ? 'Joint registration' : 'Individual registration'}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information Forms */}
        <div className="mb-6 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Contact Details</h3>
          <p className="text-gray-600">Please provide your contact details and tango experience level</p>
        </div>
        
        <div className="space-y-8">
          {data.role === 'couple' && (
            <>
              {renderPersonalForm(
                leaderInfo,
                setLeaderInfo,
                "Leader Information",
                "bg-blue-50",
                <User className="h-5 w-5 text-blue-600 mr-2" />
              )}
              {renderPersonalForm(
                followerInfo,
                setFollowerInfo,
                "Follower Information",
                "bg-pink-50",
                <Heart className="h-5 w-5 text-pink-600 mr-2" />
              )}
            </>
          )}
          
          {data.role === 'leader' && (
            renderPersonalForm(
              leaderInfo,
              setLeaderInfo,
              "Leader Information",
              "bg-blue-50",
              <User className="h-5 w-5 text-blue-600 mr-2" />
            )
          )}
          
          {data.role === 'follower' && (
            renderPersonalForm(
              followerInfo,
              setFollowerInfo,
              "Follower Information",
              "bg-pink-50",
              <Heart className="h-5 w-5 text-pink-600 mr-2" />
            )
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-8">
          {onPrev ? (
            <Button variant="outline" onClick={onPrev}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          ) : (
            <div></div>
          )}
          <Button onClick={handleNext} className="bg-red-700 hover:bg-red-800">
            {data.packageType === 'custom' ? 'Continue to Milongas' : data.packageType === 'evening' ? 'Continue to Gala Dinner' : 'Continue to Workshops'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
