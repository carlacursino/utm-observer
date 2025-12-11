import type {
  Constraint,
  IdentificationServiceAreaFull,
  OperationalIntent,
  Flight,
  UTMZone,
} from "@/shared/model";
import { MapState } from "@/shared/model";
import type { FilterCategory } from "@/shared/lib/map";
import { createContext } from "react";

export interface IMapContext {
  startDate: Date;
  setStartDate: (date: Date) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  endDate: Date;
  setEndDate: (date: Date) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  selectedMinutes: number[];
  setSelectedMinutes: (minutes: number[]) => void;
  volumes: Array<
    Constraint | OperationalIntent | IdentificationServiceAreaFull | UTMZone
  >;
  setVolumes: (
    volumes: Array<
      Constraint | OperationalIntent | IdentificationServiceAreaFull | UTMZone
    >,
  ) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  loadingConstraintRequest: boolean;
  setLoadingConstraintRequest: (loading: boolean) => void;
  filters: FilterCategory[];
  setFilters: (filters: FilterCategory[]) => void;
  managerFilter: string[];
  setManagerFilter: (filter: string[]) => void;
  mapState: MapState;
  setMapState: (state: MapState) => void;
  isLive: boolean;
  setIsLive: (isLive: boolean) => void;
  flights: Flight[];
  setFlights: (flights: Flight[]) => void;
  flightsFilter: string[];
  setFlightsFilter: (flights: string[]) => void;
  flightProvidersFilter: string[];
  setFlightProvidersFilter: (flights: string[]) => void;
  is3D: boolean;
  setIs3D: (is3D: boolean) => void;
}

export const MapContext = createContext<IMapContext | undefined>(undefined);
