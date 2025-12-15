import { Cartesian3, Math as CesiumMath, SceneMode } from "cesium";
import type { Rectangle } from "@/shared/model";

function radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI);
}

export class MapCameraManager {
    private viewer: Cesium.Viewer;

    constructor(viewer: Cesium.Viewer) {
        this.viewer = viewer;
    }

    setupInitialCamera() {
        navigator.geolocation.getCurrentPosition(
            (position: GeolocationPosition) => {
                const { latitude, longitude, altitude } = position.coords;

                const cameraAltitude = altitude ? altitude + 1000 : 2000;

                this.viewer.camera.setView({
                    destination: Cartesian3.fromDegrees(
                        longitude,
                        latitude,
                        cameraAltitude,
                    ),
                    orientation: {
                        heading: CesiumMath.toRadians(0),
                        pitch: CesiumMath.toRadians(-45),
                        roll: 0,
                    },
                });
            },
        );
    }

    addMoveEndCallback(callback: () => void) {
        this.viewer.camera.moveEnd.addEventListener(callback);
    }

    private lastValidViewRectangle: Rectangle | undefined;

    getViewRectangle = (): Rectangle | undefined => {
        const rect = this.viewer.camera.computeViewRectangle();

        if (!rect) {
            return this.lastValidViewRectangle;
        }

        const ret: Rectangle = {
            north: radiansToDegrees(rect.north),
            east: radiansToDegrees(rect.east),
            south: radiansToDegrees(rect.south),
            west: radiansToDegrees(rect.west),
        };

        const latSpan = Math.abs(ret.north - ret.south);
        const lngSpan = Math.abs(ret.east - ret.west);

        console.log("Lat Span:", latSpan);
        console.log("Lng Span:", lngSpan);

        if (latSpan > 0.05 || lngSpan > 0.05) {
            return this.lastValidViewRectangle;
        }

        this.lastValidViewRectangle = ret;
        return ret;
    };

    setMode(is3D: boolean) {
        if (is3D) {
            this.viewer.scene.mode = SceneMode.SCENE3D;
        } else {
            this.viewer.scene.mode = SceneMode.SCENE2D;
        }
    }
}
