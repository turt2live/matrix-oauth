import { Request, Response } from "express";
import { AuthManager } from "../AuthManager";
import * as crypto from "crypto";

export async function tokenExchange(req: Request, res: Response) {
    const redirectUri = req.body['redirect_uri'];
    const clientId = req.body['client_id'];
    const clientSecret = req.body['client_secret'];
    const code = req.body['code'];
    const grantType = req.body['grant_type'];

    const redirectUrl = new URL(redirectUri);
    redirectUrl.hash = '';

    if (!code || !AuthManager.isTokenSession(code)) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'invalid code',
        });
    }

    // Claim the session before continuing
    const session = AuthManager.cancelTokenSession(code);
    const reassertSession = () => AuthManager.startTokenSession(session.client, session.scope, session.redirectUri, session.matrixUserId, session.matrixAccessToken, session.matrixHomeserverUrl, session.expiresTs);

    if (session.expiresTs <= (new Date()).getTime()) {
        // Do not reassert session here!
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'invalid code',
        });
    }

    if (session.client.id !== clientId || session.client.secret !== clientSecret) {
        reassertSession();
        return res.status(400).json({
            error: 'invalid_client',
            error_description: 'invalid client credentials',
        });
    }

    if (redirectUri !== session.redirectUri) {
        reassertSession();
        return res.status(400).json({
            error: 'invalid_client',
            error_description: 'invalid redirect uri',
        });
    }

    if (grantType !== 'authorization_code') {
        reassertSession();
        return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'invalid grant type',
        });
    }

    // At this point the client is authorized - generate the access token for the consumer
    // We currently only support one kind of access token which has all the user information embedded into
    // it. This is done by using AES-256-CBC with the key being "client_id|client_secret" and the message
    // being a JSON object. The result is prefixed with the IV (16 bytes) then hex encoded.
    const message = JSON.stringify({
        // The homeserver URL and user ID are both included on the response too
        homeserverUrl: session.matrixHomeserverUrl,
        userId: session.matrixUserId,
        accessToken: session.matrixAccessToken,
    });
    const key = `${session.client.id}|${session.client.secret}`;
    const salt = crypto.randomBytes(64);
    const cryptKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha512');

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', cryptKey, iv);
    let encrypted = cipher.update(message);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const result = 'v1.' + Buffer.concat([iv, salt, encrypted]).toString('hex');

    res.header('Cache-Control', 'no-store');
    res.header('Pragma', 'no-cache');
    res.status(200).json({
        access_token: result,
        token_type: 'Bearer', // technically a lie, but whatever
        scope: session.scope,
        matrix_homeserver_url: session.matrixHomeserverUrl,
        matrix_user_id: session.matrixUserId,
    });
}
