"use client";

import { useState, useCallback, useRef, createContext, useContext, type ReactNode } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  /** If set, shows an input field and returns the value */
  prompt?: boolean;
  promptPlaceholder?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<string | boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback to native confirm/prompt if no provider
    return async (options) => {
      if (options.prompt) {
        const result = window.prompt(options.description);
        return result ?? false;
      }
      return window.confirm(options.description);
    };
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [inputValue, setInputValue] = useState("");
  const resolveRef = useRef<((value: string | boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise((resolve) => {
      setOptions(opts);
      setInputValue("");
      setOpen(true);
      resolveRef.current = resolve;
    });
  }, []);

  function handleConfirm() {
    setOpen(false);
    if (options?.prompt) {
      resolveRef.current?.(inputValue.trim() || false);
    } else {
      resolveRef.current?.(true);
    }
  }

  function handleCancel() {
    setOpen(false);
    resolveRef.current?.(false);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{options?.title || "Konfirmasi"}</DialogTitle>
            <DialogDescription>{options?.description}</DialogDescription>
          </DialogHeader>
          {options?.prompt && (
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={options.promptPlaceholder || ""}
              autoFocus
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              {options?.cancelLabel || "Batal"}
            </Button>
            <Button
              variant={options?.variant === "destructive" ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={options?.prompt && !inputValue.trim()}
            >
              {options?.confirmLabel || "Ya, Lanjutkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
