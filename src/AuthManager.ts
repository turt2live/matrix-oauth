import { OAuthClient } from "./config";
import * as cryptoRandomString from "crypto-random-string";

export interface AuthSession {
    redirectUri: string;
    client: OAuthClient;
    scope: string;
    state: string;
}

export interface TokenSession {
    expiresTs: number;
    client: OAuthClient;
    scope: string;
    redirectUri: string;
    matrixUserId: string;
    matrixAccessToken: string;
    matrixHomeserverUrl: string;
}

export interface TokenSessionInfo {
    expiresTs: number;
    code: string;
}

export class AuthManager {
    private static authSessions: { [id: string]: AuthSession } = {};
    private static tokenSessions: { [code: string]: TokenSession } = {};

    public static startAuthSession(client: OAuthClient, scope: string, state: string, redirectUri: string): string {
        const sessionId = cryptoRandomString({length: 32});
        AuthManager.authSessions[sessionId] = {
            redirectUri,
            client,
            scope,
            state,
        };
        return sessionId;
    }

    public static isAuthSession(sessionId: string): boolean {
        return !!AuthManager.authSessions[sessionId];
    }

    public static cancelAuthSession(sessionId: string): AuthSession {
        const session = AuthManager.authSessions[sessionId];
        delete AuthManager.authSessions[sessionId];
        return session;
    }

    public static startTokenSession(client: OAuthClient, scope: string, redirectUri: string, matrixUserId: string, matrixAccessToken: string, matrixHomeserverUrl: string, expiresTs: number = 0): TokenSessionInfo {
        if (expiresTs === 0) expiresTs = (new Date()).getTime() + (5 * 60 * 1000); // 5 minutes from now
        const code = cryptoRandomString({length: 32});
        AuthManager.tokenSessions[code] = {
            expiresTs,
            client,
            scope,
            redirectUri,
            matrixUserId,
            matrixAccessToken,
            matrixHomeserverUrl,
        };
        return {expiresTs, code};
    }

    public static isTokenSession(code: string): boolean {
        return !!AuthManager.tokenSessions[code];
    }

    public static cancelTokenSession(code: string): TokenSession {
        const session = AuthManager.tokenSessions[code];
        delete AuthManager.tokenSessions[code];
        return session;
    }
}
