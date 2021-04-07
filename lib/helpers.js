/*
* Helpers for various Tasks
*/

// Dependencies
const querystring = require('querystring');
const https = require('https')
const path = require('path')
const fs = require('fs')

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
        To: `+1${phone}`,
        Body: msg
    };

    // Stringify the payload
    const stringPayload = querystring.stringify(payload)

    // Configure the reqest details
    const requestDetails = {
        protocol: 'https:',
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
        else{ 
            callback('Status code returned was '+ status)
        }

    })

    // Bind to the error event so it doesn't get thrown
    req.on('error', err=>{
        callback(err);
    });

    // Add the payload
    req.write(stringPayload)

    // End the request
    req.end()
}


helpers.getTemplate = (templateName, data, callback)=>{

    templateName = typeof(templateName) == 'string' && templateName.length > 0?templateName: false
    data = typeof(data)=='object'&&data !== null? data:{}

    if(!templateName){
        callback('A valid templateName was not specified')
        return
    }

    const templatesDir = path.join(__dirname, '/../templates')
    fs.readFile(templatesDir+'/'+templateName+'.html', 'utf8', (err, str)=>{

        if(err || !str){
            callback('No template could be found')
            return
        }

        // Do interpolation on the string
        const finalString = helpers.interpolate(str, data);
        callback(false, str)
    })
}

// Add the universal header and footer to a String and pass the provided data and footer
helpers.addUniversalTemplates = (str, data, callback)=>{
    str = typeof(str)=='string'&& str.length>0?str: ''
    data = typeof(data) =='object' && data !== null ? data: {}

    // Get the headers
    helpers.getTemplate('_header', data, (err, headerString)=>{

        if(err || !headerString){
            callback('Could not get header String')
            return
        }
        
        // Get the footer
        helpers.getTemplate('_footer', data, (err, footerString)=>{
            if(err || !footerString){
                callback('Could not get footer String')
                return
            }

            const fullStr = headerString+str+footerString
            callback(false, fullStr)
        })
    })
}

// Take a given string and a data object and fine/replace all the keys within it
helpers.interpolate = (str, data)=>{
    str = typeof(str)=='string'&& str.length>0?str:''
    data = typeof(data)=='object'&&data !== null? data:{}

    // Add the templateGlobals do the data object, prepending their key name with 'global'
    for(const keyName in config.templateGlobals){
        if(config.templateGlobals.hasOwnProperty(keyName)){
            data['global.'+keyName] = config.templateGlobals[keyName]
        }
    }

    // For each key in the data object, insert its value into the string at the corresponding
    for(const key in data){
        if(data.hasOwnProperty(key) && typeof(data[key]) == 'string'){
            const replace = data[key]
            const find = `{${key}}`
            str = str
        }
    }
    return str;
}

module.exports = helpers;