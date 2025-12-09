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

    getViewRectangle = (): Rectangle | undefined => {
        const rect = this.viewer.camera.computeViewRectangle();

        if (!rect) {
            return;
        }

        const ret: Rectangle = {
            north: radiansToDegrees(rect.north),
            east: radiansToDegrees(rect.east),
            south: radiansToDegrees(rect.south),
            west: radiansToDegrees(rect.west),
        };

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
