import * as Cesium from "cesium";
import { OperationalIntentStateColor } from "@/shared/model";
import type {
  OperationalIntent,
  Constraint,
  IdentificationServiceAreaFull,
  Flight,
  Volume3D,
  Volume4D,
  UTMZone,
} from "@/shared/model";
import {
  isConstraint,
  isIdentificationServiceArea,
  isOperationalIntent,
  isUTMZone,
  getVolumeId,
  getVolumeOvn,
  getVolumeVolumes,
  getRegionOffNominalVolumes,
} from "@/shared/lib";

function sum(arr: number[]): number {
  return arr.reduce((acc, val) => acc + val, 0);
}

type RegionId = string;
type RegionOvn = string;

interface DisplayedEntity {
  ovn: RegionOvn;
  entityIds: RegionId[];
}

export class MapEntityManager {
  private viewer: Cesium.Viewer;
  private displayedEntities: Record<RegionId, DisplayedEntity> = {};
  private handler: Cesium.ScreenSpaceEventHandler;
  private flights: Record<string, Cesium.Entity[]> = {};

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;

    this.viewer.cesiumWidget.creditContainer.remove();

    this.viewer.cesiumWidget.creditContainer.remove();

    this.handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
  }

  addEntityClickCallback(
    callback: (entity: Cesium.Entity, regionId: RegionId) => void,
  ) {
    this.handler.setInputAction(
      (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pickedObject = this.viewer.scene.pick(event.position);
        if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
          const pickedEntity = pickedObject.id as Cesium.Entity;
          const regionId = Object.keys(this.displayedEntities).find((id) =>
            this.displayedEntities[id].entityIds.includes(pickedEntity.id),
          );
          callback(pickedEntity, regionId as RegionId);
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );
  }

  clearFlights() {
    if (Object.keys(this.flights).length === 0) {
      return;
    }

    Object.values(this.flights).forEach((entities) => {
      entities.forEach((entity) => {
        this.viewer.entities.removeById(entity.id);
      });
    });

    this.flights = {};
  }

  displayFlights(newFlights: Array<Flight>) {
    const newFlightIds = new Set(newFlights.map((flight) => flight.id));

    Object.keys(this.flights).forEach((flightId) => {
      if (!newFlightIds.has(flightId)) {
        this.flights[flightId].forEach((entity) => {
          this.viewer.entities.removeById(entity.id);
        });
        delete this.flights[flightId];
      }
    });

    newFlights.forEach((newFlight) => {
      const { current_state, id } = newFlight;
      const { position } = current_state;

      if (!position || !position.lat || !position.lng) {
        return;
      }

      if (this.flights[id]) {
        const entity = this.flights[id][0];
        entity.position = new Cesium.ConstantPositionProperty(
          Cesium.Cartesian3.fromDegrees(
            position.lng,
            position.lat,
            position.alt,
            Cesium.Ellipsoid.WGS84,
          ),
        );

        if (this.flights[id].length > 1) {
          const label = this.flights[id][1];
          label.position = new Cesium.ConstantPositionProperty(
            Cesium.Cartesian3.fromDegrees(
              position.lng,
              position.lat,
              position.alt + 10,
              Cesium.Ellipsoid.WGS84,
            ),
          );
        }
      } else {
        this.flights[id] = [];

        // const entity = this.viewer.entities.add({
        //   position: Cesium.Cartesian3.fromDegrees(
        //     position.lng,
        //     position.lat,
        //     position.alt,
        //     Cesium.Ellipsoid.WGS84,
        //   ),
        //   model: {
        //     uri: "/Inspire.glb",
        //     minimumPixelSize: 100,
        //     maximumScale: 1,
        //   },
        // });

        const entity = this.viewer.entities.add({
          id: id,
          position: Cesium.Cartesian3.fromDegrees(
            position.lng,
            position.lat,
            position.alt,
            Cesium.Ellipsoid.WGS84,
          ),
          ellipsoid: {
            radii: new Cesium.Cartesian3(5, 5, 5),
            material: Cesium.Color.BLACK.withAlpha(0.8),
          },
        });

        this.flights[id].push(entity);

        if (newFlight.details?.uas_id) {
          const label = this.viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
              position.lng,
              position.lat,
              position.alt + 10,
              Cesium.Ellipsoid.WGS84,
            ),
            label: {
              text: newFlight.details.uas_id.registration_id,
              font: "14px sans-serif",
              fillColor: Cesium.Color.BLACK,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            },
          });
          if (label) {
            this.flights[id].push(label);
          }
        }
      }
    });
  }

  displayRegions(
    regions: Array<
      Constraint | OperationalIntent | IdentificationServiceAreaFull | UTMZone
    >,
  ) {
    if (
      this.viewer.entities.values.length !==
      sum(
        Object.values(this.displayedEntities).map(
          (entity) => entity.entityIds.length,
        ),
      ) +
      Object.values(this.flights).flat().length +
      (this.requestedAreaEntity ? 1 : 0)
    ) {
      this.viewer.entities.removeAll();
      this.displayedEntities = {};
      if (this.requestedAreaEntity) {
        this.viewer.entities.add(this.requestedAreaEntity);
      }
    }

    Object.keys(this.displayedEntities).forEach((regionId) => {
      if (!regions.some((region) => getVolumeId(region) === regionId)) {
        this.displayedEntities[regionId].entityIds.forEach((entityId) => {
          this.viewer.entities.removeById(entityId);
        });
        delete this.displayedEntities[regionId];
      }
    });

    regions.forEach((region) => {
      let volumes = getVolumeVolumes(region);
      let offNominalVolumes = getRegionOffNominalVolumes(region);
      let regionId = getVolumeId(region);
      let ovn = getVolumeOvn(region);

      if (!regionId) {
        return;
      }

      if (volumes.length === 0 && offNominalVolumes.length === 0) {
        return;
      }

      if (
        regionId in this.displayedEntities &&
        this.displayedEntities[regionId].ovn === ovn
      ) {
        return;
      }

      if (!(regionId in this.displayedEntities)) {
        this.displayedEntities[regionId] = {
          ovn: ovn!,
          entityIds: [],
        };
      }

      if (
        regionId in this.displayedEntities &&
        this.displayedEntities[regionId].ovn !== ovn
      ) {
        this.displayedEntities[regionId].entityIds.forEach((entityId) => {
          this.viewer.entities.removeById(entityId);
        });
        this.displayedEntities[regionId].entityIds = [];
        this.displayedEntities[regionId].ovn = ovn!;
      }

      const volumesToDisplay: { volume: Volume4D; color: Cesium.Color }[] = [];

      if (isOperationalIntent(region)) {
        const state = (region.reference as any)["state"];

        if (state === "Nonconforming") {
          if (region.details.volumes) {
            region.details.volumes.forEach((v) => {
              volumesToDisplay.push({
                volume: v,
                color: OperationalIntentStateColor["Accepted"],
              });
            });
          }

          if (region.details.off_nominal_volumes) {
            region.details.off_nominal_volumes.forEach((v) => {
              volumesToDisplay.push({
                volume: v,
                color: OperationalIntentStateColor["Nonconforming"],
              });
            });
          }
        } else if (state === "Contingent") {
          if (region.details.off_nominal_volumes) {
            region.details.off_nominal_volumes.forEach((v) => {
              volumesToDisplay.push({
                volume: v,
                color: OperationalIntentStateColor["Contingent"],
              });
            });
          }
        } else {
          const color = OperationalIntentStateColor[state] || Cesium.Color.GREY;
          if (region.details.volumes) {
            region.details.volumes.forEach((v) => {
              volumesToDisplay.push({ volume: v, color: color });
            });
          }
        }
      } else {
        // Handle other region types (Constraint, ISA, UTMZone)
        let volumes = getVolumeVolumes(region);
        let color: Cesium.Color = Cesium.Color.GREY;

        if (isConstraint(region)) {
          color = Cesium.Color.RED;
        } else if (isIdentificationServiceArea(region)) {
          color = Cesium.Color.BLUE;
        } else if (isUTMZone(region)) {
          color = Cesium.Color.fromCssColorString("#E6E6FA").withAlpha(0.8);
        }

        volumes.forEach((v) => {
          volumesToDisplay.push({ volume: v, color: color });
        });
      }

      for (const { volume, color } of volumesToDisplay) {
        if (
          "outline_circle" in volume.volume &&
          volume.volume["outline_circle"]
        ) {
          const entity = this.drawCylinder(volume.volume, color);

          if (entity) {
            this.displayedEntities[regionId].entityIds.push(entity.id);
          }
        } else if (
          "outline_polygon" in volume.volume &&
          volume.volume["outline_polygon"]
        ) {
          const entity = this.drawPolygon(volume.volume, color);

          if (entity) {
            this.displayedEntities[regionId].entityIds.push(entity.id);
          }
        }
      }
    });
  }

  private drawCylinder(
    volume: Volume3D,
    color: Cesium.Color = Cesium.Color.GREY,
  ): Cesium.Entity | undefined {
    if (!("outline_circle" in volume) || !volume.outline_circle) {
      return;
    }

    const radius = volume.outline_circle.radius.value;

    const height = volume.altitude_upper.value - volume.altitude_lower.value;

    const center = Cesium.Cartesian3.fromDegrees(
      volume.outline_circle.center.lng,
      volume.outline_circle.center.lat,
      volume.altitude_lower.value + height / 2,
      Cesium.Ellipsoid.WGS84,
    );

    return this.viewer.entities.add({
      position: center,
      cylinder: {
        length: height,
        topRadius: radius,
        bottomRadius: radius,
        material: color.withAlpha(0.5),
        outline: true,
        outlineColor: color,
      },
    });
  }

  private drawPolygon(
    volume: Volume3D,
    color: Cesium.Color = Cesium.Color.GREY,
  ): Cesium.Entity | undefined {
    if (!("outline_polygon" in volume) || !volume.outline_polygon) {
      return;
    }

    const minHeight = Math.min(
      volume.altitude_lower.value,
      volume.altitude_upper.value,
    );
    const maxHeight = Math.max(
      volume.altitude_upper.value,
      volume.altitude_lower.value,
    );

    const vertices = volume.outline_polygon.vertices.map((vertex) =>
      Cesium.Cartesian3.fromDegrees(
        vertex.lng,
        vertex.lat,
        minHeight,
        Cesium.Ellipsoid.WGS84,
      ),
    );

    return this.viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(vertices),
        material: color.withAlpha(0.5),
        height: minHeight,
        extrudedHeight: maxHeight,
        outline: true,
        outlineColor: color,
      },
    });
  }

  private requestedAreaEntity: Cesium.Entity | undefined;
  private lastRequestedArea:
    | {
      north: number;
      south: number;
      east: number;
      west: number;
    }
    | undefined;

  displayRequestedArea(rectangle: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) {
    if (
      this.lastRequestedArea &&
      this.lastRequestedArea.north === rectangle.north &&
      this.lastRequestedArea.south === rectangle.south &&
      this.lastRequestedArea.east === rectangle.east &&
      this.lastRequestedArea.west === rectangle.west
    ) {
      return;
    }

    console.log("Displaying requested area");

    if (this.requestedAreaEntity) {
      this.viewer.entities.remove(this.requestedAreaEntity);
    }

    const positions = [
      Cesium.Cartesian3.fromDegrees(rectangle.west, rectangle.north),
      Cesium.Cartesian3.fromDegrees(rectangle.east, rectangle.north),
      Cesium.Cartesian3.fromDegrees(rectangle.east, rectangle.south),
      Cesium.Cartesian3.fromDegrees(rectangle.west, rectangle.south),
      Cesium.Cartesian3.fromDegrees(rectangle.west, rectangle.north),
    ];

    this.requestedAreaEntity = this.viewer.entities.add({
      polyline: {
        positions: positions,
        clampToGround: true,
        width: 3,
        material: Cesium.Color.GREEN.withAlpha(0.3),
      },
    });

    this.lastRequestedArea = rectangle;
  }
}
