"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Phone input with Indonesian flag and +62 prefix.
 * Stores only the local number (without 62 prefix).
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, placeholder = "8xxxxxxxxxx", disabled, autoFocus, className, onKeyDown }, ref) => {
    return (
      <div
        className={cn(
          "flex items-center border rounded-md overflow-hidden bg-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      >
        {/* Country prefix */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 border-r shrink-0 select-none">
          <span className="text-base leading-none" aria-hidden>🇮🇩</span>
          <span className="text-sm text-muted-foreground font-medium">+62</span>
        </div>
        {/* Number input */}
        <input
          ref={ref}
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            // Only allow digits
            const digits = e.target.value.replace(/\D/g, "");
            onChange(digits);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

/**
 * Convert PhoneInput value (local number) to normalized format (62xxx).
 * Handles various input formats: 0812..., 812..., 62812..., +62812...
 */
export function normalizePhone(raw: string): string {
  let phone = raw.trim().replace(/\D/g, "");
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);
  if (!phone.startsWith("62")) phone = "62" + phone;
  return phone;
}

/**
 * Convert stored phone (62xxx) to local format for PhoneInput value.
 */
export function phoneToLocal(stored: string): string {
  if (!stored) return "";
  const digits = stored.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}
