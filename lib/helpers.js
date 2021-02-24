/*
* Helpers for various Tasks
*/

// Dependencies
const querystring = require('querystring');
const https = require('https')

const crypto = require('crypto');
const config = require('../config');

// Create a container for helpers
const helpers = {}

// Create SHA256 hash
helpers.hash = (str)=>{
    
    if(!typeof(str)==='string' || str.length < 1){
        return false;
    }

    return crypto.createHmac('SHA256', config.hashingSecret).update(str).digest('hex');
}

// Parse a JSON string to an object
helpers.parseJsonToObject = str =>{
    try {
        const obj = JSON.parse(str);
        return obj
    } catch (error) {
        return {};
    }
}

// Create a random string of a given length
helpers.createRandomString = (strLength)=>{
    
    strLength = typeof(strLength)== 'number' && strLength.length >0?strLength:20;
    
    const hash = crypto.randomBytes(strLength).toString('hex');
    return hash;
}


// Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, msg, callback)=>{

    // Validate the parameters
    phone = typeof(phone) === 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof(msg) === 'string' && msg.trim().length > 0 ? msg.trim() : false;

    if(!phone || !msg){
        callback({Error: 'Given parameters were missing or invalid'})
        return
    }

    const payload = {
        From: config.twilio.fromPhone,
        To: `+91${phone}`,
        Body: msg
    };

    // Stringify the payload
    const stringPayload = querystring.stringify(payload)

    // Configure the reqest details
    const requestDetails = {
        protocol: 'https',
        hostname: 'api.twilio.com',
        method: 'POST',
        path: `/2010-04-01/Accounts/${config.twilio.accountSid}Messages.json`,
        auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(stringPayload)
        }
    }

    // Instantiate the request object
    const req = https.request(requestDetails, res=>{

        // Grab the status of the sent request
        const status = res.statusCode;

        // Callback successfully if the request went through
        if(status == 200 || status == 201){callback(false)}
        else{ callback('Status code returned was '+ status)}

    })

    // Bind to the error event so it doesn't get thrown
    req.on('error', err=>{
        callback(e);
    });

    // Add the payload
    req.write(stringPayload)

    // End the request
    req.end()
}

module.exports = helpers;