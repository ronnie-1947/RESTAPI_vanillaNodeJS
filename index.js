/*
* Primary file for the API
*
*/

// Dependencies
const http = require('http');
const url = require('url');
const {StringDecoder} = require('string_decoder');

//  The server should respond to all request with a string
const server = http.createServer((req, res)=>{

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
        buffer += decoder.write(data)
    })

    req.on('end', e=>{
        buffer += decoder.end();
        res.end('Hello world\n');
        // 
        console.log('buffer is here ' + buffer)
    })

    // Send the response

    // Log the request path
    // console.log(`Request received on path: ${trimmedPPath} with this method: ${method} with the respective queryParams`, queryStringObject)
})


// Start the server , and have it listen on port 3000
server.listen(3000, ()=>{
    console.log('The server is listening on port 3000')
})