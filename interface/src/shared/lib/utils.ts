import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type {
  OperationalIntent,
  Constraint,
  IdentificationServiceAreaFull,
  UTMZone,
} from "@/shared/model"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isOperationalIntent = (
  region: OperationalIntent | Constraint | IdentificationServiceAreaFull | UTMZone,
): region is OperationalIntent => {
  return "reference" in region && "flight_type" in region.reference;
};

export const isConstraint = (
  region: OperationalIntent | Constraint | IdentificationServiceAreaFull | UTMZone,
): region is Constraint => {
  return "details" in region && "geozone" in region.details;
};

export const isIdentificationServiceArea = (
  region: OperationalIntent | Constraint | IdentificationServiceAreaFull | UTMZone,
): region is IdentificationServiceAreaFull => {
  return "reference" in region && "owner" in region.reference;
};

export const isUTMZone = (
  region: OperationalIntent | Constraint | IdentificationServiceAreaFull | UTMZone,
): region is UTMZone => {
  return "name" in region;
};
