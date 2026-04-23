import { Check } from "lucide-react";
import { cn } from "./utils";

interface BookingStepperProps {
  currentStep: number;
  selectedTreatments: any[];
  selectedDay: Date | null;
  selectedStaffId: string | null;
  selectedTimeSlot: string | null;
  onStepClick: (step: number) => void;
}

export function BookingStepper({
  currentStep,
  selectedTreatments,
  selectedDay,
  selectedStaffId,
  selectedTimeSlot,
  onStepClick,
}: BookingStepperProps) {
  return (
    <div className="px-4 pt-6 pb-4 border-b">
      <h2 className="text-lg font-bold mb-4 text-center">
        Boek een afspraak
      </h2>
      <div className="flex items-center justify-between">
        <div
          className="flex flex-col items-center cursor-pointer"
          onClick={() => onStepClick(1)}
        >
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full mb-1 transition-colors hover:opacity-80",
              currentStep >= 1 ? "bg-salon-primary text-white" : "bg-gray-200"
            )}
          >
            {currentStep > 1 ? <Check className="h-5 w-5" /> : "1"}
          </div>
          <span
            className={cn(
              "text-xs",
              currentStep >= 1
                ? "text-salon-primary font-medium"
                : "text-gray-500"
            )}
          >
            Dienst
          </span>
        </div>

        <div className="w-full max-w-[60px] h-[2px] bg-gray-200 mx-1">
          <div
            className={cn(
              "h-full bg-salon-primary",
              currentStep >= 2 ? "w-full" : "w-0"
            )}
            style={{ transition: "width 0.3s ease" }}
          ></div>
        </div>

        <div
          className={cn(
            "flex flex-col items-center",
            selectedTreatments.length > 0
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-50"
          )}
          onClick={() => onStepClick(2)}
        >
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full mb-1 transition-colors",
              currentStep >= 2 ? "bg-salon-primary text-white" : "bg-gray-200",
              selectedTreatments.length > 0 && "hover:opacity-80"
            )}
          >
            {currentStep > 2 ? <Check className="h-5 w-5" /> : "2"}
          </div>
          <span
            className={cn(
              "text-xs",
              currentStep >= 2
                ? "text-salon-primary font-medium"
                : "text-gray-500"
            )}
          >
            Datum & tijd
          </span>
        </div>

        <div className="w-full max-w-[60px] h-[2px] bg-gray-200 mx-1">
          <div
            className={cn(
              "h-full bg-salon-primary",
              currentStep >= 3 ? "w-full" : "w-0"
            )}
            style={{ transition: "width 0.3s ease" }}
          ></div>
        </div>

        <div
          className={cn(
            "flex flex-col items-center",
            selectedTreatments.length > 0 &&
              selectedDay &&
              selectedStaffId &&
              selectedTimeSlot
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-50"
          )}
          onClick={() => onStepClick(3)}
        >
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full mb-1 transition-colors",
              currentStep >= 3 ? "bg-salon-primary text-white" : "bg-gray-200",
              selectedTreatments.length > 0 &&
                selectedDay &&
                selectedStaffId &&
                selectedTimeSlot &&
                "hover:opacity-80"
            )}
          >
            3
          </div>
          <span
            className={cn(
              "text-xs",
              currentStep >= 3
                ? "text-salon-primary font-medium"
                : "text-gray-500"
            )}
          >
            Details
          </span>
        </div>
      </div>
    </div>
  );
}

