var request = require('request');

module.exports = {
    middleware: {
        receive: luisReceive,
        heres: luisHere
    }
};

function luisReceive(options) {
    if (!options || !options.serviceUri) { 
        throw new Error('No LUIS service url specified.'); 
    }

    var serviceUri = options.serviceUri.trim();
    if (serviceUri.lastIndexOf('&q=') != serviceUri.length - 3) {
        serviceUri += '&q=';
    }
    var minThreshold = options.minThreshold || 0.1;
    var captureThreshold = options.captureThreshold || 0.7;
    return function (bot, message, next) {
        // We will only process the text and either there's no topIntent 
        // or the score for the topIntent is below the captureThreshold.
        if (message.text && 
            (!message.topIntent || message.topIntent.score < captureThreshold)) {
            var uri = serviceUri + encodeURIComponent(message.text);
            request.get(uri, function (err, res, body) {
                try {
                    if (!err) {
                        // Intents for the builtin Cortana app don't return a score.
                        var result = JSON.parse(body);
                        if (result.intents.length == 1 && !result.intents[0].hasOwnProperty('score')) {
                            result.intents[0].score = 1.0;
                        }
                       
                        // Find top intent
                        // - Only return entities for the model with the top intent.
                        for (var i = 0; i < result.intents.length; i++) {
                            var intent = result.intents[i];
                            if (intent.score > minThreshold && 
                                (!message.topIntent || intent.score > message.topIntent.score)) {
                                message.topIntent = intent;
                                message.entities = result.entities || [];
                            }
                        } 
                    } else {
                       console.error(err.toString());
                    }
                } catch (e) {
                    console.error(err.toString());
                }
            });
        } else {
            next();
        }    
    };
}

function luisHeres() {
    return function (tests, message) {
        if (message.topIntent) {
            var intent = message.topIntent.intent.toLowerCase();
            for (var i = 0; i < tests.length; i++) {
                if (tests[i].trim().toLowerCase() == intent) {
                    return true;
                }
            }
        }
        return false;    
    };
}
