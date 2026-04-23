import { Button } from "./components/button";
import { calculateTotalPriceRange } from "./utils";

interface BookingFooterProps {
  isMobile: boolean;
  currentStep: number;
  selectedTreatments: any[];
  submitting: boolean;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onSubmit: () => void;
  onShowEmailInput: () => void;
}

export function BookingFooter({
  isMobile,
  currentStep,
  selectedTreatments,
  submitting,
  onPreviousStep,
  onNextStep,
  onSubmit,
  onShowEmailInput,
}: BookingFooterProps) {
  const priceRange = calculateTotalPriceRange(selectedTreatments);
  const totalDisplay =
    priceRange.baseTotal < 0
      ? ""
      : priceRange.hasOpenEndedPricing
        ? `${priceRange.baseTotal} - ...`
        : priceRange.hasRange
          ? `${priceRange.baseTotal} - ${priceRange.maxTotal}`
          : priceRange.baseTotal;

  const hasNoTreatments = selectedTreatments.length === 0;

  if (isMobile) {
    return (
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-between">
        {hasNoTreatments && currentStep === 1 ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                Heb je hier al eerder geboekt?
              </span>
            </div>
            <Button
              onClick={onShowEmailInput}
              className="bg-salon-primary hover:bg-salon-primary-hover text-white px-4 py-2 h-auto"
            >
              Bekijk afspraken
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Totaal</span>
              <span className="font-bold text-lg">
                {totalDisplay ? `€${totalDisplay}` : ""}
              </span>
            </div>

            {currentStep > 1 ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onPreviousStep}
                  className="px-4 py-2 h-auto"
                >
                  Terug
                </Button>

                {currentStep < 3 ? (
                  <Button
                    onClick={onNextStep}
                    className="bg-salon-primary hover:bg-salon-primary-hover text-white px-5 py-2 h-auto"
                  >
                    Verder
                  </Button>
                ) : (
                  <Button
                    onClick={onSubmit}
                    disabled={submitting}
                    className="bg-salon-primary hover:bg-salon-primary-hover text-white px-5 py-2 h-auto"
                  >
                    {submitting ? "Bezig..." : "Afspraak maken"}
                  </Button>
                )}
              </div>
            ) : (
              <Button
                onClick={onNextStep}
                className="bg-salon-primary hover:bg-salon-primary-hover text-white px-5 py-2 h-auto"
              >
                Verder
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="border-t bg-salon-background p-4 flex justify-between items-center">
      {hasNoTreatments && currentStep === 1 ? (
        <div className="flex items-center justify-between w-full">
          <div className="font-medium text-gray-900">
            Heb je hier al eerder geboekt?
          </div>
          <Button
            onClick={onShowEmailInput}
            className="bg-salon-primary hover:bg-salon-primary-hover text-white px-4 py-2 h-auto"
          >
            Bekijk afspraken
          </Button>
        </div>
      ) : (
        <>
          <div className="font-bold">
            Totaal: {totalDisplay ? `€${totalDisplay}` : ""}
          </div>

          <div className="flex gap-2">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                onClick={onPreviousStep}
                className="px-4 py-2 h-auto"
              >
                Terug
              </Button>
            ) : (
              <div></div>
            )}

            {currentStep < 3 ? (
              <Button
                onClick={onNextStep}
                className="bg-salon-primary hover:bg-salon-primary-hover text-white px-5 py-2 h-auto"
              >
                Verder
              </Button>
            ) : (
              <Button
                onClick={onSubmit}
                disabled={submitting}
                className="bg-salon-primary hover:bg-salon-primary-hover text-white px-5 py-2 h-auto"
              >
                {submitting ? "Bezig..." : "Afspraak maken"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

