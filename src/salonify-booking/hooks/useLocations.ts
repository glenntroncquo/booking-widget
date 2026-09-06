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

function readMultiLocationFlag(row: unknown): boolean {
  if (typeof row !== "object" || row === null) return false;
  return (row as { multi_location_enabled?: unknown }).multi_location_enabled === true;
}

export function isMultiLocationCompany(
  multiLocationEnabled: boolean,
  locationCount: number
): boolean {
  return multiLocationEnabled || locationCount > 1;
}

/** Edges may run only with a selected location, or the single-location / flag-off fallback. */
export function computeLocationReady(args: {
  selectedId: string | null;
  loading: boolean;
  loadError: boolean;
  locationCount: number;
  multiLocationEnabled: boolean;
}): boolean {
  if (args.selectedId !== null) return true;
  if (args.loading) return false;
  if (isMultiLocationCompany(args.multiLocationEnabled, args.locationCount)) {
    return false;
  }
  return args.loadError || args.locationCount <= 1;
}

/** Multi-location company with no selected id and no picker list — show error, not company-wide edges. */
export function computeLocationBlocked(args: {
  selectedId: string | null;
  loading: boolean;
  locationCount: number;
  multiLocationEnabled: boolean;
}): boolean {
  if (args.loading || args.selectedId !== null) return false;
  if (!isMultiLocationCompany(args.multiLocationEnabled, args.locationCount)) {
    return false;
  }
  return args.locationCount <= 1;
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
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!pinnedLocationId) {
        setLoading(true);
      }

      const [locationResult, companyResult] = await Promise.all([
        supabase
          .from("location")
          .select("id, name, slug, city, street, postal_code, is_primary")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("is_primary", { ascending: false })
          .order("name", { ascending: true }),
        supabase
          .from("company")
          .select("multi_location_enabled")
          .eq("id", companyId)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const flag = companyResult.error
        ? false
        : readMultiLocationFlag(companyResult.data);
      setMultiLocationEnabled(flag);

      if (locationResult.error) {
        console.warn(
          "[Salonify Widget] Failed to load locations:",
          locationResult.error.message
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

      const rows = (Array.isArray(locationResult.data) ? locationResult.data : [])
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
  }, [supabase, companyId, pinnedLocationId, pinnedLocationSlug, reloadNonce]);

  const selectLocation = useCallback((locationId: string) => {
    setSelectedId(locationId);
  }, []);

  const clearLocation = useCallback(() => {
    setSelectedId(null);
  }, []);

  const reload = useCallback(() => {
    setLoadError(false);
    setLoading(true);
    setReloadNonce((nonce) => nonce + 1);
  }, []);

  const selectedLocation =
    locations.find((row) => row.id === selectedId) ?? null;

  const isMultiLocation = isMultiLocationCompany(
    multiLocationEnabled,
    locations.length
  );

  const needsPicker =
    !loading && selectedId === null && locations.length > 1;

  const locationBlocked = computeLocationBlocked({
    selectedId,
    loading,
    locationCount: locations.length,
    multiLocationEnabled,
  });

  const locationReady = computeLocationReady({
    selectedId,
    loading,
    loadError,
    locationCount: locations.length,
    multiLocationEnabled,
  });

  return {
    locations,
    selectedId,
    selectedLocation,
    selectLocation,
    clearLocation,
    reload,
    needsPicker,
    locationBlocked,
    locationReady,
    isMultiLocation,
    multiLocationEnabled,
    loading,
    loadError,
  };
}
