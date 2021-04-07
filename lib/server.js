// Dependencies
const http = require('http');
const https = require('https')
const url = require('url');
const { StringDecoder } = require('string_decoder');
const fs = require('fs');
const path = require('path');

const handlers = require('./handlers');
const helpers = require('./helpers');
const _data = require('./data');
const config = require('../config');

// Instantiate the server module object
const server = {};

//  Instantiate the HTTP server
server.httpServer = http.createServer(unifiedServer)



//  Instantiate the HTTPS server
server.httpsServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '..', 'https', 'key.pem' )),
    cert: fs.readFileSync(path.join(__dirname, '..', 'https', 'cert.pem'))
}

server.httpsServer = https.createServer(server.httpsServerOptions, unifiedServer)



// All server logic of http and https
function unifiedServer (req, res) {
    
    // Get the URL  and parse it
    const parsedUrl = url.parse(req.url, true);
    

    // Get the path
    const path = parsedUrl.pathname;

    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the HTTP method
    const method = req.method.toLocaleLowerCase();

    // Get the query string as an object
    const queryStringObject = parsedUrl.query;

    // Get the Headers as an object
    const headers = req.headers;

    // Get the payload , If any
    const decoder = new StringDecoder('utf-8');

    let buffer = '';
    req.on('data', function (data) {
        buffer += decoder.write(data)
    })
    req.on('end', e => {

        buffer += decoder.end();

        // Choose the route
        const chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound

        //  Construct the data object to send to the handler
        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer)
        }
        //  console.log(helpers.parseJsonToObject(buffer))
        // Route the request to the handler specified in router
        chosenHandler(data, (statusCode, payload, contentType) => {

            // Determine the type of response(fallback to JSON)

            // Use the status code called back
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;

            
            // Return the response parts that are content-specific
            let payloadString = ''

            if(contentType=='json'){
                // Using the payload
                payload = typeof (payload) == 'object' ? payload : {};
    
                // Convert the payload to a string
                payloadString = JSON.stringify(payload);
                res.setHeader('Content-Type', 'application/json');
            }
            
            if(contentType=='html'){
                res.setHeader('Content-Type', 'text/html');
                payloadString = typeof(payload) == 'string'? payload: ''
                
            }


            // Return the response parts that are common to all content types
            res.writeHead(statusCode);
            res.end(payloadString);
        })
    })
}


server.router = {
    '': handlers.index,
    'account/create': handlers.accountCreate,
    'account/edit': handlers.accountEdit,
    'account/deleted': handlers.accountDeleted,
    'session/create': handlers.sessionCreate,
    'session/deleted': handlers.sessionDeleted,
    'checks/all': handlers.checkList,
    'checks/create': handlers.checksCreate,
    'checks/edit': handlers.checksEdit,
    ping: handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.checks
}


server.init = () => {

    // Start the server , and have it listen on port 3000
    server.httpServer.listen(config.httpPort, () => {
        console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`)
    })

    // Start the server , and have it listen on port 3001
    server.httpsServer.listen(config.httpsPort, () => {
        console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`)
    })

}

// Export the module
module.exports = server;