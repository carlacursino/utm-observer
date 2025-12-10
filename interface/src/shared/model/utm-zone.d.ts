import type { Volume4D } from "./common";

export interface UTMZone {
    name: string;
    manager: string;
    volumes: Volume4D[];
}
