type StepState = "done" | "current" | "todo" | "error";

export interface StatusStep {
  label: string;
  state: StepState;
  detail?: string;
}

export default function TransactionStatusWheel({
  title,
  summaryLabel,
  summaryValue,
  steps,
}: {
  title: string;
  summaryLabel: string;
  summaryValue: string;
  steps: StatusStep[];
}) {
  return (
    <section className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-sm text-neutral-400 mb-4">
        {summaryLabel}: <span className="text-neutral-200">{summaryValue}</span>
      </p>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.label} className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex size-5 items-center justify-center rounded-full ${
                step.state === "done"
                  ? "bg-emerald-700"
                  : step.state === "current"
                  ? "bg-blue-700"
                  : step.state === "error"
                  ? "bg-red-700"
                  : "bg-neutral-700"
              }`}
            >
              {step.state === "done" ? (
                <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : step.state === "current" ? (
                <svg className="size-3 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-30" />
                  <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <span className="size-1.5 rounded-full bg-neutral-300" />
              )}
            </span>
            <div>
              <p
                className={`text-sm ${
                  step.state === "done"
                    ? "text-white"
                    : step.state === "current"
                    ? "text-blue-200"
                    : step.state === "error"
                    ? "text-red-200"
                    : "text-neutral-500"
                }`}
              >
                {step.label}
              </p>
              {step.detail ? <p className="text-xs text-neutral-500 mt-0.5">{step.detail}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
