import { Server } from "http";

export interface MeasureStuffConfig {
    verbose?: boolean; // Default false
    port?: number; // Default 12345
    seconds?: number; // default 60
}
export interface MeasureStuffServer {
    (config?: MeasureStuffConfig) : void;
    close(cb?: (err?: Error) => void) : Server;
}

declare const server: MeasureStuffServer;
export default server;