import * as config from "config";

export interface OAuthClient {
    id: string;
    secret: string;
    redirectUris: string[];
}

interface IConfig {
    listenPort: number;
    listenAddress: string;
    templateDirectory: string;
    assetsDirectory: string;
    clients: OAuthClient[];
    homeservers: string[];
}

export default <IConfig>config;
