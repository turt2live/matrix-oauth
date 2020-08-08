import * as express from "express";
import * as bodyParser from "body-parser";
import { LogLevel, LogService, RichConsoleLogger } from "matrix-bot-sdk";
import config from "./config";
import { authorize, submitLogin } from "./web/oauth_auth";
import { renderLogin } from "./web/matrix_login";
import { Liquid } from "liquidjs";
import { tokenExchange } from "./web/oauth_token";
import { DB } from "./database/db";

LogService.setLogger(new RichConsoleLogger());
LogService.setLevel(LogLevel.INFO);

(async function () {
    const db = new DB();
    await db.start();

    const app = express();
    app.engine('liquid', new Liquid().express());
    app.set('views', config.templateDirectory); // set before view engine!
    app.set('view engine', 'liquid');
    app.use('/public', express.static(config.assetsDirectory));
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json({}));

    app.get('/oauth/authorize', (rq, rs) => authorize(rq, rs));
    app.post('/oauth/authorize/continue', (rq, rs) => submitLogin(rq, rs));
    app.post('/oauth/token', (rq, rs) => tokenExchange(rq, rs));

    app.get('/matrix/login', (rq, rs) => renderLogin(rq, rs));

    app.listen(config.listenPort, config.listenAddress, () => LogService.info("index", "Now listening for OAuth requests"));
})()
