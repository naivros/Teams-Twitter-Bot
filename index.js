/* This script was provided almost entirely by Twitter's Getting Started APIs Labs. 
   This is meant as a starting point for more advanced projects, or a simple POC of how you can create a RSS feed of specific accounts... 
   Code is provided as is. 
*/

const axios = require('axios').default;
const endpoint = "..." // MS Teams Webhooks () // Teams -> TopRight Corner [...] -> Incoming Webhook (Configure) -> (Add Name / Image) -> Save -> Copy / Paste URL

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function pushToTeams(data) {
    // Populate the following JSON's body with content from https://adaptivecards.io/designer/
    dataBlob = {
        "type": "message",
        "attachments": [{
            "contentType": "application/vnd.microsoft.card.adaptive",
            "contentUrl": null,
            "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.4",
                "body": ...,
                "padding": "Default",
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "verticalContentAlignment": "Center"
            }
        }]
    }
    const res = axios.post(endpoint, dataBlob)
    return 1
}

const needle = require('needle');

// The code below sets the bearer token from your environment variables
// To set environment variables on macOS or Linux, run the export command below from the terminal:
// export BEARER_TOKEN='YOUR-TOKEN'
const token = "AAAAAAAAAAAAAAA..."
const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=id,text,source&expansions=&media.fields=&poll.fields=&place.fields=&user.fields=name';

// this sets up two rules - the value is the search terms to match on, and the tag is an identifier that
// will be applied to the Tweets return to show which rule they matched
// with a standard project with Basic Access, you can add up to 25 concurrent rules to your stream, and
// each rule can be up to 512 characters long

// Edit rules as desired below
const rules = [{ value: 'from:_OpenSecurity_', value: 'from:aLilSus' }] // insert from:username to monitor accounts for posts, or... check out the twitter api for more rules.

async function getAllRules() {
    const response = await needle('get', rulesURL, {
        headers: {
            "authorization": `Bearer ${token}`
        }
    })

    if (response.statusCode !== 200) {
        console.log("Error:", response.statusMessage, response.statusCode)
        throw new Error(response.body);
    }

    return (response.body);
}

async function deleteAllRules(rules) {

    if (!Array.isArray(rules.data)) {
        return null;
    }

    const ids = rules.data.map(rule => rule.id);

    const data = {
        "delete": {
            "ids": ids
        }
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`
        }
    })

    if (response.statusCode !== 200) {
        throw new Error(response.body);
    }

    return (response.body);

}

async function setRules() {

    const data = {
        "add": rules
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`
        }
    })

    if (response.statusCode !== 201) {
        throw new Error(response.body);
    }

    return (response.body);

}

async function streamConnect(retryAttempt) {

    const stream = needle.get(streamURL, {
        headers: {
            "User-Agent": "v2FilterStreamJS",
            "Authorization": `Bearer ${token}`
        },
        timeout: 20000
    });

    stream.on('data', async data => {
        try {
            let json = JSON.parse(data);
            /* Insert logic for processing, or static values...*/
            json.name = '...' // (json) => { ... } // 
            json.href = `https://twitter.com/${json.name}/status/${json.id}`;
            let resp = pushToTeams(json);
            retryAttempt = 0;
        } catch (e) {
            if (data.detail === "This stream is currently at the maximum allowed connection limit.") {
                console.log(data.detail)
                console.log("Waiting to bypass timeout.");
                await timeout(30000)
                console.log("Done waiting... Restarting...");
                // Shuts down application, assuming it's a service it will then autorestart without triggering the reconect timeout...
                process.exit(1)
            }
        }
    }).on('err', error => {
        if (error.code !== 'ECONNRESET') {
            console.log(error.code);
            process.exit(1);
        } else {
            // This reconnection logic will attempt to reconnect when a disconnection is detected.
            // To avoid rate limits, this logic implements exponential backoff, so the wait time
            // will increase if the client cannot reconnect to the stream.
            setTimeout(() => {
                console.warn("A connection error occurred. Reconnecting...")
                streamConnect(++retryAttempt);
            }, 2 ** retryAttempt)
        }
    });
    return stream;
}


(async() => {
    let currentRules;

    try {
        // Gets the complete list of rules currently applied to the stream
        currentRules = await getAllRules();

        // Delete all rules. Comment the line below if you want to keep your existing rules.
        await deleteAllRules(currentRules);

        // Add rules to the stream. Comment the line below if you don't want to add new rules.
        await setRules();

    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    // Listen to the stream.
    streamConnect(0);
})();
