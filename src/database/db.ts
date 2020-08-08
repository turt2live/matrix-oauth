import { Client } from "pg";
import config from "../config";
import { IToken } from "./token";

export class DB {
    private client = new Client(config.postgresql);

    constructor() {
    }

    public async start() {
        await this.client.connect();
        await this.client.query("CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, userId TEXT NOT NULL, deviceId TEXT NOT NULL, homeserverUrl TEXT NOT NULL, scopes TEXT NOT NULL, accessToken TEXT NOT NULL);");
        await this.client.query("CREATE INDEX IF NOT EXISTS idx_tokens_access_token ON tokens(accessToken);");
    }

    public async getToken(token: string): Promise<IToken> {
        const res = await this.client.query("SELECT * from tokens WHERE token = $1;", [token]);
        if (!res || res.rows.length !== 1) return null;

        return {
            userId: res.rows[0].userId,
            deviceId: res.rows[0].deviceId,
            token: res.rows[0].token,
            homeserverUrl: res.rows[0].homeserverUrl,
            scopes: res.rows[0].scopes.split(' '),
            accessToken: res.rows[0].accessToken,
        };
    }

    public async putToken(token: IToken) {
        await this.client.query("INSERT INTO tokens (token, userId, deviceId, homeserverUrl, scopes, accessToken) VALUES ($1, $2, $3, $4, $5);", [token.token, token.userId, token.deviceId, token.homeserverUrl, token.scopes.join(' '), token.accessToken]);
    }
}
