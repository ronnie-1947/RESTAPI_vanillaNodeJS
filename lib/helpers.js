/*
* Helpers for various Tasks
*/

// Dependencies
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

module.exports = helpers;