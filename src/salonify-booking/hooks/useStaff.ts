import { useState, useEffect } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { StaffOption } from "../types";

export function useStaff(supabase: SupabaseClient, companyId: string) {
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchStaff() {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("get-staff", {
          body: { company_id: companyId },
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
  }, [supabase, companyId]);

  return { staff, loading };
}
