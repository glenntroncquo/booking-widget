import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Check, ArrowLeft } from "lucide-react";
import { Button } from "./components/button";
import { cn, getImageUrl } from "./utils";
import { BookingData, Availabilities, SalonTheme } from "./types/types";
import { useMediaQuery } from "./components/use-mobile";
import { SupabaseClient } from "@supabase/supabase-js";

interface BookingConfirmationProps {
  bookingData: BookingData;
  selectedStaffId: string | null;
  availabilities: Availabilities | null;
  theme: SalonTheme;
  supabase: SupabaseClient;
  onResetToStep1: () => void;
}

export function BookingConfirmation({
  bookingData,
  selectedStaffId,
  availabilities,
  theme,
  supabase,
  onResetToStep1,
}: BookingConfirmationProps) {
  const isMobile = useMediaQuery("(max-width: 448px)");

  const themeStyles = {
    "--salon-primary": theme.primary,
    "--salon-primary-hover": theme.primaryHover,
    "--salon-primary-light": theme.primaryLight,
    "--salon-secondary": theme.secondary,
    "--salon-text": theme.text,
    "--salon-background": theme.background,
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "w-full bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100",
        isMobile
          ? "min-h-[80vh] max-h-[80vh] flex flex-col"
          : "max-w-md mx-auto"
      )}
      style={themeStyles}
    >
      <div className="px-4 pt-6 pb-4 border-b flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onResetToStep1}
          className="mr-3"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-bold flex-1 text-center">Bevestiging</h2>
      </div>

      <div
        className={cn(
          isMobile ? "flex-1 overflow-y-auto" : "p-4",
          "h-[500px] overflow-y-auto"
        )}
      >
        <div className={cn(isMobile ? "p-4" : "", "text-center")}>
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Tot snel!</h3>
            {bookingData.referralApplied && (
              <div className="text-sm font-medium text-green-700">
                Referral toegepast
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-gray-700">
                  {format(bookingData.date, "EEEE d MMMM", {
                    locale: nl,
                  })}
                </div>
                <div className="text-sm text-gray-600">{bookingData.timeSlot}</div>
              </div>

              {bookingData.staffName && (
                <div>
                  <div className="text-sm font-semibold text-gray-700"></div>
                  <div className="flex items-center gap-2">
                    {selectedStaffId && availabilities && bookingData.date && (
                      <>
                        {(() => {
                          const dateKey = format(bookingData.date, "yyyy-MM-dd");
                          const dayAvailability = availabilities.dates[dateKey];
                          const staffMember =
                            dayAvailability?.staff[selectedStaffId];
                          return staffMember?.image_path ? (
                            <img
                              src={
                                getImageUrl(
                                  staffMember.image_path,
                                  supabase,
                                  "company"
                                ) || undefined
                              }
                              alt={bookingData.staffName}
                              className="w-6 h-6 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />
                          ) : null;
                        })()}
                      </>
                    )}
                    <span className="text-sm text-gray-600">
                      {bookingData.staffName}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full py-3"
              onClick={onResetToStep1}
            >
              Boek een nieuwe afspraak
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

