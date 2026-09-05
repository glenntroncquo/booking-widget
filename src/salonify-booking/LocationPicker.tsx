import { MapPin } from "lucide-react";
import { cn, formatLocationAddress } from "./utils";
import { LocationOption, SalonTheme } from "./types/types";

interface LocationPickerProps {
  locations: LocationOption[];
  theme: SalonTheme;
  onSelect: (locationId: string) => void;
}

export function LocationPicker({
  locations,
  theme,
  onSelect,
}: LocationPickerProps) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Kies een vestiging</h3>
      <p className="text-gray-500 text-sm mb-4">
        Selecteer de locatie waar u wilt boeken.
      </p>
      <div className="flex flex-col gap-2">
        {locations.map((location) => {
          const address = formatLocationAddress(location);
          return (
            <button
              key={location.id}
              type="button"
              onClick={() => onSelect(location.id)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border border-gray-200",
                "hover:border-salon-primary hover:bg-salon-secondary transition-colors"
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.primaryLight, color: theme.primary }}
                >
                  <MapPin className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-gray-900">
                    {location.name}
                  </span>
                  {address ? (
                    <span className="block text-sm text-gray-500 mt-0.5">
                      {address}
                    </span>
                  ) : null}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
