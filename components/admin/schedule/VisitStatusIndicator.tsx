"use client";

import React from "react";
import { Check, X } from "lucide-react";

export type VisitStatusType =
  | "CANCELLED"
  | "COMPLETED"
  | "RESOLVED"
  | "SCHEDULED"
  | "PENDING"
  | "WAITLISTED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "TRIGGERED"
  | "DISPATCHED"
  | "RESPONDER_ON_SCENE"
  | string;

export interface VisitStatusIndicatorProps {
  status: VisitStatusType;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export interface StatusIndicatorMetadata {
  type: "CANCELLED" | "COMPLETED" | "PENDING";
  label: string;
  title: string;
  containerClasses: string;
  icon: "cross" | "tick" | "circle";
}

/**
 * Pure helper function returning status indicator metadata and styling.
 * Used for both React component rendering and isolated unit testing.
 */
export function getStatusIndicatorMetadata(status: VisitStatusType): StatusIndicatorMetadata {
  const normalized = (status || "").toUpperCase();

  if (normalized === "CANCELLED") {
    return {
      type: "CANCELLED",
      label: "Cancelled",
      title: "Cancelled",
      containerClasses: "bg-red-100 text-red-600 border border-red-200",
      icon: "cross",
    };
  }

  if (normalized === "COMPLETED" || normalized === "RESOLVED") {
    return {
      type: "COMPLETED",
      label: "Completed",
      title: "Completed",
      containerClasses: "bg-emerald-100 text-emerald-700 border border-emerald-300",
      icon: "tick",
    };
  }

  // PENDING / SCHEDULED (and all active uncommenced/in-flight states)
  return {
    type: "PENDING",
    label: normalized === "CONFIRMED" ? "Confirmed" : "Pending",
    title: normalized === "CONFIRMED" ? "Confirmed" : "Pending",
    containerClasses: "border-2 border-amber-500 bg-amber-50 text-amber-600",
    icon: "circle",
  };
}

/**
 * Visual Status Indicator Component
 *
 * Placed in the top-right corner of visit cards across Day, Week, and Month views:
 * - CANCELLED: Red cross (X) with light red circular background
 * - PENDING / SCHEDULED: Yellow / amber outlined circle indicator
 * - COMPLETED: Green tick with light green circular background
 */
export function VisitStatusIndicator({
  status,
  size = "md",
  className = "",
}: VisitStatusIndicatorProps) {
  const meta = getStatusIndicatorMetadata(status);

  const sizeClasses =
    size === "xs"
      ? "h-3.5 w-3.5"
      : size === "sm"
      ? "h-4 w-4"
      : "h-5 w-5";

  const iconClasses =
    size === "xs"
      ? "h-2 w-2 stroke-[3]"
      : size === "sm"
      ? "h-2.5 w-2.5 stroke-[2.5]"
      : "h-3 w-3 stroke-[2.5]";

  const dotClasses =
    size === "xs"
      ? "h-1 w-1 bg-amber-500"
      : size === "sm"
      ? "h-1.5 w-1.5 bg-amber-500"
      : "h-1.5 w-1.5 bg-amber-500";

  return (
    <span
      data-testid="visit-status-indicator"
      data-status={meta.type}
      title={meta.title}
      aria-label={meta.label}
      className={`inline-flex items-center justify-center rounded-full shrink-0 shadow-2xs transition-transform select-none ${sizeClasses} ${meta.containerClasses} ${className}`}
    >
      {meta.icon === "cross" && <X className={iconClasses} />}
      {meta.icon === "tick" && <Check className={iconClasses} />}
      {meta.icon === "circle" && <span className={`rounded-full ${dotClasses}`} />}
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}
