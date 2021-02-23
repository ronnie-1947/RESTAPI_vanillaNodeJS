const crypto = require('crypto')

const x = crypto.randomBytes(20)

console.log(x.toString('hex'))