import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Upload, X } from "lucide-react";
import { Label } from "./components/label";
import { Input } from "./components/input";
import { Textarea } from "./components/textarea";
import { cn, calculateTotalPriceRange, getImageUrl } from "./utils";
import { SelectedTreatment, Availabilities, SalonTheme } from "./types/types";
import { SupabaseClient } from "@supabase/supabase-js";

interface CustomerDetailsProps {
  selectedTreatments: SelectedTreatment[];
  selectedDay: Date | null;
  selectedTimeSlot: string | null;
  selectedStaffId: string | null;
  availabilities: Availabilities | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  imagePreview: string | null;
  imageUploading: boolean;
  theme: SalonTheme;
  supabase: SupabaseClient;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

export function CustomerDetails({
  selectedTreatments,
  selectedDay,
  selectedTimeSlot,
  selectedStaffId,
  availabilities,
  firstName,
  lastName,
  email,
  phone,
  notes,
  imagePreview,
  imageUploading,
  theme,
  supabase,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPhoneChange,
  onNotesChange,
  onImageUpload,
  onRemoveImage,
}: CustomerDetailsProps) {
  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
        <div className="border-b border-gray-200 pb-3 mb-3">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            {selectedDay
              ? format(selectedDay, "EEEE d MMM", { locale: nl })
              : ""}{" "}
            om {selectedTimeSlot}
          </div>
          <div className="flex items-center gap-2">
            {selectedStaffId && availabilities && selectedDay && (
              <>
                {(() => {
                  const dateKey = format(selectedDay, "yyyy-MM-dd");
                  const dayAvailability = availabilities.dates[dateKey];
                  const staffMember = dayAvailability?.staff[selectedStaffId];
                  return staffMember ? (
                    <>
                      {staffMember.image_path && (
                        <img
                          src={
                            getImageUrl(
                              staffMember.image_path,
                              supabase,
                              "company"
                            ) || undefined
                          }
                          alt={`${staffMember.first_name} ${staffMember.last_name}`}
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      )}
                      <span className="text-sm text-gray-600">
                        {staffMember.first_name} {staffMember.last_name}
                      </span>
                    </>
                  ) : null;
                })()}
              </>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {selectedTreatments.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-gray-700">
                {item.treatment.name} - {item.option.name}
              </span>
              <span className="text-sm text-gray-700">
                {item.option.price < 0 ? (
                  ""
                ) : (
                  <>
                    €{" "}
                    {item.option.max_price &&
                    item.option.max_price !== item.option.price
                      ? `${item.option.price.toFixed(2).replace(".", ",")} - ${
                          item.option.max_price >= 9999
                            ? "..."
                            : item.option.max_price.toFixed(2).replace(".", ",")
                        }`
                      : item.option.price.toFixed(2).replace(".", ",")}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Totaal</span>
            <span className="font-semibold text-gray-700">
              {(() => {
                const priceRange = calculateTotalPriceRange(selectedTreatments);
                if (priceRange.baseTotal < 0) {
                  return "";
                }
                return (
                  <>
                    €{" "}
                    {priceRange.hasOpenEndedPricing
                      ? `${priceRange.baseTotal
                          .toFixed(2)
                          .replace(".", ",")} - ...`
                      : priceRange.hasRange
                        ? `${priceRange.baseTotal
                            .toFixed(2)
                            .replace(".", ",")} - ${priceRange.maxTotal
                            .toFixed(2)
                            .replace(".", ",")}`
                        : priceRange.baseTotal.toFixed(2).replace(".", ",")}
                  </>
                );
              })()}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">
              Voornaam <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              className="mt-1"
              style={{ fontSize: "16px" }}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">
              Naam <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              className="mt-1"
              style={{ fontSize: "16px" }}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">
            E-mailadres <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="mt-1"
            style={{ fontSize: "16px" }}
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">
            Telefoonnummer <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="mt-1"
            style={{ fontSize: "16px" }}
            required
          />
        </div>

        <div>
          <Label htmlFor="notes">Aanvullende opmerkingen</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="mt-1"
            placeholder="Specifieke verzoeken of informatie"
            rows={3}
            style={{ fontSize: "16px" }}
          />
        </div>

        <div>
          <Label htmlFor="image">Referentieafbeelding (Optioneel)</Label>
          <div className="mt-1">
            {imagePreview ? (
              <div className="relative border border-gray-300 rounded-lg p-2">
                <img
                  src={imagePreview}
                  alt="Voorbeeld"
                  className="max-h-36 mx-auto rounded-lg"
                />
                <button
                  type="button"
                  onClick={onRemoveImage}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Verwijderen</span>
                </button>
              </div>
            ) : (
              <label
                htmlFor="image-upload"
                className={cn(
                  "cursor-pointer flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 w-full",
                  imageUploading && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="text-center">
                  {imageUploading ? (
                    <>
                      <div
                        className="animate-spin rounded-full h-8 w-8 border-b-2 border-transparent mx-auto mb-2"
                        style={{ borderBottomColor: theme.primary }}
                      ></div>
                      <p className="text-sm text-gray-500">Uploaden...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        Upload referentieafbeelding
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Max. 5MB, formaat wordt automatisch aangepast
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={onImageUpload}
                  className="hidden"
                  disabled={imageUploading}
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

