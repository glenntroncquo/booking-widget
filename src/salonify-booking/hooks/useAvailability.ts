import { useState, useCallback, useRef, useEffect } from "react";
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
import { invokeAvailabilityList, locationBody } from "../api";

/** Cache key for one availability month. Must include tenant + shop. */
export function availabilityMonthKey(
  companyId: string,
  locationId: string | null,
  date: Date
): string {
  return `${companyId}:${locationId ?? "none"}:${getYear(date)}-${getMonth(date)}`;
}

export function useAvailability(
  supabase: SupabaseClient,
  companyId: string,
  selectedServices: SelectedService[],
  selectedStaffIds: string[] = [],
  locationId: string | null = null,
  locationReady = true,
  requireLocation = false
) {
  const [availabilities, setAvailabilities] = useState<Availabilities | null>(
    null
  );
  const [loadingAvailabilities, setLoadingAvailabilities] = useState(false);
  const [weekAvailability, setWeekAvailability] = useState<DayAvailability[]>(
    []
  );

  const fetchedMonths = useRef<Set<string>>(new Set());
  const inFlightMonths = useRef<Set<string>>(new Set());
  const scopeEpochRef = useRef(0);

  const clearCache = useCallback(() => {
    scopeEpochRef.current += 1;
    fetchedMonths.current.clear();
    inFlightMonths.current.clear();
    setAvailabilities(null);
    setWeekAvailability([]);
    setLoadingAvailabilities(false);
  }, []);

  useEffect(() => {
    clearCache();
  }, [companyId, locationId, clearCache]);

  const fetchMonthAvailabilities = useCallback(
    async (month: Date) => {
      if (!locationReady || (requireLocation && !locationId)) return;
      if (selectedServices.length === 0) return;

      const monthKey = availabilityMonthKey(companyId, locationId, month);
      if (fetchedMonths.current.has(monthKey)) return;
      if (inFlightMonths.current.has(monthKey)) return;

      const epoch = scopeEpochRef.current;
      inFlightMonths.current.add(monthKey);
      setLoadingAvailabilities(true);
      try {
        const startDate = format(startOfMonth(month), "yyyy-MM-dd");
        const endDate = format(endOfMonth(month), "yyyy-MM-dd");

        const services = selectedServices.map((item) => ({
          serviceId: item.service.id,
          serviceVariantId: item.variant.id,
        }));

        const { data, error } = await invokeAvailabilityList(supabase, {
          startDate,
          endDate,
          services,
          companyId,
          ...locationBody(locationId),
          ...(selectedStaffIds.length > 0
            ? { staffIds: selectedStaffIds }
            : {}),
        });

        if (scopeEpochRef.current !== epoch) return;

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
        if (scopeEpochRef.current !== epoch) return;
        console.error("Failed to fetch month availabilities:", err);
      } finally {
        if (scopeEpochRef.current !== epoch) return;
        inFlightMonths.current.delete(monthKey);
        setLoadingAvailabilities(inFlightMonths.current.size > 0);
      }
    },
    [
      selectedServices,
      supabase,
      companyId,
      selectedStaffIds,
      locationId,
      locationReady,
      requireLocation,
    ]
  );

  const fetchRequiredMonths = useCallback(
    async (currentEndOfWeek: Date, weeksToShow: number = 2) => {
      if (!locationReady || (requireLocation && !locationId)) return;
      if (selectedServices.length === 0) return;

      const monthsToFetch: Date[] = [];

      const weekStart = startOfWeek(currentEndOfWeek, { weekStartsOn: 1 });
      const startDate = new Date(weekStart);
      const endDate = addDays(weekStart, weeksToShow * 7);

      let currentMonth = startOfMonth(startDate);
      const lastMonth = endOfMonth(endDate);

      while (currentMonth <= lastMonth) {
        const monthKey = availabilityMonthKey(
          companyId,
          locationId,
          currentMonth
        );

        if (
          !fetchedMonths.current.has(monthKey) &&
          !inFlightMonths.current.has(monthKey)
        ) {
          monthsToFetch.push(new Date(currentMonth));
        }

        currentMonth = addDays(endOfMonth(currentMonth), 1);
      }

      for (const month of monthsToFetch) {
        await fetchMonthAvailabilities(month);
      }
    },
    [
      selectedServices,
      fetchMonthAvailabilities,
      locationReady,
      companyId,
      locationId,
      requireLocation,
    ]
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

  const resetAvailability = clearCache;

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
