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
import { Availabilities, SelectedService, DayAvailability } from "../types";
import { invokeAvailabilityList } from "../api";

export function useAvailability(
  supabase: SupabaseClient,
  companyId: string,
  selectedServices: SelectedService[],
  selectedStaffIds: string[] = []
) {
  const [availabilities, setAvailabilities] = useState<Availabilities | null>(
    null
  );
  const [loadingAvailabilities, setLoadingAvailabilities] = useState(false);
  const [weekAvailability, setWeekAvailability] = useState<DayAvailability[]>(
    []
  );

  const fetchedMonths = useRef<Set<string>>(new Set());

  const getMonthKey = (date: Date): string => {
    return `${getYear(date)}-${getMonth(date)}`;
  };

  const fetchMonthAvailabilities = useCallback(
    async (month: Date) => {
      if (selectedServices.length === 0) return;
      if (loadingAvailabilities) return;

      const monthKey = getMonthKey(month);

      if (fetchedMonths.current.has(monthKey)) return;

      setLoadingAvailabilities(true);
      try {
        const startDate = format(startOfMonth(month), "yyyy-MM-dd");
        const endDate = format(endOfMonth(month), "yyyy-MM-dd");

        const services = selectedServices.map((item) => ({
          serviceId: item.service.id,
          serviceVariantId: item.variant.id,
          ...(item.staffId ? { staffId: item.staffId } : {}),
        }));

        const { data, error } = await invokeAvailabilityList(supabase, {
          startDate,
          endDate,
          services,
          companyId,
          ...(selectedStaffIds.length > 0
            ? { staffIds: selectedStaffIds }
            : {}),
        });

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

          fetchedMonths.current.add(monthKey);
        }
      } catch (err) {
        console.error("Failed to fetch month availabilities:", err);
      } finally {
        setLoadingAvailabilities(false);
      }
    },
    [
      selectedServices,
      supabase,
      companyId,
      loadingAvailabilities,
      selectedStaffIds,
    ]
  );

  const fetchRequiredMonths = useCallback(
    async (currentEndOfWeek: Date, weeksToShow: number = 2) => {
      if (selectedServices.length === 0) return;
      if (loadingAvailabilities) return;

      const monthsToFetch: Date[] = [];

      const weekStart = startOfWeek(currentEndOfWeek, { weekStartsOn: 1 });
      const startDate = new Date(weekStart);
      const endDate = addDays(weekStart, weeksToShow * 7);

      let currentMonth = startOfMonth(startDate);
      const lastMonth = endOfMonth(endDate);

      while (currentMonth <= lastMonth) {
        const monthKey = getMonthKey(currentMonth);

        if (!fetchedMonths.current.has(monthKey)) {
          monthsToFetch.push(new Date(currentMonth));
        }

        currentMonth = addDays(endOfMonth(currentMonth), 1);
      }

      for (const month of monthsToFetch) {
        await fetchMonthAvailabilities(month);
      }
    },
    [selectedServices, loadingAvailabilities, fetchMonthAvailabilities]
  );

  const updateWeekAvailabilityFromApi = useCallback(
    (currentEndOfWeek: Date) => {
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

          if (hasAvailability) {
            if (hasAvailability.slots && hasAvailability.slots.length > 0) {
              totalSlots = hasAvailability.slots.length;
            } else if (hasAvailability.staff) {
              totalSlots = Object.values(hasAvailability.staff).reduce(
                (total: number, staffMember) =>
                  total + staffMember.slots.length,
                0
              );
            }
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

  const resetAvailability = () => {
    setAvailabilities(null);
    setWeekAvailability([]);
    setLoadingAvailabilities(false);
    fetchedMonths.current.clear();
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
