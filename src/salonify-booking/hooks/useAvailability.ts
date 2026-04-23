import { useState, useCallback, useRef } from "react";
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  getMonth,
  getYear,
  startOfWeek,
} from "date-fns";
import { SupabaseClient } from "@supabase/supabase-js";
import { Availabilities, SelectedTreatment, DayAvailability } from "../types";

export function useAvailability(
  supabase: SupabaseClient,
  companyId: string,
  selectedTreatments: SelectedTreatment[]
) {
  const [availabilities, setAvailabilities] = useState<Availabilities | null>(
    null
  );
  const [loadingAvailabilities, setLoadingAvailabilities] = useState(false);
  const [weekAvailability, setWeekAvailability] = useState<DayAvailability[]>(
    []
  );

  // Track which months we've already fetched to avoid duplicate requests
  const fetchedMonths = useRef<Set<string>>(new Set());

  // Helper function to get month key
  const getMonthKey = (date: Date): string => {
    return `${getYear(date)}-${getMonth(date)}`;
  };

  // Fetch availabilities for a specific month
  const fetchMonthAvailabilities = useCallback(
    async (month: Date) => {
      if (selectedTreatments.length === 0) return;
      if (loadingAvailabilities) return;

      const monthKey = getMonthKey(month);

      // Skip if we've already fetched this month
      if (fetchedMonths.current.has(monthKey)) return;

      setLoadingAvailabilities(true);
      try {
        const startDate = format(startOfMonth(month), "yyyy-MM-dd");
        const endDate = format(endOfMonth(month), "yyyy-MM-dd");

        const treatments = selectedTreatments.map((item) => ({
          treatmentId: item.treatment.id,
          priceOptionId: item.option.id,
        }));

        const { data, error } = await supabase.functions.invoke(
          "get-availabilities",
          {
            body: {
              startDate,
              endDate,
              treatments,
              companyId,
            },
          }
        );

        if (error) {
          console.error("Error fetching month availabilities:", error);
          return;
        }

        if (data) {
          const newData = data as Availabilities;
          setAvailabilities((prevAvailabilities) => {
            if (!prevAvailabilities) {
              return newData;
            }

            return {
              dates: {
                ...prevAvailabilities.dates,
                ...newData.dates,
              },
            };
          });

          // Mark this month as fetched
          fetchedMonths.current.add(monthKey);
        }
      } catch (err) {
        console.error("Failed to fetch month availabilities:", err);
      } finally {
        setLoadingAvailabilities(false);
      }
    },
    [selectedTreatments, supabase, companyId, loadingAvailabilities]
  );

  // Smart month fetching - automatically detects and fetches new months
  const fetchRequiredMonths = useCallback(
    async (currentEndOfWeek: Date, weeksToShow: number = 2) => {
      if (selectedTreatments.length === 0) return;
      if (loadingAvailabilities) return;

      const monthsToFetch: Date[] = [];

      // Calculate the range of dates we need to show
      // Use week start (Monday) instead of week end to ensure we fetch the correct month
      const weekStart = startOfWeek(currentEndOfWeek, { weekStartsOn: 1 });
      const startDate = new Date(weekStart);
      const endDate = addDays(weekStart, weeksToShow * 7);

      // Get all months that fall within this range
      let currentMonth = startOfMonth(startDate);
      const lastMonth = endOfMonth(endDate);

      while (currentMonth <= lastMonth) {
        const monthKey = getMonthKey(currentMonth);

        // If we haven't fetched this month yet, add it to the fetch list
        if (!fetchedMonths.current.has(monthKey)) {
          monthsToFetch.push(new Date(currentMonth));
        }

        // Move to next month
        currentMonth = addDays(endOfMonth(currentMonth), 1);
      }

      // Fetch all required months
      for (const month of monthsToFetch) {
        await fetchMonthAvailabilities(month);
      }
    },
    [selectedTreatments, loadingAvailabilities, fetchMonthAvailabilities]
  );

  // Update week availability from API data
  const updateWeekAvailabilityFromApi = useCallback(
    (currentEndOfWeek: Date, _selectedDay: Date | null) => {
      if (!availabilities || !availabilities.dates) {
        return;
      }

      const weekStart = startOfWeek(currentEndOfWeek, { weekStartsOn: 1 });

      const updatedWeekAvailability = Array.from({ length: 7 }).map(
        (_, index) => {
          const day = addDays(weekStart, index);
          const dateKey = format(day, "yyyy-MM-dd");

          const hasAvailability = availabilities.dates[dateKey];
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
        }
      );

      setWeekAvailability(updatedWeekAvailability);
    },
    [availabilities]
  );

  // Reset availability state
  const resetAvailability = () => {
    setAvailabilities(null);
    setWeekAvailability([]);
    setLoadingAvailabilities(false);
    fetchedMonths.current.clear(); // Clear fetched months cache
  };

  return {
    availabilities,
    loadingAvailabilities,
    weekAvailability,
    fetchMonthAvailabilities,
    fetchRequiredMonths,
    updateWeekAvailabilityFromApi,
    resetAvailability,
  };
}

