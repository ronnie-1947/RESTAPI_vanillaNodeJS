// Dependencies
const http = require('http');
const https = require('https')
const url = require('url');
const {StringDecoder} = require('string_decoder');
const fs = require('fs');

const _data = require('./lib/data');
const config = require('./config');

//  Instantiate the HTTP server
const httpServer = http.createServer(unifiedServer)

// Start the server , and have it listen on port 3000
httpServer.listen( config.httpPort , ()=>{
    console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`)
})

//  Instantiate the HTTPS server
const httpsServerOptions= {
    key: fs.readFileSync('./https/key.pem'),
    cert: fs.readFileSync('./https/cert.pem')
}

const httpsServer = https.createServer( httpsServerOptions, unifiedServer)

// Start the server , and have it listen on port 3001
httpsServer.listen( config.httpsPort , ()=>{
    console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`)
})


// All server logic of http and https
function unifiedServer(req, res){

     // Get the URL  and parse it
     const parsedUrl = url.parse(req.url, true);


     // Get the path
     const path = parsedUrl.pathname;
 
     const trimmedPath = path.replace(/^\/+|\/+$/g,'');
 
     // Get the HTTP method
     const method = req.method.toLocaleLowerCase();
      
     // Get the query string as an object
     const queryStringObject = parsedUrl.query;
 
     // Get the Headers as an object
     const headers = req.headers;
 
     // Get the payload , If any
     const decoder = new StringDecoder('utf-8');
 
     let buffer = '';
     req.on('data', function(data){
         console.log(data)
         buffer += decoder.write(data)
     })
 
     req.on('end', e=>{
         buffer += decoder.end();
 
         // Choose the route
 
         const chosenHandler = typeof(router[trimmedPath]) !== 'undefined'? router[trimmedPath]: handlers.notFound
         
         //  Construct the data object to send to the handler
         const data = {
             trimmedPath,
             queryStringObject,
             method,
             headers,
             payload: buffer
         }
 
         // Route the request to the handler specified in router
         chosenHandler(data, (statusCode, payload)=>{
 
             // Use the status code called back
             statusCode = typeof(statusCode)== 'number' ? statusCode : 200 ;
 
             // Using the payload
             payload = typeof(payload) == 'object' ? payload : {};
 
             // Convert the payload to a string
             const payloadString = JSON.stringify(payload);
 
             // Return the response
             res.setHeader('Content-Type', 'application/json');
             res.writeHead(statusCode);
             res.end(payloadString);
         })
     })
}




const handlers = {};

handlers.ping = (data, callback)=>{

    // Callback a http status code, and a payload object
    callback(200)
}

// Not found handler
handlers.notFound = (data, callback)=>{
    callback(404);
}

const router = {
    ping: handlers.ping
}