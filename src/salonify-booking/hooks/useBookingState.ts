import { useState, useRef } from "react";
import { endOfWeek } from "date-fns";
import { SelectedTreatment, Treatment } from "../types";

export function useBookingState(maxDate: Date) {
  // Core booking state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTreatments, setSelectedTreatments] = useState<
    SelectedTreatment[]
  >([]);
  const [submitting, setSubmitting] = useState(false);

  // Customer details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [notes, setNotes] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  // Availability state
  const [currentEndOfWeek, setCurrentEndOfWeek] = useState(
    endOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [selectedSlotData, setSelectedSlotData] = useState<any>(null);

  // Calendar state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Refs for tracking user actions
  const hasAutoSelectedToday = useRef(false);
  const isManuallySelecting = useRef(false);

  // Treatment selection handlers
  const handleTreatmentOptionSelect = (treatment: Treatment, option: any) => {
    const existingIndex = selectedTreatments.findIndex(
      (item) =>
        item.treatment.id === treatment.id && item.option.id === option.id
    );

    if (existingIndex >= 0) {
      const updatedSelections = [...selectedTreatments];
      updatedSelections.splice(existingIndex, 1);
      setSelectedTreatments(updatedSelections);
    } else {
      setSelectedTreatments([...selectedTreatments, { treatment, option }]);
    }
  };

  const removeTreatment = (index: number) => {
    const updatedSelections = [...selectedTreatments];
    updatedSelections.splice(index, 1);
    setSelectedTreatments(updatedSelections);
  };

  // Step navigation
  const handleNextStep = () => {
    if (currentStep === 1 && selectedTreatments.length > 0) {
      setCurrentStep(2);
    } else if (
      currentStep === 2 &&
      selectedDay &&
      selectedStaffId &&
      selectedTimeSlot
    ) {
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

    if (step === 2 && selectedTreatments.length > 0) {
      setCurrentStep(2);
      return;
    }

    if (
      step === 3 &&
      selectedTreatments.length > 0 &&
      selectedDay &&
      selectedStaffId &&
      selectedTimeSlot
    ) {
      setCurrentStep(3);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 50);
      return;
    }
  };

  // Reset function
  const resetToStep1 = () => {
    setSelectedTreatments([]);
    setSelectedDay(null);
    setSelectedStaffId(null);
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

  // Time slot management
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
    // State
    currentStep,
    selectedTreatments,
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
    selectedTimeSlot,
    timeSlots,
    selectedSlotData,
    calendarOpen,
    calendarMonth,
    hasAutoSelectedToday,
    isManuallySelecting,

    // Setters
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
    setSelectedTimeSlot,
    setTimeSlots,
    setSelectedSlotData,
    setCalendarOpen,
    setCalendarMonth,

    // Handlers
    handleTreatmentOptionSelect,
    removeTreatment,
    handleNextStep,
    handlePreviousStep,
    handleStepClick,
    resetToStep1,
    resetTimeSlotSelection,
  };
}

