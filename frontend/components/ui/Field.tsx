"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef, useId } from "react";
import { cn } from "@/components/ui/cn";

const CONTROL =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink " +
  "placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 " +
  "disabled:bg-line/30";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  suffix?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, htmlFor, error, hint, suffix, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {suffix ? <span className="ml-1 font-normal text-muted">({suffix})</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  suffix?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, suffix, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint} suffix={suffix}>
      <input
        {...props}
        id={fieldId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, className)}
      />
    </FieldWrapper>
  );
});

type NumberFieldProps = TextFieldProps;

/** Number input tuned for mobile keyboards. */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  props,
  ref,
) {
  return <TextField {...props} ref={ref} type="number" inputMode="decimal" />;
});

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, options, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint}>
      <select
        {...props}
        id={fieldId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, className)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
});

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, error, hint, className, id, ...props }, ref) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    return (
      <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint}>
        <textarea
          {...props}
          id={fieldId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL, "min-h-[72px] resize-y", className)}
        />
      </FieldWrapper>
    );
  },
);
