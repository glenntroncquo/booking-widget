import { Users } from "lucide-react";
import { SupabaseClient } from "@supabase/supabase-js";
import { Popover, PopoverContent, PopoverTrigger } from "./components/popover";
import { cn, getImageUrl } from "./utils";
import { StaffOption } from "./types/types";

interface StaffSelectorProps {
  staff: StaffOption[];
  selectedStaffIds: string[];
  loading: boolean;
  supabase: SupabaseClient;
  onChange: (staffIds: string[]) => void;
}

export function StaffSelector({
  staff,
  selectedStaffIds,
  loading,
  supabase,
  onChange,
}: StaffSelectorProps) {
  const toggleStaff = (id: string) => {
    if (selectedStaffIds.includes(id)) {
      onChange(selectedStaffIds.filter((s) => s !== id));
    } else {
      onChange([...selectedStaffIds, id]);
    }
  };

  const selectedCount = selectedStaffIds.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Kies medewerker"
          className={cn(
            "relative flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 transition-colors",
            selectedCount > 0
              ? "text-salon-primary"
              : "text-gray-500 hover:text-salon-primary"
          )}
        >
          <Users className="h-5 w-5" />
          {selectedCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-salon-primary text-white text-[10px] font-semibold">
              {selectedCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-1.5 bg-white rounded-xl shadow-lg"
      >
        {loading ? (
          <div className="px-3 py-4 text-sm text-center text-gray-500">
            Laden...
          </div>
        ) : staff.length === 0 ? (
          <div className="px-3 py-4 text-sm text-center text-gray-400">
            Geen medewerkers
          </div>
        ) : (
          <div
            className="overflow-y-auto flex flex-col gap-0.5"
            style={{ maxHeight: "calc(10 * 3.75rem)" }}
          >
            {staff.map((member) => {
              const isSelected = selectedStaffIds.includes(member.id);
              const url = member.image_path
                ? getImageUrl(member.image_path, supabase, "company")
                : null;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleStaff(member.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors outline-none focus:outline-none focus-visible:outline-none focus-visible:bg-gray-50",
                    isSelected ? "bg-salon-primary-light" : "hover:bg-gray-50"
                  )}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={`${member.first_name} ${member.last_name}`}
                      className={cn(
                        "w-11 h-11 rounded-full object-cover border border-gray-200 flex-shrink-0 transition-all",
                        isSelected && "ring-2 ring-salon-primary ring-offset-1"
                      )}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.visibility = "hidden";
                      }}
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-11 h-11 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 uppercase leading-none flex-shrink-0 transition-all",
                        isSelected && "ring-2 ring-salon-primary ring-offset-1"
                      )}
                    >
                      {member.first_name.charAt(0)}
                      {member.last_name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-sm font-semibold truncate",
                        isSelected ? "text-salon-primary" : "text-gray-900"
                      )}
                    >
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      Medewerker
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
