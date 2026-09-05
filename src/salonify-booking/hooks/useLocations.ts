import { useState, useEffect, useCallback } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { LocationOption } from "../types/types";

function asLocation(row: unknown): LocationOption | null {
  if (typeof row !== "object" || row === null) return null;
  const record = row as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.name !== "string") {
    return null;
  }
  return {
    id: record.id,
    name: record.name,
    slug: typeof record.slug === "string" ? record.slug : null,
    city: typeof record.city === "string" ? record.city : null,
    street: typeof record.street === "string" ? record.street : null,
    postal_code:
      typeof record.postal_code === "string" ? record.postal_code : null,
    is_primary: typeof record.is_primary === "boolean" ? record.is_primary : undefined,
  };
}

function resolveFromList(
  rows: LocationOption[],
  pinnedId?: string,
  pinnedSlug?: string
): string | null {
  if (pinnedId) {
    const byId = rows.find((row) => row.id === pinnedId);
    if (byId) return byId.id;
    // Unknown pin among a loaded list: do not trust a foreign id.
    if (rows.length === 1) return rows[0].id;
    if (rows.length > 1) return null;
    return pinnedId;
  }

  if (pinnedSlug) {
    const bySlug = rows.find((row) => row.slug === pinnedSlug);
    if (bySlug) return bySlug.id;
  }

  if (rows.length === 1) return rows[0].id;
  return null;
}

export function useLocations(
  supabase: SupabaseClient,
  companyId: string,
  pinnedLocationId?: string,
  pinnedLocationSlug?: string
) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    pinnedLocationId ?? null
  );
  const [loading, setLoading] = useState(!pinnedLocationId);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!pinnedLocationId) {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from("location")
        .select("id, name, slug, city, street, postal_code, is_primary")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.warn(
          "[Salonify Widget] Failed to load locations:",
          error.message
        );
        setLoadError(true);
        setLocations([]);
        if (pinnedLocationId) {
          setSelectedId(pinnedLocationId);
        } else {
          setSelectedId(null);
        }
        setLoading(false);
        return;
      }

      const rows = (Array.isArray(data) ? data : [])
        .map(asLocation)
        .filter((row): row is LocationOption => row !== null);

      setLocations(rows);
      setLoadError(false);
      setSelectedId(resolveFromList(rows, pinnedLocationId, pinnedLocationSlug));
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [supabase, companyId, pinnedLocationId, pinnedLocationSlug]);

  const selectLocation = useCallback((locationId: string) => {
    setSelectedId(locationId);
  }, []);

  const clearLocation = useCallback(() => {
    setSelectedId(null);
  }, []);

  const selectedLocation =
    locations.find((row) => row.id === selectedId) ?? null;

  const needsPicker =
    !loading && selectedId === null && locations.length > 1;

  // Edges may run once we know a location, or after a failed/empty list
  // (single-location / flag-off fallback — trigger still stamps primary).
  const locationReady =
    selectedId !== null || (!loading && (loadError || locations.length <= 1));

  return {
    locations,
    selectedId,
    selectedLocation,
    selectLocation,
    clearLocation,
    needsPicker,
    locationReady,
    loading,
    loadError,
  };
}
