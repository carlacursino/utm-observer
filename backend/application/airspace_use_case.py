# Application layer - use cases that orchestrate domain logic
from http import HTTPStatus
from typing import List
from datetime import datetime
import logging
import json
from pathlib import Path

from domain.airspace import AirspaceAllocations, AirspaceFlights
from ports.airspace_port import (
    AirspaceDetailsDataPort,
    AirspaceReferencesDataPort,
)
from ports.flights_port import FlightDataPort
from domain.base import (
    Volume4D,
    Volume3D,
    Polygon,
    LatLngPoint,
    Altitude,
    Time,
)
from domain.flights import Flight
from domain.utm_zone import UTMZone
from schemas.enums import AltitudeReference, AltitudeUnits
from schemas.api import ApiException
from schemas.requests.flights import QueryFlightsRequest
from domain.external.uss.common import OperationalIntent, Constraint
from domain.external.dss.remoteid import (
    IdentificationServiceAreaFull,
)


class AirspaceQueryUseCase:
    """Use case for querying airspace information"""

    def __init__(
        self,
        airspace_references_port: AirspaceReferencesDataPort,
        airspace_details_port: AirspaceDetailsDataPort,
        flight_port: FlightDataPort,
    ):
        self.airspace_reference_port = airspace_references_port
        self.airspace_details_port = airspace_details_port
        self.flight_port = flight_port

    async def get_airspace_allocations(
        self, area_of_interest: Volume4D
    ) -> AirspaceAllocations:
        """Get complete airspace snapshot for given area"""

        constraint_refs = (
            await self.airspace_reference_port.get_constraint_references(
                area_of_interest
            )
        )

        operational_intent_refs = await self.airspace_reference_port.get_operational_intent_references(
            area_of_interest
        )

        isa_refs = await self.airspace_reference_port.get_identification_service_areas(
            area_of_interest
        )

        constraints = await self._get_constraint_details(constraint_refs)
        operational_intents = await self._get_operational_intent_details(
            operational_intent_refs
        )
        identification_service_areas = await self._get_isa_details(isa_refs)
        utm_zones = self._get_utm_zones()

        return AirspaceAllocations(
            timestamp=datetime.now(),
            area_of_interest=area_of_interest,
            constraints=constraints,
            operational_intents=operational_intents,
            identification_service_areas=identification_service_areas,
            utm_zones=utm_zones,
        )

    async def get_active_flights(
        self, area: QueryFlightsRequest
    ) -> List[Flight]:
        """Get active flights in a given area"""

        flights, errors = await self.flight_port.get_active_flights(area)

        if not flights and errors:
            raise ApiException(
                status_code=HTTPStatus.PARTIAL_CONTENT,
                message="Errors fetching flight data",
                details={
                    "errors": errors,
                    "flights_retrieved": len(flights),
                },
            )

        return AirspaceFlights(
            timestamp=datetime.now(),
            flights=flights,
        )

    async def _get_constraint_details(self, references) -> List[Constraint]:
        """Fetch constraint details with error handling"""
        constraints = []
        for ref in references:
            try:
                if ref.uss_base_url and ref.id:
                    constraint = await self.airspace_details_port.get_constraint_details(
                        ref
                    )
                    constraints.append(constraint)
            except Exception as e:
                logging.error(f"Fetching constraint {ref.id}: {e}")
                continue
        return constraints

    async def _get_operational_intent_details(
        self, references
    ) -> List[OperationalIntent]:
        """Fetch operational intent details with error handling"""
        operational_intents = []
        for ref in references:
            try:
                if ref.uss_base_url and ref.id:
                    oi = await self.airspace_details_port.get_operational_intent_details(
                        ref
                    )
                    operational_intents.append(oi)
            except Exception as e:
                logging.error(
                    f"Error fetching operational intent {ref.id}: {e}"
                )
                continue
        return operational_intents

    async def _get_isa_details(
        self, references
    ) -> List[IdentificationServiceAreaFull]:
        """Fetch ISA details with error handling"""
        isas = []
        for ref in references:
            try:
                if ref.uss_base_url and ref.id:
                    isa = await self.airspace_details_port.get_identification_service_area_details(
                        ref
                    )
                    isas.append(isa)
            except Exception as e:
                logging.error(f"Error fetching ISA {ref.id}: {e}")
                continue
        return isas

    def _get_utm_zones(self) -> List[UTMZone]:
        try:
            mock_path = (
                Path(__file__).parent.parent / "mock" / "utm_zone_ieav.geojson"
            )
            if not mock_path.exists():
                logging.warning(f"Mock UTM Zone file not found: {mock_path}")
                return []

            with open(mock_path, "r") as f:
                data = json.load(f)

            utm_zones = []
            for feature in data.get("features", []):
                props = feature.get("properties", {})
                geometry = feature.get("geometry", {})
                
                if geometry.get("type") != "Polygon":
                    continue

                coordinates = geometry.get("coordinates", [])
                if not coordinates:
                    continue

                exterior_ring = coordinates[0]
                vertices = [
                    LatLngPoint(lat=coord[1], lng=coord[0])
                    for coord in exterior_ring
                ]

                min_alt = props.get("minAltitude", 0)
                max_alt = props.get("maxAltitude", 1000)

                volume_3d = Volume3D(
                    outline_polygon=Polygon(vertices=vertices),
                    altitude_lower=Altitude(
                        value=min_alt,
                        reference=AltitudeReference.W84,
                        units=AltitudeUnits.M,
                    ),
                    altitude_upper=Altitude(
                        value=max_alt,
                        reference=AltitudeReference.W84,
                        units=AltitudeUnits.M,
                    ),
                )

                volume_4d = Volume4D(
                    volume=volume_3d,
                    time_start=Time(value=datetime.now()),
                    time_end=Time(
                        value=datetime(2099, 12, 31, 23, 59, 59)
                    ),
                )

                utm_zones.append(
                    UTMZone(
                        name="IEAV Zone",
                        volumes=[volume_4d],
                    )
                )
            
            return utm_zones

        except Exception as e:
            logging.error(f"Error loading UTM Zones: {e}")
            return []
