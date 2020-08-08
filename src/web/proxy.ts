import { Request, Response } from "express";
import { DB } from "../database/db";

export async function proxy(req: Request, res: Response, db: DB) {
    let token = req.headers["authorization"];
    if (token) {
        if (token.startsWith("Bearer ")) {
            token = token.substring("Bearer ".length);
        } else {
            token = null; // invalid token
        }
    }
    if (!token) {
        token = req.query["access_token"];
    }

    // if we have a token, look up the associated access token
    if (token) {
        const dbToken = await db.getToken(token);
        if (!dbToken) {
            return res.status(401).json({
                error: "Unknown token",
                errcode: "M_UNKNOWN_TOKEN",
            });
        }
    }

    // TODO: Verify that the caller can make the request

    // TODO: Proxy the request
}
