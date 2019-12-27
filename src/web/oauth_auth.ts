import { Request, Response } from "express";
import { LogService, MatrixAuth, MatrixClient } from "matrix-bot-sdk";
import config from "../config";
import { AuthManager } from "../AuthManager";

export async function authorize(req: Request, res: Response) {
    const redirectUri = req.query['redirect_uri'];
    const clientId = req.query['client_id'];
    const scope = req.query['scope'];
    const responseType = req.query['response_type'];
    const state = req.query['state'];

    const redirectUrl = new URL(redirectUri);
    redirectUrl.hash = '';

    if (!redirectUri) {
        LogService.warn("oauth_auth", "Auth attempt without redirect URI");
        return res.status(400).send('invalid redirect_uri');
    }

    const client = config.clients.find(c => c.id === clientId);
    if (!client) {
        redirectUrl.searchParams.set('error', 'invalid_request');
        redirectUrl.searchParams.set('error_description', 'invalid client_id');
        if (state) redirectUrl.searchParams.set('state', state);
        redirectUrl.search = redirectUrl.searchParams.toString();
        return res.redirect(redirectUrl.href);
    }

    if (scope !== 'access_token') {
        // TODO: Support other scopes (https://github.com/turt2live/matrix-oauth/issues/1)
        redirectUrl.searchParams.set('error', 'invalid_scope');
        redirectUrl.searchParams.set('error_description', 'invalid scope');
        if (state) redirectUrl.searchParams.set('state', state);
        redirectUrl.search = redirectUrl.searchParams.toString();
        return res.redirect(redirectUrl.href);
    }

    if (responseType !== 'code') {
        redirectUrl.searchParams.set('error', 'unsupported_response_type');
        redirectUrl.searchParams.set('error_description', 'invalid response_type');
        if (state) redirectUrl.searchParams.set('state', state);
        redirectUrl.search = redirectUrl.searchParams.toString();
        return res.redirect(redirectUrl.href);
    }

    const sessionId = AuthManager.startAuthSession(client, scope, state, redirectUri);
    return res.redirect(`/matrix/login?session=${sessionId}`);
}

export async function submitLogin(req: Request, res: Response) {
    if (typeof (req.body) !== 'object') {
        return res.status(400).send('invalid request');
    }

    const sessionId = req.body['sessionId'];
    const username = req.body['username'];
    const password = req.body['password'];
    let homeserver = req.body['homeserver'];
    const homeserverUrl = req.body['homeserverUrl'];
    const action = req.body['next'];
    const homeservers = config.homeservers;

    if (!sessionId || !AuthManager.isAuthSession(sessionId)) {
        return res.status(400).send('invalid session');
    }

    const redirectError = (msg: string) => {
        return res.redirect(`/matrix/login?session=${sessionId}&error=${encodeURIComponent(msg)}`);
    };

    if (action === 'cancel') {
        const session = AuthManager.cancelAuthSession(sessionId);
        const redirectUrl = new URL(session.redirectUri);
        redirectUrl.searchParams.set('error', 'access_denied');
        redirectUrl.searchParams.set('error_description', 'login cancelled');
        if (session.state) redirectUrl.searchParams.set('state', session.state);
        redirectUrl.search = redirectUrl.searchParams.toString();
        return res.redirect(redirectUrl.href);
    }

    if (homeservers.length > 0 && !homeservers.includes(homeserver)) {
        return redirectError("Invalid homeserver");
    } else if (homeservers.length === 0) {
        homeserver = null; // forcefully ignore the homeserver argument
    }

    // TODO: .well-known discovery of homeserver
    const hsUrl = homeserver ? `https://${homeserver}` : homeserverUrl;
    if (!hsUrl) return redirectError("Please provide a homeserver");

    const auth = new MatrixAuth(hsUrl);

    let client: MatrixClient;
    try {
        client = await auth.passwordLogin(username, password);
    } catch (e) {
        LogService.error("oauth_auth", e);
        if (e.body && e.body.errcode === 'M_FORBIDDEN') {
            return redirectError(e.body.error || "Unexpected error logging in");
        }
        return redirectError("Unexpected server error logging in");
    }

    const authSession = AuthManager.cancelAuthSession(sessionId); // clear auth session

    const userId = await client.getUserId();
    const accessToken = client.accessToken;
    const targetHomeserverUrl = client.homeserverUrl;
    const tokenSession = AuthManager.startTokenSession(authSession.client, authSession.scope, authSession.redirectUri, userId, accessToken, targetHomeserverUrl);

    const redirectUrl = new URL(authSession.redirectUri);
    redirectUrl.searchParams.set('code', tokenSession.code);
    if (authSession.state) redirectUrl.searchParams.set('state', authSession.state);
    redirectUrl.search = redirectUrl.searchParams.toString();
    return res.redirect(redirectUrl.href);
}
