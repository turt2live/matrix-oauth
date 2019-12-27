import { Request, Response } from "express";
import config from "../config";
import { AuthManager } from "../AuthManager";

export function renderLogin(req: Request, res: Response) {
    const homeservers = config.homeservers;
    const sessionId = req.query['session'];
    const loginError = req.query['error'];

    if (!sessionId || !AuthManager.isAuthSession(sessionId)) {
        return res.status(400).send('unknown session');
    }

    return res.render('login', {sessionId, homeservers, loginError});
}
