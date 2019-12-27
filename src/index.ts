import * as express from "express";
import * as bodyParser from "body-parser";
import { LogLevel, LogService, RichConsoleLogger } from "matrix-bot-sdk";
import config from "./config";
import { authorize, submitLogin } from "./web/oauth_auth";
import { renderLogin } from "./web/matrix_login";
import { Liquid } from "liquidjs";
import { tokenExchange } from "./web/oauth_token";

LogService.setLogger(new RichConsoleLogger());
LogService.setLevel(LogLevel.INFO);

const app = express();
app.engine('liquid', new Liquid().express());
app.set('views', config.templateDirectory); // set before view engine!
app.set('view engine', 'liquid');
app.use('/public', express.static(config.assetsDirectory));
app.use(bodyParser.urlencoded({extended: true}));

app.get('/oauth/authorize', authorize.bind(this));
app.post('/oauth/authorize/continue', submitLogin.bind(this));
app.post('/oauth/token', tokenExchange.bind(this));

app.get('/matrix/login', renderLogin.bind(this));

app.listen(config.listenPort, config.listenAddress, () => LogService.info("index", "Now listening for OAuth requests"));
