# matrix-oauth
An OAuth 2.0 server for Matrix accounts

This is currently in early development and does not support the Authorization header. It does
however support confidential clients (exclusively) through the config. Only authorization code
grants are supported (4.1 of RFC 6749).

All sessions are kept in memory (for now), so restarting the service will interrupt anyone's
auth attempts and any claims to tokens. In future when the service supports more granular scopes
a database will be required.

## Running

The best deployment option is Docker:

```shell script
# Create the directory for mounting to the container
mkdir -p /etc/matrix-oauth/config

# Create/edit the configuration file with your favourite editor. Use
# the default.yaml config file in this repo as a template.
vi /etc/matrix-oauth/config/production.yaml

# Run the container
docker run -v /etc/matrix-oauth:/data -p 8080:8080 turt2live/matrix-oauth
```

Note that you'll need to set up your own reverse proxy for handling SSL. The Docker command above
might not be perfect for your environment, but it covers the part where it has a port to expose and
a volume to mount.

Important URLs:
* Authorization URL: `/oauth/authorize`
* Token URL: `/oauth/token`
* Paths to send to the container: `/public`, `/matrix`, `/oauth`

## Tokens

The token response encrypts the user's access token to reduce the chances of third party systems
getting access to user accounts. The token response always contains `matrix_user_id` and `matrix_homeserver_url`
as parameters if the client chooses to use those instead.

For scopes that return an access token of the user (unrestricted access to the account), the Bearer
token returned by the OAuth flow is encrypted using `aes-256-cbc`, prefixed with `v1.`. If the scope
doesn't yield an access token for the user, the Bearer token will be an opaque string.

The Bearer token returned by the OAuth flow is encrypted using `aes-256-cbc`, prefixed with a version
number (`v1` for now) plus `.` as a separator, and follows with the hex-encoded 16-byte IV, 64-byte salt
for the key, and encrypted message. The encrypted message is a JSON payload containing the `homeserverUrl`, 
`userId`, and `accessToken` strings.

The key for the AES function uses `PBKDF2` with the password being the concatenation of the client ID and
client secret (separated by `|`), the salt coming from the hex-encoded string, iterations being 100000,
and the hash function being `sha512`.

The crypto code roughly looks like:
```javascript
const message = JSON.stringify({
    homeserverUrl: "https://example.org",
    userId: "@alice:example.org",
    accessToken: "OP4QU3T0K3N",
});

const key = "test|s3cret"; // client_id|client_secret
const salt = crypto.randomBytes(64);
const cryptKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha512');

const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', cryptKey, iv);
let encrypted = cipher.update(message);
encrypted = Buffer.concat([encrypted, cipher.final()]);

const result = 'v1.' + Buffer.concat([iv, salt, encrypted]).toString('hex');
console.log(result);
```

Which could result in the following (linebreaks for readability):
```
v1.3a586264e14f8b3e0af62e70c726a293b703901a5c7776af64cdf0fa06ab0a1f682db210cc193b39788af18844b711bd916357c73439a6f9ba
45977fc4414416d1b24e8f65ac85029238a9a1f41572064b0e19a84f999eb0615959a108cad007f8f83838b9be7b9260a0cba63bc8d33c0ef7ba1
eb415721769f3b841ac1b31de59da114797d86c3ecaf786a476d7d6fb1b9433f4e4b60a5395273ab819d93ea93edfd0182c2d68d0454e892ae458
e9d0a516aeebacef92afdc281e1bd6c198ae
```

If you're using NodeJS, your decryption logic could be something like:
```javascript
const bearerToken = "v1.3a586264e14f8b3e0af62e70c726a293b703901a5c7776af64cdf0fa06ab0a1f682db210cc193b39788af18844b711bd916357c73439a6f9ba" +
    "45977fc4414416d1b24e8f65ac85029238a9a1f41572064b0e19a84f999eb0615959a108cad007f8f83838b9be7b9260a0cba63bc8d33c0ef7ba1" +
    "eb415721769f3b841ac1b31de59da114797d86c3ecaf786a476d7d6fb1b9433f4e4b60a5395273ab819d93ea93edfd0182c2d68d0454e892ae458" +
    "e9d0a516aeebacef92afdc281e1bd6c198ae";
const clientId = "test";
const clientSecret = "s3cret";

const buf = Buffer.from(bearerToken.substring("v1.".length), 'hex');
const iv = buf.slice(0, 16);
const salt = buf.slice(16, 80); // 64 bytes
const encrypted = buf.slice(80);

const cryptKey = crypto.pbkdf2Sync(`${clientId}|${clientSecret}`, salt, 100000, 32, 'sha512');
const decipher = crypto.createDecipheriv('aes-256-cbc', cryptKey, iv);
const result = decipher.update(encrypted) + decipher.final('utf-8');
console.log(JSON.parse(result));
```
