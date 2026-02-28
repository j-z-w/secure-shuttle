interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

export default function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-md mx-auto">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isFuture = stepNum > currentStep;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`size-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isCompleted
                    ? "bg-[#0070f3] text-white"
                    : isCurrent
                    ? "bg-[#0070f3] text-white ring-2 ring-[#0070f3]/50 ring-offset-2 ring-offset-[#1d1d1d]"
                    : "bg-neutral-700 text-neutral-400"
                }`}
              >
                {isCompleted ? (
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isFuture ? "text-neutral-500" : "text-neutral-300"
                }`}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 mt-[-1.25rem] rounded-full transition-colors ${
                  isCompleted ? "bg-[#0070f3]" : "bg-neutral-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
