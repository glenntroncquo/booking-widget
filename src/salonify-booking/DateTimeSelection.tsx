import {
  format,
  addDays,
  isSameDay,
  startOfWeek,
  isBefore,
  isAfter,
} from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./components/button";
import { Popover, PopoverContent, PopoverTrigger } from "./components/popover";
import { Calendar } from "./components/calendar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/accordion";
import { useMediaQuery } from "./components/use-mobile";
import { cn, calculateTotalDuration, getImageUrl, formatTimeDisplay } from "./utils";
import {
  SelectedTreatment,
  DayAvailability,
  Availabilities,
  TimeSlot,
  SalonTheme,
} from "./types/types";
import { SupabaseClient } from "@supabase/supabase-js";

interface DateTimeSelectionProps {
  selectedTreatments: SelectedTreatment[];
  availabilities: Availabilities | null;
  loadingAvailabilities: boolean;
  weekAvailability: DayAvailability[];
  currentEndOfWeek: Date;
  selectedDay: Date | null;
  calendarOpen: boolean;
  calendarMonth: Date;
  selectedStaffId: string | null;
  selectedTimeSlot: string | null;
  timeSlots: TimeSlot[];
  maxDate: Date;
  theme: SalonTheme;
  supabase: SupabaseClient;
  shouldShowStaff: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onDaySelect: (day: DayAvailability) => void;
  onStaffSelect: (staffId: string) => void;
  onTimeSlotSelect: (timeSlot: string, slotData: TimeSlot) => void;
  onCalendarOpenChange: (open: boolean) => void;
  onCalendarSelect: (date: Date | undefined) => void;
  onCalendarMonthChange: (month: Date) => void;
  dateHasAvailability: (date: Date) => boolean;
  isDateDisabled: (date: Date) => boolean;
  isPreviousWeekDisabled: () => boolean;
  isNextWeekDisabled: () => boolean;
}

export function DateTimeSelection({
  selectedTreatments,
  availabilities,
  loadingAvailabilities,
  weekAvailability,
  currentEndOfWeek,
  selectedDay,
  calendarOpen,
  calendarMonth,
  selectedStaffId,
  selectedTimeSlot,
  maxDate,
  theme,
  supabase,
  shouldShowStaff,
  onPreviousWeek,
  onNextWeek,
  onDaySelect,
  onStaffSelect,
  onTimeSlotSelect,
  onCalendarOpenChange,
  onCalendarSelect,
  onCalendarMonthChange,
  dateHasAvailability,
  isDateDisabled,
  isPreviousWeekDisabled,
  isNextWeekDisabled,
}: DateTimeSelectionProps) {
  const isMobile = useMediaQuery("(max-width: 448px)");
  void theme;

  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Selecteer datum & tijd</h3>
      <p className="text-gray-500 text-sm mb-4">
        {selectedTreatments.length} dienst
        {selectedTreatments.length !== 1 ? "en" : ""} geselecteerd (
        {calculateTotalDuration(selectedTreatments)} min totaal)
      </p>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1 mr-2">
            <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="truncate">
                    {format(addDays(currentEndOfWeek, -7), "MMM d")} -{" "}
                    {format(currentEndOfWeek, "MMM d")}
                  </span>
                  <CalendarIcon className="ml-2 h-4 w-4 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 bg-white border border-gray-200 shadow-lg"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={selectedDay || undefined}
                  onSelect={onCalendarSelect}
                  disabled={isDateDisabled}
                  month={calendarMonth}
                  onMonthChange={onCalendarMonthChange}
                  fromDate={new Date()}
                  toDate={maxDate}
                  initialFocus
                  modifiers={{
                    available: (date) => dateHasAvailability(date),
                  }}
                  modifiersClassNames={{
                    available: "calendar-available-date",
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onPreviousWeek}
              className="h-9 w-9 rounded-md p-0 shrink-0"
              disabled={isPreviousWeekDisabled()}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Vorige week</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onNextWeek}
              className="h-9 w-9 rounded-md p-0 shrink-0"
              disabled={isNextWeekDisabled()}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Volgende week</span>
            </Button>
          </div>
        </div>

        {loadingAvailabilities ? (
          <div className="grid grid-cols-7 gap-1 mb-6">
            {Array.from({ length: 7 }).map((_, index) => {
              const skeletonDate = addDays(
                startOfWeek(currentEndOfWeek, { weekStartsOn: 1 }),
                index
              );
              const dayFormat = isMobile ? "E" : "EEE";

              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg bg-gray-50 animate-pulse opacity-70"
                  disabled
                >
                  <span className="text-xs sm:text-sm font-medium text-gray-400">
                    {format(skeletonDate, dayFormat)}
                  </span>
                  <span className="text-lg sm:text-2xl font-bold my-0.5 sm:my-1 text-gray-300">
                    {format(skeletonDate, "d")}
                  </span>
                  <span className="text-[10px] sm:text-xs rounded-full px-1 sm:px-2 py-0.5 flex items-center gap-0.5 sm:gap-1 bg-gray-200 text-gray-400">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-300"></span>
                    -
                  </span>
                </Button>
              );
            })}
          </div>
        ) : weekAvailability.length > 0 ? (
          <>
            <div className="grid grid-cols-7 gap-1 mb-6">
              {weekAvailability.map((day, index) => {
                const dayFormat = isMobile ? "E" : "EEE";

                const isOutOfRange = isAfter(
                  addDays(day.date, 0),
                  new Date(maxDate.setHours(0, 0, 0, 0))
                );
                const isBeforeToday = isBefore(
                  new Date(day.date.setHours(0, 0, 0, 0)),
                  new Date(new Date().setHours(0, 0, 0, 0))
                );

                return (
                  <Button
                    key={index}
                    variant={
                      isSameDay(day.date, selectedDay || new Date())
                        ? "default"
                        : "outline"
                    }
                    className={cn(
                      "h-auto flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg",
                      isSameDay(day.date, selectedDay || new Date())
                        ? "bg-salon-primary text-white"
                        : "bg-white",
                      !day.available && "opacity-70"
                    )}
                    onClick={() => onDaySelect(day)}
                    disabled={!day.available || isOutOfRange || isBeforeToday}
                  >
                    <span className="text-xs sm:text-sm font-medium">
                      {format(day.date, dayFormat)}
                    </span>
                    <span className="text-lg sm:text-2xl font-bold my-0.5 sm:my-1">
                      {format(day.date, "d")}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] sm:text-xs rounded-full px-1 sm:px-2 py-0.5 flex items-center gap-0.5 sm:gap-1",
                        isSameDay(day.date, selectedDay || new Date())
                          ? "bg-salon-secondary text-salon-text"
                          : day.slots > 0
                            ? "bg-salon-secondary text-salon-text"
                            : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {day.slots > 0 ? (
                        <>
                          <span
                            className={cn(
                              "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
                              isSameDay(day.date, selectedDay || new Date())
                                ? "bg-white"
                                : "bg-salon-primary"
                            )}
                          />
                          {day.slots}
                        </>
                      ) : (
                        "-"
                      )}
                    </span>
                  </Button>
                );
              })}
            </div>

            {selectedDay &&
              availabilities &&
              availabilities.dates[format(selectedDay, "yyyy-MM-dd")] && (
                <div className="mb-6">
                  {shouldShowStaff ? (
                    <Accordion type="single" collapsible className="w-full">
                      {Object.entries(
                        availabilities.dates[format(selectedDay, "yyyy-MM-dd")]
                          .staff
                      ).map(([staffId, staffMember]) => (
                        <AccordionItem key={staffId} value={staffId}>
                          <AccordionTrigger className="text-left py-3">
                            <div className="flex items-center gap-3">
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
                                  className="w-12 h-12 rounded-lg object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                  }}
                                />
                              )}
                              <div>
                                <div className="font-medium">
                                  {staffMember.first_name} {staffMember.last_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {staffMember.slots.length} beschikbare tijden
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-3 gap-2 pt-2">
                              {staffMember.slots.map((slot, index) => {
                                const startTime = formatTimeDisplay(slot.start_time);
                                const isSelected =
                                  selectedStaffId === staffId &&
                                  selectedTimeSlot === startTime;

                                return (
                                  <Button
                                    key={index}
                                    variant={isSelected ? "default" : "outline"}
                                    className={cn(
                                      "h-auto py-2 text-sm flex flex-col items-center",
                                      isSelected
                                        ? "bg-salon-primary text-white"
                                        : "bg-white"
                                    )}
                                    onClick={() => {
                                      onStaffSelect(staffId);
                                      onTimeSlotSelect(startTime, {
                                        time: startTime,
                                        selected: true,
                                        staffId: slot.staff_id,
                                        startTime: slot.start_time,
                                        endTime: slot.end_time,
                                        availableStart: slot.available_start,
                                        availableEnd: slot.available_end,
                                      });
                                    }}
                                  >
                                    <span>{startTime}</span>
                                    <span className="text-xs opacity-75">
                                      {formatTimeDisplay(slot.end_time)}
                                    </span>
                                  </Button>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div>
                      <h4 className="font-medium mb-3">Beschikbare tijden</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(
                          availabilities.dates[format(selectedDay, "yyyy-MM-dd")]
                            .staff
                        )
                          .flatMap(([staffId, staffMember]) =>
                            staffMember.slots.map((slot) => ({
                              ...slot,
                              staffId,
                              displayStartTime: formatTimeDisplay(slot.start_time),
                              displayEndTime: formatTimeDisplay(slot.end_time),
                            }))
                          )
                          .sort((a, b) => a.start_time.localeCompare(b.start_time))
                          .map((slot, index) => {
                            const isSelected =
                              selectedStaffId === slot.staffId &&
                              selectedTimeSlot === slot.displayStartTime;

                            return (
                              <Button
                                key={`${slot.staffId}-${index}`}
                                variant={isSelected ? "default" : "outline"}
                                className={cn(
                                  "h-auto py-2 text-sm flex flex-col items-center",
                                  isSelected ? "bg-salon-primary text-white" : "bg-white"
                                )}
                                onClick={() => {
                                  onStaffSelect(slot.staffId);
                                  onTimeSlotSelect(slot.displayStartTime, {
                                    time: slot.displayStartTime,
                                    selected: true,
                                    staffId: slot.staff_id,
                                    startTime: slot.start_time,
                                    endTime: slot.end_time,
                                    availableStart: slot.available_start,
                                    availableEnd: slot.available_end,
                                  });
                                }}
                              >
                                <span>{slot.displayStartTime}</span>
                                <span className="text-xs opacity-75">
                                  {slot.displayEndTime}
                                </span>
                              </Button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">
              Geen beschikbaarheid gevonden voor deze diensten
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

