import { useState, useRef } from "react";
import { endOfWeek } from "date-fns";
import { SelectedService, Service, ServiceVariant, TimeSlot } from "../types";

export function useBookingState(
  maxDate: Date,
  initialStaffIds: string[] = []
) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    []
  );
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [notes, setNotes] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const [currentEndOfWeek, setCurrentEndOfWeek] = useState(
    endOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] =
    useState<string[]>(initialStaffIds);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotData, setSelectedSlotData] = useState<TimeSlot | null>(
    null
  );

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const hasAutoSelectedToday = useRef(false);
  const isManuallySelecting = useRef(false);
  const hasUserChangedStaff = useRef(false);

  const handleStaffSelectionChange = (staffIds: string[]) => {
    hasUserChangedStaff.current = true;
    setSelectedStaffIds(staffIds);
  };

  const handleServiceVariantSelect = (
    service: Service,
    variant: ServiceVariant
  ) => {
    const existingIndex = selectedServices.findIndex(
      (item) =>
        item.service.id === service.id && item.variant.id === variant.id
    );

    if (existingIndex >= 0) {
      const updatedSelections = [...selectedServices];
      updatedSelections.splice(existingIndex, 1);
      setSelectedServices(updatedSelections);
    } else {
      setSelectedServices([
        ...selectedServices,
        {
          service,
          variant,
          staffId: null,
        },
      ]);
    }
  };

  const removeService = (index: number) => {
    const updatedSelections = [...selectedServices];
    updatedSelections.splice(index, 1);
    setSelectedServices(updatedSelections);
  };

  const applyStaffFromSlot = (slot: TimeSlot) => {
    setSelectedServices((prev) =>
      prev.map((item, index) => {
        const segmentStaffId =
          slot.segments?.find(
            (segment) =>
              segment.serviceId === item.service.id &&
              segment.serviceVariantId === item.variant.id
          )?.staffId ?? slot.segments?.[index]?.staffId;
        return {
          ...item,
          staffId: segmentStaffId || slot.staffId || item.staffId,
        };
      })
    );
    if (slot.staffId) {
      setSelectedStaffId(slot.staffId);
    }
  };

  const canProceedFromStep1 = selectedServices.length > 0;

  const canProceedFromStep2 = Boolean(selectedDay && selectedTimeSlot);

  const handleNextStep = () => {
    if (currentStep === 1 && canProceedFromStep1) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedFromStep2) {
      setCurrentStep(3);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 50);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 2) {
        hasAutoSelectedToday.current = false;
        isManuallySelecting.current = false;
      }
    }
  };

  const handleStepClick = (step: number) => {
    if (step === 1) {
      setCurrentStep(1);
      hasAutoSelectedToday.current = false;
      isManuallySelecting.current = false;
      return;
    }

    if (step === 2 && canProceedFromStep1) {
      setCurrentStep(2);
      return;
    }

    if (step === 3 && canProceedFromStep1 && canProceedFromStep2) {
      setCurrentStep(3);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 50);
    }
  };

  const resetToStep1 = () => {
    setSelectedServices([]);
    setSelectedDay(null);
    setSelectedStaffId(null);
    setSelectedStaffIds(initialStaffIds);
    setSelectedTimeSlot(null);
    setTimeSlots([]);
    setSelectedSlotData(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setReferralCode("");
    setNotes("");
    setImagePreview(null);
    setImageData(null);
    setCurrentStep(1);
    hasAutoSelectedToday.current = false;
    isManuallySelecting.current = false;
  };

  const resetTimeSlotSelection = () => {
    const updatedTimeSlots = timeSlots.map((slot) => ({
      ...slot,
      selected: false,
    }));
    setTimeSlots(updatedTimeSlots);
    setSelectedTimeSlot(null);
    setSelectedSlotData(null);
  };

  void maxDate;

  return {
    currentStep,
    selectedServices,
    submitting,
    firstName,
    lastName,
    email,
    phone,
    referralCode,
    notes,
    imagePreview,
    imageData,
    imageUploading,
    currentEndOfWeek,
    selectedDay,
    selectedStaffId,
    selectedStaffIds,
    selectedTimeSlot,
    timeSlots,
    selectedSlotData,
    calendarOpen,
    calendarMonth,
    hasAutoSelectedToday,
    isManuallySelecting,
    hasUserChangedStaff,
    canProceedFromStep1,
    canProceedFromStep2,

    setCurrentStep,
    setSubmitting,
    setFirstName,
    setLastName,
    setEmail,
    setPhone,
    setReferralCode,
    setNotes,
    setImagePreview,
    setImageData,
    setImageUploading,
    setCurrentEndOfWeek,
    setSelectedDay,
    setSelectedStaffId,
    setSelectedStaffIds,
    setSelectedTimeSlot,
    setTimeSlots,
    setSelectedSlotData,
    setCalendarOpen,
    setCalendarMonth,

    handleStaffSelectionChange,
    handleServiceVariantSelect,
    removeService,
    applyStaffFromSlot,
    handleNextStep,
    handlePreviousStep,
    handleStepClick,
    resetToStep1,
    resetTimeSlotSelection,
  };
}
