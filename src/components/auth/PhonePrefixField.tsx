import type { InputHTMLAttributes } from "react";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { AUTH_ORANGE } from "./constants";

type PhonePrefixFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  className?: string;
  inputClassName?: string;
};

export default function PhonePrefixField({
  className,
  inputClassName,
  id,
  value,
  onChange,
  placeholder = "98XXXXXXXX",
  disabled,
  autoFocus,
}: PhonePrefixFieldProps) {
  return (
    <div className={cn("relative rounded-xl border-2 bg-neutral-50/80 transition-colors", className)} style={{ borderColor: `${AUTH_ORANGE}55` }}>
      <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3 pr-2 border-r border-neutral-200/90 rounded-l-[10px] bg-white/60">
        <Smartphone className="w-4 h-4 text-neutral-500 mr-1.5" aria-hidden />
        <span className="text-sm font-semibold text-neutral-700">+977</span>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          "w-full pl-[5.5rem] pr-4 py-3.5 rounded-xl bg-transparent text-foreground text-base font-medium placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400/70 rounded-l-none",
          inputClassName,
        )}
      />
    </div>
  );
}
