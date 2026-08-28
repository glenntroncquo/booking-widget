import { Clock, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/accordion";
import { Badge } from "./components/badge";
import { cn, getImageUrl } from "./utils";
import {
  Service,
  ServiceVariant,
  SelectedService,
  SalonTheme,
  StaffOption,
} from "./types/types";
import { SupabaseClient } from "@supabase/supabase-js";
import { eligibleStaffIdsForVariant } from "./api";

interface ServiceSelectionProps {
  services: Service[];
  selectedServices: SelectedService[];
  staff: StaffOption[];
  shouldShowStaff: boolean;
  loading: boolean;
  theme: SalonTheme;
  supabase: SupabaseClient;
  onServiceSelect: (service: Service, variant: ServiceVariant) => void;
  onRemoveService: (index: number) => void;
  onServiceStaffChange: (index: number, staffId: string | null) => void;
}

export function ServiceSelection({
  services,
  selectedServices,
  staff,
  shouldShowStaff,
  loading,
  theme,
  supabase,
  onServiceSelect,
  onRemoveService,
  onServiceStaffChange,
}: ServiceSelectionProps) {
  const staffChoicesFor = (item: SelectedService) => {
    const eligibleIds = eligibleStaffIdsForVariant(item.service, item.variant);
    if (!eligibleIds) return staff;
    const eligible = new Set(eligibleIds);
    return staff.filter((member) => eligible.has(member.id));
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Selecteer uw behandelingen</h3>

      <div className="mb-4">
        <p className="text-gray-500 text-sm mb-4">
          Geselecteerde behandelingen:
        </p>
        <div className="flex flex-col gap-2 min-h-[26px]">
          {selectedServices.map((item, index) => {
            const choices = staffChoicesFor(item);
            return (
              <div
                key={`${item.service.id}-${item.variant.id}-${index}`}
                className="flex flex-col gap-1"
              >
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 bg-salon-primary text-salon-button rounded-full w-fit"
                >
                  <span>
                    {item.service.name}: {item.variant.name}
                  </span>
                  <button
                    onClick={() => onRemoveService(index)}
                    className="ml-1 rounded-full hover:bg-salon-primary hover:text-white p-0.5"
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Verwijderen</span>
                  </button>
                </Badge>
                {shouldShowStaff && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 pl-1">
                    <span className="shrink-0">Medewerker</span>
                    <select
                      value={item.staffId ?? ""}
                      onChange={(e) =>
                        onServiceStaffChange(index, e.target.value || null)
                      }
                      className="flex-1 min-w-0 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800"
                    >
                      <option value="">Kies medewerker</option>
                      {choices.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.first_name} {member.last_name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {loading ? (
          <div className="text-center py-8">
            <div className="flex flex-col items-center gap-4">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2 border-transparent"
                style={{ borderBottomColor: theme.primary }}
              ></div>
              <p className="text-gray-500 text-sm">Behandelingen laden...</p>
            </div>
          </div>
        ) : services.length > 0 ? (
          services.map((service) => (
            <AccordionItem key={service.id} value={service.id}>
              <AccordionTrigger className="text-left py-3">
                <div className="font-medium">{service.name}</div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="text-sm text-gray-500 mb-3">
                  {service.description}
                </div>
                <div className="space-y-3">
                  {service.service_variant
                    .sort(
                      (a, b) =>
                        (a.display_order || 0) - (b.display_order || 0)
                    )
                    .map((variant) => {
                      const isSelected = selectedServices.some(
                        (item) =>
                          item.service.id === service.id &&
                          item.variant.id === variant.id
                      );
                      const duration =
                        variant.phases && variant.phases.length > 0
                          ? variant.phases.reduce(
                              (sum, phase) => sum + phase.duration_minutes,
                              0
                            )
                          : variant.client_duration_minutes;
                      const hasFreePhase = variant.phases?.some(
                        (phase) => phase.phase_type === "free"
                      );

                      return (
                        <div
                          key={variant.id}
                          className={cn(
                            "flex items-center justify-between p-3 border rounded-lg cursor-pointer",
                            isSelected
                              ? "border-salon-primary bg-salon-primary-light"
                              : "border-gray-200 hover:border-salon-primary"
                          )}
                          onClick={() => onServiceSelect(service, variant)}
                        >
                          <div className="flex items-center gap-3">
                            {variant.image_path && (
                              <div className="flex-shrink-0">
                                <img
                                  src={
                                    getImageUrl(
                                      variant.image_path,
                                      supabase,
                                      "company"
                                    ) || undefined
                                  }
                                  alt={variant.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                  onError={(e) => {
                                    const target =
                                      e.target as HTMLImageElement;
                                    target.style.display = "none";
                                  }}
                                />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{variant.name}</div>
                              <div className="text-sm text-gray-500">
                                <Clock className="inline-block h-3 w-3 mr-1" />
                                {duration} min
                                {hasFreePhase ? " (incl. inwerktijd)" : ""}
                              </div>
                            </div>
                          </div>
                          <div className="font-bold">
                            {variant.price < 0 ? (
                              <span></span>
                            ) : variant.max_price &&
                              variant.max_price !== variant.price ? (
                              <span>
                                €{variant.price} -{" "}
                                {variant.max_price >= 9999
                                  ? "..."
                                  : `€${variant.max_price}`}
                              </span>
                            ) : (
                              <span>€{variant.price}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))
        ) : (
          <div className="py-4 text-center text-gray-500">
            Geen diensten beschikbaar
          </div>
        )}
      </Accordion>
    </div>
  );
}
