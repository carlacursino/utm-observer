import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
  OperationalIntent,
  Constraint,
  IdentificationServiceAreaFull,
  UTMZone,
  Volume4D,
} from "@/shared/model";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isOperationalIntent = (
  region:
    | OperationalIntent
    | Constraint
    | IdentificationServiceAreaFull
    | UTMZone,
): region is OperationalIntent => {
  return "reference" in region && "flight_type" in region.reference;
};

export const isConstraint = (
  region:
    | OperationalIntent
    | Constraint
    | IdentificationServiceAreaFull
    | UTMZone,
): region is Constraint => {
  return "details" in region && "geozone" in region.details;
};

export const isIdentificationServiceArea = (
  region:
    | OperationalIntent
    | Constraint
    | IdentificationServiceAreaFull
    | UTMZone,
): region is IdentificationServiceAreaFull => {
  return "reference" in region && "owner" in region.reference;
};

export const isUTMZone = (
  region:
    | OperationalIntent
    | Constraint
    | IdentificationServiceAreaFull
    | UTMZone,
): region is UTMZone => {
  return "name" in region;
};

export function getVolumeManager(
  volume:
    | OperationalIntent
    | Constraint
    | UTMZone
    | IdentificationServiceAreaFull,
): string | null {
  if (isIdentificationServiceArea(volume)) return volume.reference.owner;
  if (isOperationalIntent(volume)) return volume.reference.manager;
  if (isConstraint(volume)) return volume.reference.manager;
  if (isUTMZone(volume)) return volume.manager;
  return null;
}

export function getVolumeId(
  volume:
    | OperationalIntent
    | Constraint
    | UTMZone
    | IdentificationServiceAreaFull,
): string | null {
  if (isIdentificationServiceArea(volume)) return volume.reference.id;
  if (isOperationalIntent(volume)) return volume.reference.id;
  if (isConstraint(volume)) return volume.reference.id;
  if (isUTMZone(volume)) return volume.id;
  return null;
}

export function getVolumeOvn(
  volume:
    | OperationalIntent
    | Constraint
    | UTMZone
    | IdentificationServiceAreaFull,
): string | null {
  if (isIdentificationServiceArea(volume)) return "";
  if (isOperationalIntent(volume)) return volume.reference.ovn || "";
  if (isConstraint(volume)) return volume.reference.ovn || "";
  if (isUTMZone(volume)) return "";
  return null;
}

export function getVolumeVolumes(
  volume:
    | OperationalIntent
    | Constraint
    | UTMZone
    | IdentificationServiceAreaFull,
): Volume4D[] {
  if (isIdentificationServiceArea(volume)) return volume.details.volumes || [];
  if (isOperationalIntent(volume)) return volume.details.volumes || [];
  if (isConstraint(volume)) return volume.details.volumes || [];
  if (isUTMZone(volume)) return volume.volumes || [];
  return [];
}

export function getRegionOffNominalVolumes(
  volume:
    | OperationalIntent
    | Constraint
    | UTMZone
    | IdentificationServiceAreaFull,
): Volume4D[] {
  if (isOperationalIntent(volume))
    return volume.details.off_nominal_volumes || [];
  return [];
}

export function getVolumeTitle(
  volume:
    | OperationalIntent
    | Constraint
    | UTMZone
    | IdentificationServiceAreaFull,
): string {
  if (isIdentificationServiceArea(volume)) return "Identification Service Area";
  if (isOperationalIntent(volume)) return "Operational Intent";
  if (isConstraint(volume)) return "Constraint";
  if (isUTMZone(volume)) return "UTM Zone";
  return "";
}
