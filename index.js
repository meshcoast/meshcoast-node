const crypto = require("crypto");
const https = require("https");

const DEFAULT_API_HOST = "www.meshcoast.com";
const DEFAULT_API_PORT = 443;

function makeTimestamp() {
    return new Date().getTime();
}

function makeNonce() {
    return crypto.randomBytes(16).toString("hex")
}

module.exports = (function() {
    const INSTANCES = {};

    function Meshcoast(options) {
        if(!options["id"]) throw new Error("id must be provided.");
        if(!options["apiKey"]) throw new Error("apiKey must be provided.");

        this._instanceId = crypto.randomBytes(16).toString("hex");

        INSTANCES[this._instanceId] = {
            id: options["id"],
            apiKey: options["apiKey"],
            host: options["host"] || DEFAULT_API_HOST,
            port: options["port"] || DEFAULT_API_PORT,
        };
    }

    Object.assign(Meshcoast.prototype, {
        // TODO: Verify that to is a valid nano address
        payment: function(destinationAddress) {
            const options = INSTANCES[this._instanceId] || {};

            const id = options["id"];
            const apiKey = options["apiKey"];

            const nonce = makeNonce();
            const timestamp = makeTimestamp();
            const authorization = crypto.createHmac("sha256", apiKey).update(nonce + "~" + timestamp).digest('hex');

            const requestData = JSON.stringify({
                destinationAddress: destinationAddress
            });

            return new Promise(function(resolve, reject) {
                const req = https.request({
                    hostname: options["host"] || DEFAULT_API_HOST,
                    port: options["port"] || DEFAULT_API_PORT,
                    path: "/api/sdk/applications/" + id + "/payments",
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

    return Meshcoast;
})();