import * as config from "config";

export interface OAuthClient {
    id: string;
    secret: string;
    redirectionUris: string[];
}

interface IConfig {
    listenPort: number;
    listenAddress: string;
    templateDirectory: string;
    assetsDirectory: string;
    clients: OAuthClient[];
    homeservers: string[];
    postgresql: {
        user: string;
        host: string;
        database: string;
        password: string;
        port: number;
    };
}

export default <IConfig>config;
