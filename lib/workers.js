/*
* These are worker related task
*/

// Dependencies
const path = require('path')
const fs = require('fs')
const http = require('http')
const https = require('https')
const helpers = require('./helpers')
const url = require('url')

const _logs = require('./logs')
const _data = require('./data')


// Instantiate the worker object
const workers = {};


// Sanity-check the check-data
workers.validateCheckData = (originalCheckData) => {
    
    originalCheckData = typeof (originalCheckData) == 'object' && originalCheckData ? originalCheckData : {};
    originalCheckData.id = typeof (originalCheckData.id) == 'string' && originalCheckData.id ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof (originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof (originalCheckData.protocol) == 'string' && ['http', 'https'].includes(originalCheckData.protocol) ? originalCheckData.protocol.trim() : false;
    originalCheckData.url = typeof (originalCheckData.url) == 'string' && originalCheckData.url ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof (originalCheckData.method) == 'string' && ['get', 'post', 'put', 'delete'].includes(originalCheckData.method.toLowerCase()) ? originalCheckData.method.trim() : false;
    originalCheckData.successCodes = typeof (originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) === 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set the keys that may not be set
    originalCheckData.state = typeof (originalCheckData.state) == 'string' && ['up', 'down'].includes(originalCheckData.state) ? originalCheckData.state.trim() : 'down';
    originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : Date.now();

    // if all the checks pass, proceed
    if (!originalCheckData.id || !originalCheckData.userPhone || !originalCheckData.protocol || !originalCheckData.url || !originalCheckData.method || !originalCheckData.successCodes || !originalCheckData.timeoutSeconds || !originalCheckData.state || !originalCheckData.lastChecked) {
        // console.log(originalCheckData.id , originalCheckData.userPhone , originalCheckData.protocol , originalCheckData.url , originalCheckData.method , originalCheckData.successCodes , originalCheckData.timeoutSeconds , originalCheckData.state , originalCheckData.lastChecked)
        console.error('One of the checks is not properly formatted')
        return
    }

    // Perform the check, send the originalCheckData and the outcome of the check
    workers.performCheck(originalCheckData);

}

workers.performCheck = (originalCheckData) => {

    // Prepare the initial check outcome
    const checkOutcome = {
        error: false,
        responseCode: false
    }

    // Mark that the outcome has not been sent yet
    let outcomeSent = false;

    // Parse the hostname and the path out of the original check data
    const parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true)
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path;

    // Construct the request
    const requestDetails = {
        protocol: `${originalCheckData.protocol}:`,
        hostname: hostName,
        method: originalCheckData.method.toUpperCase(),
        path: path,
        timeout: originalCheckData.timeoutSeconds * 1000
    };

    // Instantiate the request object
    const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
    const req = _moduleToUse.request(requestDetails, res => {

        // Grab the status of the sent request
        const status = res.statusCode;

        // Update the checkOutcome and pass the data along
        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', e => {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            error: true,
            value: e
        }
        
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }

    })

    req.on('timeout', e => {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            error: true,
            value: 'timeout'
        }

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }

    })

    req.end();
}


// Process the check outcome, update thhe check data as needed
workers.processCheckOutcome =(originalCheckData, checkOutcome)=>{

    // Decide if the check is considered up or down
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1? 'up': 'down';

    // Decide if an alert is warranted
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true: false;

    // Update the check data
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    // Log the outcome
    const timeOfCheck = Date.now()
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck)

    // Save the updates
    _data.update('checks', newCheckData.id, newCheckData, err=>{
        if(err){
            console.log('Error trying to save updates to one of the checks')
            return
        }

        // send the new check data to the next phase in the process if needed
        if(!alertWarranted){
            // console.log('Check outcome has not changed, no alert needed');
            return
        }

        workers.alertUserToStatusChange(newCheckData);
    })
}


// Alert the user as to a change in their check status
workers.alertUserToStatusChange = (newCheckData)=>{

    const msg = 'Alert: Your check for '+ newCheckData.method.toUpperCase()+' '+ newCheckData.protocol+'://'+newCheckData.url+' is currently'+newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone, msg, err=>{
        if(err){
            console.log('Error: in sending sms')
            return
        }
        console.log('Success')
    })
}



// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {

    // Get all the checks
    _data.list('checks', (err, checks) => {

        if (err || !checks) {
            console.error("Could not find any checks to process")
            return
        }

        checks.forEach(check => {

            // Read in the check data
            _data.read('checks', check, (err, originalCheckData) => {

                if (err || !originalCheckData) {
                    console.error("Error reading one of the check's data")
                    return
                }
                
                // Pass it to check validator
                workers.validateCheckData(originalCheckData);
            })
        })
    })
}


workers.log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck)=>{

    // Form the log data 
    const logData = {
        check:originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck
    }

    // convert data to a string
    const logString = JSON.stringify(logData)

    // Determine the name of the log file
    const logFileName = originalCheckData.id;
    
    // Append thhe log string to the file
    _logs.append(logFileName, logString, err=>{

        if(err){
            console.log(err)
            console.log('Logging to file failed')
            return
        }
        // console.log('Logging to file succeeded')
    })
}


// Timer to execute the worker-process once per minute
workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks()
    }, 1000 * 60)
}

workers.rotateLogs = ()=>{

    // List all the non cmpressed log files
    _logs.list(false, (err, logs)=>{
        if(err || !logs){
            console.log("Error: Could not find any logs to rotate")
            return
        }
        logs.forEach(logName=>{
            // Compress the data
            const logId = logName.replace('.log', '');
            const newFileId = `${logId}-${Date.now()}`;
            _logs.compress(logId, newFileId, err=>{
                if(err){
                    console.log('Error compressing one of the log files')
                    return
                }

                // Truncate the log
                _logs.truncate(logId, err=>{
                    if(err){
                        console.log('Error in truncating logFile')
                        return
                    }
                    console.log('Success truncating logFile')
                })
            })
        })
    })
}

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = function(){
    setInterval(()=>{
        workers.rotateLogs();
    },1000*60*60*24)
}

// Init script
workers.init = () => {

    // Execute all the checks immediately
    workers.gatherAllChecks();

    // Call the loop so the checks will execute later on
    workers.loop();

    // Compress all the logs immediately
    workers.rotateLogs();

    // Call the compression loop so logs will be compressed later on
    workers.logRotationLoop();
}


module.exports = workers;
