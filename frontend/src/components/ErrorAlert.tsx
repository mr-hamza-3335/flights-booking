"use client";

import { XCircle, RefreshCw } from "lucide-react";

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorAlert({
  message,
  onRetry,
  onDismiss,
  className = "",
}: ErrorAlertProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm ${className}`}
    >
      <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />

      <span className="flex-1 leading-snug">{message}</span>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 underline underline-offset-2 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
