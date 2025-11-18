import { User, GraduationCap, Utensils, ShoppingBag, CreditCard } from "lucide-react";

interface ProgressIndicatorProps {
  currentStep: number;
  packageType?: string;
}

export function ProgressIndicator({ currentStep, packageType }: ProgressIndicatorProps) {
  // Different step flows based on package type
  const getSteps = () => {
    if (packageType === 'evening') {
      return [
        { number: 1, name: "Package", icon: ShoppingBag },
        { number: 2, name: "Personal Info", icon: User },
        { number: 3, name: "Gala Dinner", icon: Utensils },
        { number: 4, name: "Workshops", icon: GraduationCap },
        { number: 5, name: "Add-ons", icon: ShoppingBag },
        { number: 6, name: "Payment", icon: CreditCard },
      ];
    } else if (packageType === 'custom') {
      return [
        { number: 1, name: "Package", icon: ShoppingBag },
        { number: 2, name: "Personal Info", icon: User },
        { number: 3, name: "Workshops", icon: GraduationCap },
        { number: 4, name: "Milongas", icon: GraduationCap },
        { number: 5, name: "Gala Dinner", icon: Utensils },
        { number: 6, name: "Add-ons", icon: ShoppingBag },
        { number: 7, name: "Payment", icon: CreditCard },
      ];
    } else {
      // Premium package and accommodation packages - same flow
      return [
        { number: 1, name: "Package", icon: ShoppingBag },
        { number: 2, name: "Personal Info", icon: User },
        { number: 3, name: "Workshops", icon: GraduationCap },
        { number: 4, name: "Gala Dinner", icon: Utensils },
        { number: 5, name: "Add-ons", icon: ShoppingBag },
        { number: 6, name: "Payment", icon: CreditCard },
      ];
    }
  };

  const steps = getSteps();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center justify-center">
            {steps.map((step, stepIdx) => {
              const Icon = step.icon;
              const isCompleted = step.number < currentStep;
              const isCurrent = step.number === currentStep;
              
              return (
                <li key={step.name} className={stepIdx !== steps.length - 1 ? "relative flex-1 text-center" : "relative flex-1 text-center"}>
                  {stepIdx !== steps.length - 1 && (
                    <div className="absolute top-3 sm:top-4 left-1/2 w-full h-0.5 -translate-y-1/2" aria-hidden="true">
                      <div className={`h-0.5 w-full ${isCompleted ? 'bg-primary' : 'bg-gray-200'}`} />
                    </div>
                  )}
                  <div className="relative flex flex-col items-center">
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full ${
                      isCompleted || isCurrent 
                        ? 'bg-primary' 
                        : 'bg-gray-200'
                    }`}>
                      <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                        isCompleted || isCurrent 
                          ? 'text-white' 
                          : 'text-gray-500'
                      }`} />
                    </div>
                    <span className={`mt-1 sm:mt-2 text-xs font-medium ${
                      isCompleted || isCurrent 
                        ? 'text-primary' 
                        : 'text-gray-500'
                    }`}>
                      <span className="hidden sm:inline">{step.name}</span>
                      <span className="sm:hidden">{step.number}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
