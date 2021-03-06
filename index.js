const crypto = require("crypto");
const https = require("https");

const DEFAULT_API_HOST = "www.meshcoast.com";
const DEFAULT_API_PORT = 443;
const INSTANCES = {};

function getTime() {
    return new Date().getTime();
}

function makeNonce() {
    return crypto.randomBytes(16).toString("hex")
}

function Meshcoast(applicationId, apiKey, options) {
    if(!applicationId) throw new Error("applicationId must be provided.");
    if(!apiKey) throw new Error("apiKey must be provided.");

    this._instanceId = crypto.randomBytes(16).toString("hex");

    options = options || {};
    options["host"] = options["host"] || DEFAULT_API_HOST;
    options["port"] = options["port"] || DEFAULT_API_PORT;

    INSTANCES[this._instanceId] = {
        options: options,
        applicationId: applicationId,
        apiKey: apiKey
    };
}

Object.assign(Meshcoast.prototype, {
    // TODO: Verify that to is a valid nano address
    payment: function(to) {
        const instance = INSTANCES[this._instanceId];
        const options = instance["options"] || {};
        const applicationId = instance["applicationId"];
        const apiKey = instance["apiKey"];

        const nonce = makeNonce();
        const timestamp = getTime();
        const authorization = crypto.createHmac("sha256", apiKey).update(nonce + "~" + timestamp).digest('hex');

        const requestData = JSON.stringify({
            to: to
        });

        return new Promise(function(resolve, reject) {
            const req = https.request({
                hostname: options["host"] || DEFAULT_API_HOST,
                port: options["port"] || DEFAULT_API_PORT,
                path: "/api/sdk/applications/" + applicationId + "/payments",
                method: "POST",
                headers : {
                    "Content-Type": "application/json",
                    "X-Meshcoast-Nonce": nonce,
                    "X-Meshcoast-Timestamp": timestamp,
                    "Authorization": "Bearer " + authorization,
                }
            }, function(res) {
                res.on("data", function(data) {
                    data = JSON.parse(data);

                    if(res.statusCode == 200) {
                        resolve(data)
                    } else {
                        reject(data)
                    }
                })
            });

            req.write(requestData);
            req.end();
        });
    }
});

module.exports = Meshcoast;