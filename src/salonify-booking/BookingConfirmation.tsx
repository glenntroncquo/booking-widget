import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Check, ArrowLeft, X, Loader2 } from "lucide-react";
import { Button } from "./components/button";
import { cn, getImageUrl } from "./utils";
import { formatEuro } from "./deposit";
import { BookingData, Availabilities, SalonTheme, StaffOption } from "./types/types";
import { useMediaQuery } from "./components/use-mobile";
import { SupabaseClient } from "@supabase/supabase-js";

interface BookingConfirmationProps {
  bookingData: BookingData;
  selectedStaffId: string | null;
  availabilities: Availabilities | null;
  staff: StaffOption[];
  theme: SalonTheme;
  supabase: SupabaseClient;
  onResetToStep1: () => void;
}

export function BookingConfirmation({
  bookingData,
  selectedStaffId,
  availabilities,
  staff,
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

  const uniqueStaffIds = Array.from(
    new Set(
      bookingData.services
        .map((item) => item.staffId)
        .filter((id): id is string => Boolean(id))
    )
  );
  const previewStaffId = uniqueStaffIds[0] ?? selectedStaffId;

  const previewImagePath = (() => {
    if (previewStaffId) {
      const fromList = staff.find((member) => member.id === previewStaffId);
      if (fromList?.image_path) return fromList.image_path;
    }
    if (previewStaffId && availabilities && bookingData.date) {
      const dateKey = format(bookingData.date, "yyyy-MM-dd");
      return (
        availabilities.dates[dateKey]?.staff?.[previewStaffId]?.image_path ??
        null
      );
    }
    return null;
  })();

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
            {bookingData.depositCanceled ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                  <X className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Betaling geannuleerd
                </h3>
                <p className="text-sm text-gray-600">
                  Je afspraak is nog niet bevestigd. Betaal het voorschot om de
                  afspraak vast te leggen.
                </p>
              </>
            ) : bookingData.depositPending ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-salon-primary-light rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-salon-primary animate-spin" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Betaling wordt verwerkt
                </h3>
                <p className="text-sm text-gray-600">
                  Even geduld — we bevestigen je afspraak zodra het voorschot
                  is verwerkt. Dit scherm vernieuwt automatisch.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Tot snel!</h3>
                {bookingData.depositPaid && (
                  <div className="text-sm font-medium text-green-700">
                    Voorschot betaald
                    {bookingData.depositAmount != null
                      ? ` · € ${formatEuro(bookingData.depositAmount)}`
                      : ""}
                  </div>
                )}
                {bookingData.referralApplied && (
                  <div className="text-sm font-medium text-green-700">
                    Referral toegepast
                  </div>
                )}
              </>
            )}
          </div>

          {(bookingData.date ||
            bookingData.staffName ||
            bookingData.services.length > 0 ||
            bookingData.locationName ||
            bookingData.depositAmount != null) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="space-y-3">
              {bookingData.date && (
                <div>
                  <div className="text-sm font-semibold text-gray-700">
                    {format(bookingData.date, "EEEE d MMMM", {
                      locale: nl,
                    })}
                  </div>
                  {bookingData.timeSlot ? (
                    <div className="text-sm text-gray-600">
                      {bookingData.timeSlot}
                    </div>
                  ) : null}
                </div>
              )}

              {(bookingData.locationName || bookingData.locationAddress) && (
                <div>
                  {bookingData.locationName ? (
                    <div className="text-sm text-gray-600">
                      {bookingData.locationName}
                    </div>
                  ) : null}
                  {bookingData.locationAddress ? (
                    <div className="text-xs text-gray-500">
                      {bookingData.locationAddress}
                    </div>
                  ) : null}
                </div>
              )}

              {bookingData.staffName && (
                <div>
                  <div className="flex items-center gap-2">
                    {previewImagePath && (
                      <img
                        src={
                          getImageUrl(previewImagePath, supabase, "company") ||
                          undefined
                        }
                        alt={bookingData.staffName}
                        className="w-6 h-6 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    )}
                    <span className="text-sm text-gray-600">
                      {bookingData.staffName}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1 pt-1">
                {bookingData.services.map((item, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    {item.service.name} - {item.variant.name}
                  </div>
                ))}
              </div>

              {bookingData.depositAmount != null &&
                !bookingData.depositCanceled && (
                  <div className="pt-2 text-sm text-gray-700">
                    Voorschot: € {formatEuro(bookingData.depositAmount)}
                  </div>
                )}
            </div>
          </div>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full py-3"
              onClick={onResetToStep1}
            >
              {bookingData.depositCanceled
                ? "Opnieuw boeken"
                : bookingData.depositPending
                  ? "Terug naar boeken"
                  : "Boek een nieuwe afspraak"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
