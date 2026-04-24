import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  format,
  addDays,
  isSameDay,
  startOfWeek,
  isBefore,
  isAfter,
  endOfWeek,
  addMonths,
} from "date-fns";
import { toast, Toaster } from "sonner";
import confetti from "canvas-confetti";
import { createClient } from "@supabase/supabase-js";

import { cn } from "./utils";
import { useMediaQuery } from "./components/use-mobile";

import {
  SalonBookingProps,
  defaultTheme,
  DayAvailability,
  Treatment,
  BookingData,
} from "./types/types";
import {
  calculateTotalPrice,
  calculateTotalDuration,
  formatTimeDisplay,
  isValidPhone,
} from "./utils";
import { TreatmentSelection } from "./TreatmentSelection";
import { DateTimeSelection } from "./DateTimeSelection";
import { CustomerDetails } from "./CustomerDetails";
import { BookingConfirmation } from "./BookingConfirmation";
import { BookingStepper } from "./BookingStepper";
import { BookingFooter } from "./BookingFooter";
import { useBookingState, useAvailability, useImageUpload } from "./hooks";

export function SalonBooking({
  companyId,
  supabaseConfig,
  theme = defaultTheme,
  maxDate = addMonths(new Date(), 3),
  shouldShowStaff = true,
}: SalonBookingProps) {
  // Create Supabase client from config
  const supabase = useMemo(() => {
    return createClient(supabaseConfig.url, supabaseConfig.anonKey);
  }, [supabaseConfig.url, supabaseConfig.anonKey]);
  const themeStyles = {
    "--salon-primary": theme.primary,
    "--salon-primary-hover": theme.primaryHover,
    "--salon-primary-light": theme.primaryLight,
    "--salon-secondary": theme.secondary,
    "--salon-text": theme.text,
    "--salon-background": theme.background,
    "--salon-button": theme.buttonText,
  } as React.CSSProperties;

  const isMobile = useMediaQuery("(max-width: 448px)");

  // Custom hooks for state management
  const bookingState = useBookingState(maxDate);
  const availability = useAvailability(
    supabase,
    companyId,
    bookingState.selectedTreatments
  );
  const imageUpload = useImageUpload();

  // Local state
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] =
    useState<BookingData | null>(null);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailInputClosing, setEmailInputClosing] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Email close handler with animation
  const handleCloseEmailInput = () => {
    setEmailInputClosing(true);
    setTimeout(() => {
      setShowEmailInput(false);
      setEmailInputClosing(false);
      setEmailSuccess(false);
      setEmailError("");
      setEmail("");
    }, 300); // Match animation duration
  };

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Email submission handler
  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      setEmailError("Vul een e-mailadres in");
      return;
    }

    if (!isValidEmail(email)) {
      setEmailError("Vul een geldig e-mailadres in");
      return;
    }

    setEmailSubmitting(true);
    setEmailError("");

    try {
      const response = await supabase.functions.invoke(
        "send-appointment-history",
        {
          body: {
            email: email.trim(),
            companyId: companyId,
          },
        }
      );

      // Check if we have data even without error
      if (response.data) {
        // Handle the case where no appointments are found
        if (
          response.data.success === false &&
          response.data.message?.includes("No appointments found")
        ) {
          setEmailError("Geen afspraken gevonden voor dit e-mailadres.");
          return;
        }

        // Handle other error cases from the function
        if (response.data.success === false) {
          setEmailError(response.data.error || "Er is een fout opgetreden.");
          return;
        }
      }

      // Success!
      setEmailSuccess(true);

      // Auto-close after 3 seconds
      setTimeout(() => {
        handleCloseEmailInput();
      }, 3000);
    } catch (error) {
      console.error("Error submitting email:e", error);

      // More specific error messages
      const errorMessage =
        error instanceof Error ? error.message : "Onbekende fout";

      if (errorMessage.includes("Failed to send a request")) {
        setEmailError(
          "Kan geen verbinding maken met de server. Controleer je internetverbinding."
        );
      } else if (errorMessage.includes("Function not found")) {
        setEmailError(
          "De functie is niet beschikbaar. Neem contact op met de beheerder."
        );
      } else {
        setEmailError(`Er is een fout opgetreden: ${errorMessage}`);
      }
    } finally {
      setEmailSubmitting(false);
    }
  };

  // Fetch treatments from Supabase
  useEffect(() => {
    async function fetchTreatments() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("treatment")
          .select(
            `
          id,
          name,
          description,
          company_id,
          order,
          price_option (
            id,
            name,
            price,
            max_price,
            duration_in_minutes,
            image_path,
            order
          )
        `
          )
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("order");

        if (error) {
          console.error("Error fetching treatments:", error);
          return;
        }

        if (data) {
          setTreatments(data as Treatment[]);
        }
      } catch (err) {
        console.error("Failed to fetch treatments:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTreatments();
  }, [supabase, companyId]);

  // Update time slots for a selected day and staff member
  const updateTimeSlotsForSelectedDay = useCallback(
    (day: Date, staffId?: string) => {
      if (!availability.availabilities) {
        return;
      }

      const dateKey = format(day, "yyyy-MM-dd");
      const dayAvailability = availability.availabilities.dates[dateKey];

      if (dayAvailability && dayAvailability.staff && staffId) {
        const staffMember = dayAvailability.staff[staffId];

        if (staffMember && staffMember.slots && staffMember.slots.length > 0) {
          const newTimeSlots = staffMember.slots.map((slot: any) => {
            const startTime = formatTimeDisplay(slot.start_time);

            return {
              time: startTime,
              selected: false,
              staffId: slot.staff_id,
              startTime: slot.start_time,
              endTime: slot.end_time,
              availableStart: slot.available_start,
              availableEnd: slot.available_end,
            };
          });

          bookingState.setTimeSlots(newTimeSlots);
        } else {
          bookingState.setTimeSlots([]);
        }
      } else {
        bookingState.setTimeSlots([]);
      }
    },
    [availability.availabilities, bookingState.setTimeSlots]
  );

  // Update week availability from API data
  const updateWeekAvailabilityFromApi = useCallback(() => {
    if (!availability.availabilities || !availability.availabilities.dates) {
      return;
    }

    const weekStart = startOfWeek(bookingState.currentEndOfWeek, {
      weekStartsOn: 1,
    });

    Array.from({ length: 7 }).map((_, index) => {
      const day = addDays(weekStart, index);
      const dateKey = format(day, "yyyy-MM-dd");

      const hasAvailability = availability.availabilities!.dates[dateKey];
      let totalSlots = 0;

      if (hasAvailability && hasAvailability.staff) {
        totalSlots = Object.values(hasAvailability.staff).reduce(
          (total: number, staffMember: any) => total + staffMember.slots.length,
          0
        );
      }

      return {
        date: day,
        slots: totalSlots,
        available: totalSlots > 0,
      };
    });

    availability.updateWeekAvailabilityFromApi(
      bookingState.currentEndOfWeek,
      bookingState.selectedDay
    );

    if (bookingState.selectedDay) {
      updateTimeSlotsForSelectedDay(bookingState.selectedDay);
    }
  }, [
    availability.availabilities,
    availability.updateWeekAvailabilityFromApi,
    bookingState.currentEndOfWeek,
    bookingState.selectedDay,
    updateTimeSlotsForSelectedDay,
  ]);

  useEffect(() => {
    if (availability.availabilities && availability.availabilities.dates) {
      updateWeekAvailabilityFromApi();
    }
  }, [
    bookingState.currentEndOfWeek,
    availability.availabilities,
    updateWeekAvailabilityFromApi,
  ]);

  // Reset availability when treatments change
  useEffect(() => {
    // Clear availability data when treatments change to force refetch
    availability.resetAvailability();

    // Also clear day/time selection to force user to reselect
    bookingState.setSelectedDay(null);
    bookingState.setSelectedStaffId(null);
    bookingState.setSelectedTimeSlot(null);
    bookingState.setSelectedSlotData(null);
    bookingState.setTimeSlots([]);
  }, [
    bookingState.selectedTreatments.length,
    JSON.stringify(
      bookingState.selectedTreatments.map((t) => ({
        treatmentId: t.treatment.id,
        optionId: t.option.id,
      }))
    ),
  ]);

  useEffect(() => {
    if (
      bookingState.currentStep === 2 &&
      bookingState.selectedTreatments.length > 0
    ) {
      // Use smart month fetching - automatically detects and fetches required months
      // This will fetch the current month and any new months that contain the weeks we're showing
      availability.fetchRequiredMonths(bookingState.currentEndOfWeek, 2);
    }
  }, [
    bookingState.currentStep,
    bookingState.currentEndOfWeek,
    bookingState.selectedTreatments,
    availability,
  ]);

  // Navigation handlers
  const handlePreviousWeek = () => {
    const currentWeekStart = addDays(bookingState.currentEndOfWeek, -7);
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    if (isBefore(currentWeekStart, weekStart)) return;

    const newWeekEnd = addDays(bookingState.currentEndOfWeek, -7);
    bookingState.setCurrentEndOfWeek(newWeekEnd);

    // Check if we need to fetch new months for the previous week
    if (bookingState.selectedTreatments.length > 0) {
      availability.fetchRequiredMonths(newWeekEnd, 2);
    }
  };

  const handleNextWeek = () => {
    const nextWeekStart = addDays(bookingState.currentEndOfWeek, 1);
    const maxDateOnly = new Date(maxDate);
    maxDateOnly.setHours(0, 0, 0, 0);
    if (isAfter(nextWeekStart, maxDateOnly)) return;

    const newWeekEnd = addDays(bookingState.currentEndOfWeek, 7);
    bookingState.setCurrentEndOfWeek(newWeekEnd);

    // Check if we need to fetch new months for the next week
    if (bookingState.selectedTreatments.length > 0) {
      availability.fetchRequiredMonths(newWeekEnd, 2);
    }
  };

  const handleDaySelect = (day: DayAvailability) => {
    bookingState.isManuallySelecting.current = true;
    bookingState.setSelectedDay(day.date);
    bookingState.setSelectedStaffId(null);
    bookingState.resetTimeSlotSelection();

    setTimeout(() => {
      bookingState.isManuallySelecting.current = false;
    }, 10);
  };

  const handleStaffSelect = (staffId: string) => {
    bookingState.setSelectedStaffId(staffId);
    bookingState.resetTimeSlotSelection();

    if (bookingState.selectedDay && availability.availabilities) {
      updateTimeSlotsForSelectedDay(bookingState.selectedDay, staffId);
    }
  };

  const isPreviousWeekDisabled = () => {
    const currentWeekStart = addDays(bookingState.currentEndOfWeek, -7);
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return isBefore(currentWeekStart, weekStart);
  };

  const isNextWeekDisabled = () => {
    const nextWeekStart = addDays(bookingState.currentEndOfWeek, 1);
    const maxDateOnly = new Date(maxDate);
    maxDateOnly.setHours(0, 0, 0, 0);
    return isAfter(nextWeekStart, maxDateOnly);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      bookingState.isManuallySelecting.current = true;
      bookingState.setSelectedDay(date);

      // Check if the selected date is in a different week and update week view accordingly
      const selectedWeekEnd = endOfWeek(date, { weekStartsOn: 1 });
      if (!isSameDay(selectedWeekEnd, bookingState.currentEndOfWeek)) {
        bookingState.setCurrentEndOfWeek(selectedWeekEnd);
      }

      bookingState.setSelectedStaffId(null);
      bookingState.resetTimeSlotSelection();
      bookingState.setCalendarOpen(false);

      setTimeout(() => {
        bookingState.isManuallySelecting.current = false;
      }, 10);
    }
  };

  const dateHasAvailability = (date: Date): boolean => {
    if (!availability.availabilities || !availability.availabilities.dates)
      return false;
    if (bookingState.selectedDay && isSameDay(date, bookingState.selectedDay))
      return false;

    const dateKey = format(date, "yyyy-MM-dd");
    const dayAvailability = availability.availabilities.dates[dateKey];

    if (!dayAvailability || !dayAvailability.staff) return false;

    const totalSlots = Object.values(dayAvailability.staff).reduce(
      (total: number, staffMember: any) => total + staffMember.slots.length,
      0
    );

    return totalSlots > 0;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const maxDateOnly = new Date(maxDate);
    maxDateOnly.setHours(0, 0, 0, 0);

    return isBefore(dateOnly, today) || isAfter(dateOnly, maxDateOnly);
  };

  // Form validation
  const validateForm = (): boolean => {
    if (!bookingState.firstName.trim()) {
      toast.error("Vul alstublieft uw voornaam in");
      return false;
    }

    if (!bookingState.lastName.trim()) {
      toast.error("Vul alstublieft uw achternaam in");
      return false;
    }

    if (!bookingState.email.trim()) {
      toast.error("Vul alstublieft uw e-mailadres in");
      return false;
    }

    if (!isValidEmail(bookingState.email)) {
      toast.error("Vul een geldig e-mailadres in");
      return false;
    }

    if (!bookingState.phone.trim()) {
      toast.error("Vul alstublieft uw telefoonnummer in");
      return false;
    }

    if (!isValidPhone(bookingState.phone)) {
      toast.error("Vul een geldig telefoonnummer in");
      return false;
    }

    return true;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      bookingState.setSubmitting(true);
      if (
        !bookingState.selectedDay ||
        !bookingState.selectedStaffId ||
        !bookingState.selectedTimeSlot
      ) {
        toast.error(
          "Er is een probleem met de geselecteerde datum, medewerker of tijd."
        );
        return;
      }

      const totalDuration = calculateTotalDuration(
        bookingState.selectedTreatments
      );
      const appointmentDate = bookingState.selectedDay;
      const timeString = bookingState.selectedTimeSlot;

      let hours = 0;
      let minutes = 0;

      if (timeString.includes("AM") || timeString.includes("PM")) {
        const [timePart, period] = timeString.split(" ");
        const [h, m] = timePart.split(":").map(Number);
        hours =
          period === "PM" && h !== 12
            ? h + 12
            : period === "AM" && h === 12
              ? 0
              : h;
        minutes = m;
      } else {
        const [h, m] = timeString.split(":").map(Number);
        hours = h;
        minutes = m;
      }

      const startTime = new Date(appointmentDate);
      startTime.setHours(hours);
      startTime.setMinutes(minutes);

      const tzOffset = startTime.getTimezoneOffset();
      const startTimeUTC = new Date(startTime.getTime() - tzOffset * 60 * 1000);
      const endTimeUTC = new Date(
        startTimeUTC.getTime() + totalDuration * 60 * 1000
      );

      // Transform all selected treatments into the new format
      const treatmentsPayload = bookingState.selectedTreatments.map((item) => ({
        treatmentId: item.treatment.id,
        priceOptionId: item.option.id,
      }));

      const totalPrice = bookingState.selectedTreatments.reduce(
        (sum, item) => sum + item.option.price,
        0
      );

      const referralCodeTrimmed = bookingState.referralCode.trim();

      const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === "object" && value !== null;

      const tryParseJson = (value: unknown): unknown | undefined => {
        if (!value) return undefined;
        if (typeof value === "object") return value;
        if (typeof value !== "string") return undefined;
        try {
          return JSON.parse(value) as unknown;
        } catch {
          return undefined;
        }
      };

      const normalizeString = (value: unknown): string | undefined => {
        if (typeof value !== "string") return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      };

      const extractErrorKey = (response: {
        data: unknown;
        error: unknown;
      }): string | undefined => {
        if (isRecord(response.data) && typeof response.data.errorKey === "string") {
          return response.data.errorKey;
        }

        const errObj = response.error as
          | { context?: { body?: unknown }; message?: unknown }
          | undefined;
        const ctxBody = errObj?.context?.body;
        const ctxJson = tryParseJson(ctxBody);
        if (isRecord(ctxJson) && typeof ctxJson.errorKey === "string") {
          return ctxJson.errorKey;
        }

        const msgJson = tryParseJson(errObj?.message);
        if (isRecord(msgJson) && typeof msgJson.errorKey === "string") {
          return msgJson.errorKey;
        }

        return undefined;
      };

      const extractErrorMessage = (response: {
        data: unknown;
        error: unknown;
      }): string | undefined => {
        if (isRecord(response.data)) {
          const m =
            normalizeString(response.data.message) ||
            normalizeString(response.data.error) ||
            normalizeString(response.data.errorMessage);
          if (m) return m;
        }

        const errObj = response.error as
          | { context?: { body?: unknown }; message?: unknown }
          | undefined;

        const ctxJson = tryParseJson(errObj?.context?.body);
        if (isRecord(ctxJson)) {
          const m =
            normalizeString(ctxJson.message) ||
            normalizeString(ctxJson.error) ||
            normalizeString(ctxJson.errorMessage);
          if (m) return m;
        }

        return normalizeString(errObj?.message);
      };

      const friendlyErrorMessage = (errorKeyOrMessage: string): string | undefined => {
        // Exact/known errorKey values
        switch (errorKeyOrMessage) {
          case "REFERRAL_INVALID":
            return "Die referralcode bestaat niet.";
          case "REFERRAL_INACTIVE":
            return "Deze referralcode is niet meer actief.";
          case "REFERRAL_EXPIRED":
            return "Deze referralcode is verlopen.";
          case "REFERRAL_NOT_NEW_CLIENT":
            return "Referralcodes zijn alleen geldig voor nieuwe klanten bij deze salon.";
          case "REFERRAL_REDEMPTION_CONFLICT":
            return "Deze referral kan niet worden toegepast op deze boeking.";
          case "CONFLICT_DETECTED":
          case "TIME_SLOT_ALREADY_BOOKED":
          case "BOOKING_SLOT_TAKEN":
            return "Dit tijdslot is net geboekt—kies een ander tijdstip.";
          case "NOT_AVAILABLE":
            return "Dit tijdstip valt buiten de beschikbaarheid van de medewerker.";
          case "CONCURRENCY_RETRY":
            return "Het ging net mis door drukte. Probeer het nog eens.";
          case "BOOKING_FAILED":
            return "Boeken is niet gelukt. Probeer het opnieuw.";
          default:
            break;
        }

        // Heuristics for raw Postgres errors that sometimes leak as errorKey/SQLERRM
        const lower = errorKeyOrMessage.toLowerCase();
        if (lower.includes("method not allowed") || lower.includes("405")) {
          return "Boeken is tijdelijk niet mogelijk. Probeer het later opnieuw.";
        }
        if (
          lower.includes("could not serialize") ||
          lower.includes("serialization failure") ||
          lower.includes("deadlock detected")
        ) {
          return "Het ging net mis door drukte. Probeer het nog eens.";
        }
        if (lower.includes("duplicate key") || lower.includes("unique constraint")) {
          return "Dit tijdslot is net geboekt—kies een ander tijdstip.";
        }
        if (lower.includes("invalid image data format")) {
          return "De afbeelding is ongeldig. Upload een andere afbeelding of boek zonder afbeelding.";
        }
        if (lower.includes("image upload failed")) {
          return "Uploaden van de afbeelding is mislukt. Probeer het opnieuw of boek zonder afbeelding.";
        }
        if (lower.includes("missing required fields") || lower.includes("invalid treatments array")) {
          return "Controleer je gegevens en probeer opnieuw.";
        }
        if (lower.includes("each treatment must have treatmentid") || lower.includes("priceoptionid")) {
          return "Er is iets misgegaan met de gekozen behandeling(en). Probeer opnieuw.";
        }
        if (lower.includes("internal server error")) {
          return "Er ging iets mis aan onze kant. Probeer het later opnieuw.";
        }

        // Edge-function level message strings (when no errorKey)
        if (errorKeyOrMessage === "Method not allowed") {
          return "Boeken is tijdelijk niet mogelijk. Probeer het later opnieuw.";
        }
        if (errorKeyOrMessage === "Missing required fields or invalid treatments array") {
          return "Controleer je gegevens en probeer opnieuw.";
        }
        if (errorKeyOrMessage === "Each treatment must have treatmentId and priceOptionId") {
          return "Er is iets misgegaan met de gekozen behandeling(en). Probeer opnieuw.";
        }
        if (errorKeyOrMessage === "Invalid image data format") {
          return "De afbeelding is ongeldig. Upload een andere afbeelding of boek zonder afbeelding.";
        }
        if (errorKeyOrMessage === "Image upload failed") {
          return "Uploaden van de afbeelding is mislukt. Probeer het opnieuw of boek zonder afbeelding.";
        }
        if (errorKeyOrMessage === "Internal server error") {
          return "Er ging iets mis aan onze kant. Probeer het later opnieuw.";
        }

        return undefined;
      };

      const response = await supabase.functions.invoke("book-appointmentv2", {
        body: {
          start: startTimeUTC.toISOString(),
          end: endTimeUTC.toISOString(),
          staffId: bookingState.selectedSlotData?.staffId || "",
          companyId,
          treatments: treatmentsPayload,
          price: totalPrice,
          duration: totalDuration,
          firstName: bookingState.firstName,
          lastName: bookingState.lastName,
          email: bookingState.email,
          phone: bookingState.phone,
          notes: bookingState.notes || "",
          imageData: imageUpload.imageData,
          ...(referralCodeTrimmed.length > 0
            ? { referralCode: referralCodeTrimmed }
            : {}),
        },
      });

      const errorKeyFromResponse = extractErrorKey(response);
      const errorMessageFromResponse = extractErrorMessage(response);
      const hasReferralCode = referralCodeTrimmed.length > 0;

      const functionReturnedFailure =
        isRecord(response.data) && response.data.success === false;

      if (response.error || functionReturnedFailure) {
        const messageFromKey = errorKeyFromResponse
          ? friendlyErrorMessage(errorKeyFromResponse)
          : undefined;
        const messageFromMessage = errorMessageFromResponse
          ? friendlyErrorMessage(errorMessageFromResponse)
          : undefined;

        console.error("Error booking appointment:", {
          errorKey: errorKeyFromResponse,
          errorMessage: errorMessageFromResponse,
          hasReferralCode,
          error: response.error,
          data: response.data,
        });

        toast.error(
          messageFromKey ||
            messageFromMessage ||
            "Er is een fout opgetreden bij het boeken van uw afspraak. Probeer het opnieuw."
        );
        return;
      }

      const staffName = (() => {
        if (
          bookingState.selectedStaffId &&
          availability.availabilities &&
          bookingState.selectedDay
        ) {
          const dateKey = format(bookingState.selectedDay, "yyyy-MM-dd");
          const dayAvailability = availability.availabilities.dates[dateKey];
          const staffMember =
            dayAvailability?.staff[bookingState.selectedStaffId];
          return staffMember
            ? `${staffMember.first_name} ${staffMember.last_name}`
            : "";
        }
        return "";
      })();

      setConfirmedBookingData({
        date: bookingState.selectedDay,
        timeSlot: bookingState.selectedTimeSlot,
        staffName,
        treatments: [...bookingState.selectedTreatments],
        totalPrice: calculateTotalPrice(bookingState.selectedTreatments),
        referralApplied: referralCodeTrimmed.length > 0,
      });

      toast.success(
        "Afspraak succesvol ingepland! Wij hebben een bevestiging naar uw e-mailadres gestuurd."
      );
      setShowConfirmation(true);

      if (isMobile) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Failed to book appointment:", err);
      toast.error(
        "Er is een fout opgetreden bij het boeken van uw afspraak. Probeer het opnieuw."
      );
    } finally {
      bookingState.setSubmitting(false);
    }
  };

  // Confetti effect when confirmation is first shown
  useEffect(() => {
    if (showConfirmation && confirmedBookingData) {
      const timer1 = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#FF6B9D", "#FFB3D1", "#FFF0F5", "#E91E63"],
        });
      }, 300);

      const timer2 = setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6, x: 0.25 },
          colors: ["#FF6B9D", "#FFB3D1", "#FFF0F5", "#E91E63"],
        });
      }, 500);

      const timer3 = setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6, x: 0.75 },
          colors: ["#FF6B9D", "#FFB3D1", "#FFF0F5", "#E91E63"],
        });
      }, 700);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [showConfirmation, confirmedBookingData]);

  // If showing confirmation, render separate confirmation view
  if (showConfirmation && confirmedBookingData) {
    return (
      <>
        <Toaster position="bottom-right" />
        <style>
          {`
            .bg-salon-primary { background-color: var(--salon-primary) !important; }
            .hover\\:bg-salon-primary-hover:hover { background-color: var(--salon-primary-hover) !important; }
            .bg-salon-primary-hover { background-color: var(--salon-primary-hover) !important; }
            .bg-salon-primary-light { background-color: var(--salon-primary-light) !important; }
            .bg-salon-secondary { background-color: var(--salon-secondary) !important; }
            .bg-salon-background { background-color: var(--salon-background) !important; }
            .text-salon-primary { color: var(--salon-primary) !important; }
            .text-salon-text { color: var(--salon-text) !important; }
            .border-salon-primary { border-color: var(--salon-primary) !important; }
            .hover\\:border-salon-primary:hover { border-color: var(--salon-primary) !important; }
          `}
        </style>
        <BookingConfirmation
          bookingData={confirmedBookingData}
          selectedStaffId={bookingState.selectedStaffId}
          availabilities={availability.availabilities}
          theme={theme}
          supabase={supabase}
          onResetToStep1={() => {
            bookingState.resetToStep1();
            setShowConfirmation(false);
            setConfirmedBookingData(null);
          }}
        />
      </>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" />
      <style>
        {`
          .bg-salon-primary { background-color: var(--salon-primary) !important; }
          .hover\\:bg-salon-primary-hover:hover { background-color: var(--salon-primary-hover) !important; }
          .bg-salon-primary-hover { background-color: var(--salon-primary-hover) !important; }
          .bg-salon-primary-light { background-color: var(--salon-primary-light) !important; }
          .bg-salon-secondary { background-color: var(--salon-secondary) !important; }
          .bg-salon-background { background-color: var(--salon-background) !important; }
          .text-salon-primary { color: var(--salon-primary) !important; }
          .text-salon-text { color: var(--salon-primary) !important; }
          .border-salon-primary { border-color: var(--salon-primary) !important; }
          .hover\\:border-salon-primary:hover { border-color: var(--salon-primary) !important; }
          .text-salon-button { color: var(--salon-button) !important; }
          
          .calendar-available-date {
            position: relative !important;
            font-weight: 600 !important;
            background-color: rgb(220, 252, 231) !important;
          }
          
          @keyframes slideInFromBottom {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          @keyframes slideOutToBottom {
            from {
              transform: translateY(0);
              opacity: 1;
            }
            to {
              transform: translateY(100%);
              opacity: 0;
            }
          }
        `}
      </style>

      <div
        className={cn(
          "w-full bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100 relative",
          isMobile
            ? "min-h-[80vh] max-h-[80vh] flex flex-col"
            : "max-w-md mx-auto"
        )}
        style={themeStyles}
      >
        <BookingStepper
          currentStep={bookingState.currentStep}
          selectedTreatments={bookingState.selectedTreatments}
          selectedDay={bookingState.selectedDay}
          selectedStaffId={bookingState.selectedStaffId}
          selectedTimeSlot={bookingState.selectedTimeSlot}
          onStepClick={bookingState.handleStepClick}
        />

        <div
          className={cn(
            isMobile ? "flex-1 overflow-y-auto" : "p-4",
            "h-[500px] overflow-y-auto"
          )}
        >
          <div className={cn(isMobile ? "p-4" : "")}>
            {bookingState.currentStep === 1 && (
              <TreatmentSelection
                treatments={treatments}
                selectedTreatments={bookingState.selectedTreatments}
                loading={loading}
                theme={theme}
                supabase={supabase}
                onTreatmentSelect={bookingState.handleTreatmentOptionSelect}
                onRemoveTreatment={bookingState.removeTreatment}
              />
            )}

            {bookingState.currentStep === 2 && (
              <DateTimeSelection
                selectedTreatments={bookingState.selectedTreatments}
                availabilities={availability.availabilities}
                loadingAvailabilities={availability.loadingAvailabilities}
                weekAvailability={availability.weekAvailability}
                currentEndOfWeek={bookingState.currentEndOfWeek}
                selectedDay={bookingState.selectedDay}
                calendarOpen={bookingState.calendarOpen}
                calendarMonth={bookingState.calendarMonth}
                selectedStaffId={bookingState.selectedStaffId}
                selectedTimeSlot={bookingState.selectedTimeSlot}
                timeSlots={bookingState.timeSlots}
                maxDate={maxDate}
                theme={theme}
                supabase={supabase}
                shouldShowStaff={shouldShowStaff}
                onPreviousWeek={handlePreviousWeek}
                onNextWeek={handleNextWeek}
                onDaySelect={handleDaySelect}
                onStaffSelect={handleStaffSelect}
                onTimeSlotSelect={(timeSlot, slotData) => {
                  bookingState.setSelectedTimeSlot(timeSlot);
                  bookingState.setSelectedSlotData(slotData);
                }}
                onCalendarOpenChange={bookingState.setCalendarOpen}
                onCalendarSelect={handleCalendarSelect}
                onCalendarMonthChange={(month) => {
                  bookingState.setCalendarMonth(month);
                  if (bookingState.selectedTreatments.length > 0) {
                    availability.fetchMonthAvailabilities(month);
                  }
                }}
                dateHasAvailability={dateHasAvailability}
                isDateDisabled={isDateDisabled}
                isPreviousWeekDisabled={isPreviousWeekDisabled}
                isNextWeekDisabled={isNextWeekDisabled}
              />
            )}

            {bookingState.currentStep === 3 && (
              <CustomerDetails
                selectedTreatments={bookingState.selectedTreatments}
                selectedDay={bookingState.selectedDay}
                selectedTimeSlot={bookingState.selectedTimeSlot}
                selectedStaffId={bookingState.selectedStaffId}
                availabilities={availability.availabilities}
                firstName={bookingState.firstName}
                lastName={bookingState.lastName}
                email={bookingState.email}
                phone={bookingState.phone}
                referralCode={bookingState.referralCode}
                notes={bookingState.notes}
                imagePreview={imageUpload.imagePreview}
                imageUploading={imageUpload.imageUploading}
                theme={theme}
                supabase={supabase}
                onFirstNameChange={bookingState.setFirstName}
                onLastNameChange={bookingState.setLastName}
                onEmailChange={bookingState.setEmail}
                onPhoneChange={bookingState.setPhone}
                onReferralCodeChange={bookingState.setReferralCode}
                onNotesChange={bookingState.setNotes}
                onImageUpload={imageUpload.handleImageUpload}
                onRemoveImage={imageUpload.removeImage}
              />
            )}
          </div>
        </div>

        <BookingFooter
          isMobile={isMobile}
          currentStep={bookingState.currentStep}
          selectedTreatments={bookingState.selectedTreatments}
          submitting={bookingState.submitting}
          onPreviousStep={bookingState.handlePreviousStep}
          onNextStep={bookingState.handleNextStep}
          onSubmit={handleSubmit}
          onShowEmailInput={() => setShowEmailInput(true)}
        />

        {showEmailInput && (
          <>
            <div
              className="absolute inset-0 bg-black bg-opacity-50 z-40"
              onClick={handleCloseEmailInput}
              style={{
                animation: "fadeIn 0.3s ease-out",
              }}
            />

            <div
              className="absolute bottom-0 left-0 right-0 z-50 bg-white border-t rounded-b-xl shadow-2xl"
              style={{
                animation: emailInputClosing
                  ? "slideOutToBottom 0.3s ease-in"
                  : "slideInFromBottom 0.3s ease-out",
                boxShadow: "0 -4px 25px rgba(0, 0, 0, 0.15)",
              }}
            >
              <div className="p-4">
                {!emailSuccess && (
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      Heb je hier al eerder geboekt?
                    </h3>
                    <button
                      onClick={handleCloseEmailInput}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )}
                {emailSuccess ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      E-mail verstuurd!
                    </h3>
                    <p className="text-gray-600 mb-1">
                      Je ontvangt binnen enkele minuten een e-mail met je
                      afspraken.
                    </p>
                    <p className="text-sm text-gray-500">
                      Controleer ook je spam folder
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-3">
                      Voer het e-mailadres in waarmee is geboekt en ontvang een
                      e-mail met jouw geplande afspraken.
                    </p>
                    <div className="space-y-3">
                      <input
                        type="email"
                        placeholder="E-mailadres*"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-salon-primary focus:border-transparent ${
                          emailError ? "border-red-300" : "border-gray-300"
                        }`}
                      />
                      {emailError && (
                        <p className="text-sm text-red-600">{emailError}</p>
                      )}
                      <button
                        onClick={handleEmailSubmit}
                        disabled={!email.trim() || emailSubmitting}
                        className="w-full bg-salon-primary hover:bg-salon-primary-hover text-white px-4 py-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: "var(--salon-primary)" }}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                        {emailSubmitting ? "Bezig..." : "Afspraken ontvangen"}
                      </button>
                      <p className="text-xs text-gray-500 text-center">
                        Geen e-mail ontvangen? Dat betekent dat het e-mailadres
                        niet bij ons bekend is.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

