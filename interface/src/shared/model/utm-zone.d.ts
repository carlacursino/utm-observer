import type { Volume4D } from "./common";

export interface UTMZone {
    id: string;
    name: string;
    manager: string;
    volumes: Volume4D[];
}
