import { Clock, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/accordion";
import { Badge } from "./components/badge";
import { cn, getImageUrl } from "./utils";
import { Treatment, SelectedTreatment, SalonTheme } from "./types/types";
import { SupabaseClient } from "@supabase/supabase-js";

interface TreatmentSelectionProps {
  treatments: Treatment[];
  selectedTreatments: SelectedTreatment[];
  loading: boolean;
  theme: SalonTheme;
  supabase: SupabaseClient;
  onTreatmentSelect: (treatment: Treatment, option: any) => void;
  onRemoveTreatment: (index: number) => void;
}

export function TreatmentSelection({
  treatments,
  selectedTreatments,
  loading,
  theme,
  supabase,
  onTreatmentSelect,
  onRemoveTreatment,
}: TreatmentSelectionProps) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Selecteer uw behandelingen</h3>

      <div className="mb-4">
        <p className="text-gray-500 text-sm mb-4">
          Geselecteerde behandelingen:
        </p>
        <div className="flex flex-wrap gap-2 min-h-[26px]">
          {selectedTreatments.map((item, index) => (
            <Badge
              key={`${item.treatment.id}-${item.option.id}`}
              variant="secondary"
              className="flex items-center gap-1 bg-salon-primary text-salon-button rounded-full"
            >
              <span>
                {item.treatment.name}: {item.option.name}
              </span>
              <button
                onClick={() => onRemoveTreatment(index)}
                className="ml-1 rounded-full hover:bg-salon-primary hover:text-white p-0.5"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Verwijderen</span>
              </button>
            </Badge>
          ))}
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
        ) : treatments.length > 0 ? (
          treatments.map((treatment) => (
            <AccordionItem key={treatment.id} value={treatment.id}>
              <AccordionTrigger className="text-left py-3">
                <div className="font-medium">{treatment.name}</div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="text-sm text-gray-500 mb-3">
                  {treatment.description}
                </div>
                <div className="space-y-3">
                  {treatment.price_option
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((option) => {
                      const isSelected = selectedTreatments.some(
                        (item) =>
                          item.treatment.id === treatment.id &&
                          item.option.id === option.id,
                      );

                      return (
                        <div
                          key={option.id}
                          className={cn(
                            "flex items-center justify-between p-3 border rounded-lg cursor-pointer",
                            isSelected
                              ? "border-salon-primary bg-salon-primary-light"
                              : "border-gray-200 hover:border-salon-primary",
                          )}
                          onClick={() => onTreatmentSelect(treatment, option)}
                        >
                          <div className="flex items-center gap-3">
                            {option.image_path && (
                              <div className="flex-shrink-0">
                                <img
                                  src={
                                    getImageUrl(
                                      option.image_path,
                                      supabase,
                                      "company",
                                    ) || undefined
                                  }
                                  alt={option.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                  }}
                                />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{option.name}</div>
                              <div className="text-sm text-gray-500">
                                <Clock className="inline-block h-3 w-3 mr-1" />
                                {option.duration_in_minutes} min
                              </div>
                            </div>
                          </div>
                          <div className="font-bold">
                            {option.price < 0 ? (
                              <span></span>
                            ) : option.max_price &&
                              option.max_price !== option.price ? (
                              <span>
                                €{option.price} -{" "}
                                {option.max_price >= 9999
                                  ? "..."
                                  : `€${option.max_price}`}
                              </span>
                            ) : (
                              <span>€{option.price}</span>
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
            No treatments available
          </div>
        )}
      </Accordion>
    </div>
  );
}
