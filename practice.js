const http = require('http');
const url = require('url');

const server = http.createServer((req, res)=>{
    
    const parsedUrl = url.parse('/localTribe?abc=1212')
    console.log(parsedUrl)
    // console.log(parsedUrl.path)
    // console.log(parsedUrl.query)
    // console.log(req.headers)

    res.end('Hello Wrold\n')
})

server.listen(3000, ()=>{
    console.log('server have started')
})