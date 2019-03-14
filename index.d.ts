import { Server } from "http";

declare module 'measurestuff' {
    interface MeasureStuffConfig {
        verbose?: boolean; // Default false
        port?: number; // Default 12345
        seconds?: number; // default 60
    }
    interface MeasureStuffServer {
        (config?: MeasureStuffConfig) : void;
        close(cb?: (err?: Error) => void) : Server;
    }

    const server: MeasureStuffServer;
    export = server;
}