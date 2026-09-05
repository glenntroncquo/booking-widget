import { useState, useEffect } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { StaffOption } from "../types";
import { invokeStaffList, locationBody } from "../api";

export function useStaff(
  supabase: SupabaseClient,
  companyId: string,
  locationId: string | null = null,
  locationReady = true
) {
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchStaff() {
      if (!locationReady) {
        setStaff([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await invokeStaffList(supabase, {
          company_id: companyId,
          ...locationBody(locationId),
        });

        if (cancelled) return;

        if (error) {
          console.error("Error fetching staff:", error);
          setStaff([]);
          return;
        }

        if (Array.isArray(data)) {
          setStaff(data as StaffOption[]);
        } else {
          setStaff([]);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch staff:", err);
          setStaff([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchStaff();

    return () => {
      cancelled = true;
    };
  }, [supabase, companyId, locationId, locationReady]);

  return { staff, loading };
}
