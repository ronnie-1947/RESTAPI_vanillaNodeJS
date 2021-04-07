/*
* Request Handlers
*/

const _data = require('./data');
const helpers = require('./helpers');
const config = require('../config');


const handlers = {};

handlers.users = (data, callback) => {

    const acceptTableMethods = ['post', 'get', 'put', 'delete']
    if (acceptTableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback)
    } else {
        callback(405);
    }
}

// Container for the users submethods
handlers._users = {};


/*
*  HTML Handlers
*/

// Index handler

handlers.index = (data, callback)=>{

    // Reject any request that isn't GET
    if(data.method != 'get'){
        callback(405, null, 'html')
        return
    }

    // Prepare data for interpolation
    const templateData = {
        'head.title': 'This is the title',
        'head.description': 'This is the meta description',
        
    }

    // Read in a template as a string
    helpers.getTemplate('index', (err, str)=>{
        if(err || !str){
            callback(500, null, 'html')
            return
        }
        callback(200, str, 'html')
    })
}



/*
* *** JSON API handlers
*/

// users post
handlers._users.post = (data, callback) => {

    // Check that all required fields are filled out
    const firstName = typeof (data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof (data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    const tosAgreement = typeof (data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (!firstName || !lastName || !phone || !tosAgreement) {
        callback(400, { Error: 'Missing required fields' })
        return
    }

    // Make sure that the user doesn't exist
    _data.read('users', phone, (err) => {
        if (!err) {
            // User already exist
            callback(400, { Error: 'User already exist' })
            return
        }

        // Hash the password
        const hashedPassword = helpers.hash(password);

        // Create the user object
        if (!hashedPassword) {
            callback(500, { Error: 'Failed to create hashed password' })
            return
        }

        const userObject = {
            firstName, lastName, phone, hashedPassword, tosAgreement: true
        }

        // Store the user
        _data.create('users', phone, userObject, (err) => {
            if (err) {
                callback(500, { Error: 'Could not create new user' })
                return
            }
            callback(200)
        })
    })
};

// users get
handlers._users.get = (data, callback) => {

    // Check that the phone number is valid
    const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (!phone) {
        callback(400, { Error: 'Missing required field' });
        return;
    }

    // Get the token in headers
    const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
    
    // Verify the token validation
    handlers._tokens.verifyToken(token, phone, (validity) => {
        if (!validity) {
            callback(403, { Error: 'You are not authorized' })
            return
        }

        _data.read('users', phone, (err, data) => {
            if (err || !data) {
                callback(404, { Error: 'User not found' })
                return
            }

            // Remove hashed password
            delete data.hashedPassword;

            callback(200, data)
        })
    })
};

// users put
handlers._users.put = (data, callback) => {

    // Check that the phone number is valid
    const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

    // Check for the optional fields
    const firstName = typeof (data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof (data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    // Error if the phone is invalid in all cases
    if (!phone) {
        callback(400, { Error: 'Missing phone number' });
        return;
    }

    // Get the token in headers
    const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

    // Verify the token validation
    handlers._tokens.verifyToken(token, phone, (validity) => {

        if (!validity) {
            callback(403, { Error: 'You are not authorized' })
            return
        }

        // Error if nothing is sent to update
        if (firstName || lastName || password) {

            // Lookup User
            _data.read('users', phone, (err, userData) => {
                if (err || !userData) {
                    callback(400, { Error: 'User not exist' })
                    return
                }

                firstName ? userData.firstName = firstName : '';
                lastName ? userData.lastName = lastName : '';
                password ? userData.hashedPassword = helpers.hash(password) : '';

                // Store the new updates
                _data.update('users', phone, userData, err => {

                    if (err) {
                        callback(500, { Error: 'Could not update the user' })
                        return
                    }
                    callback(200)
                })
            })
        } else {
            callback(400, { Error: 'Missing Fields to update' })
            return
        }
    })
};

// users delete
handlers._users.delete = (data, callback) => {

    // Check that phone number is valid
    // Check that the phone number is valid
    const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (!phone) {
        callback(400, { Error: 'Missing required field' });
        return;
    }

    // Get the token in headers
    const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

    _data.read('users', phone, (err, userData) => {

        if (err || !userData) {
            callback(500, { Error: 'Could not find user with the phone' })
            return
        }

        const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

        // Verify the token validation
        handlers._tokens.verifyToken(token, phone, (validity) => {

            if (!validity) {
                callback(403, { Error: 'You are not authorized' })
                return
            }
            _data.delete('users', phone, err => {
                if (err) {
                    callback(500, { Error: 'Error in deleting user' })
                    return
                }

                // Delete each checks associated with the user
                userChecks.forEach(c=>{
                    _data.delete('checks', c, err=>{
                        if(err){
                            console.log(err)
                        }
                    })
                })
                callback(200)
            })
        })
    })
};


//////////////////////////////////////////////////////////////////////
// TOKENS----

handlers.tokens = (data, callback) => {

    const acceptTableMethods = ['post', 'get', 'put', 'delete']
    if (acceptTableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};


// Create Container for all tokens method
handlers._tokens = {};


// Tokens - POST
handlers._tokens.post = (data, callback) => {

    // Get the required fields
    const phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof (data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (!phone || !password) {
        callback(400, { Error: 'missing required fields' })
        return
    }


    // Lookup the user who matches the phone number
    _data.read('users', phone, (err, userData) => {

        if (err || !userData) {
            callback(400, { Error: 'could not find the specified user' })
            return
        }

        // Hash the sent password and compare 
        const hashedPassword = helpers.hash(password);
        // Checking password
        if (hashedPassword != userData.hashedPassword) {
            callback(400, { Error: 'Wrong password' })
            return;
        };

        const tokenId = helpers.createRandomString(20)

        const expires = Date.now() + 1000 * 60 * 60;
        const tokenObject = {
            phone,
            expires,
            id: tokenId
        };

        // Store the token
        _data.create('tokens', tokenId, tokenObject, err => {
            if (err) {
                callback(500, { Error: 'Could not create token' })
            }
            callback(200, tokenObject)
        })
    })
}



// Tokens - GET
handlers._tokens.get = (data, callback) => {

    // Check that the id is valid
    const id = typeof (data.queryStringObject.id) == 'string' ? data.queryStringObject.id.trim() : false;
    if (!id) {
        callback(400, { Error: 'Missing required field' });
        return;
    }
    _data.read('tokens', id, (err, tokenData) => {
        if (err || !tokenData) {
            callback(404, { Error: 'tokenData not found' })
            return
        }

        callback(200, tokenData)
    })
}


// Tokens - PUT
handlers._tokens.put = (data, callback) => {

    // Get id from payload
    const id = typeof (data.payload.id) == 'string' ? data.payload.id.trim() : false;
    const extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

    if (!id || !extend) {
        callback(400, { Error: 'invalid required fields' })
        return
    }

    // Lookup the token
    _data.read('tokens', id, (err, tokenData) => {

        if (err || !tokenData) {
            callback(400, { Error: 'No such token exists' })
            return
        }

        // Check if the token is already expired
        if (tokenData.expires < Date.now()) {
            callback(400, { Error: 'Your session expired' })
            return
        }

        // Set the expiration an hour from now
        tokenData.expires = Date.now() + 1000 * 60 * 60;

        // Store the new update
        _data.update('tokens', id, tokenData, err => {
            if (err) {
                callback(500, { Error: 'Could not update the token expiration' })
                return
            }
            callback(200)
        })
    })

}
// Tokens - DELETE
handlers._tokens.delete = (data, callback) => {

    const id = typeof (data.queryStringObject.id) == 'string' ? data.queryStringObject.id.trim() : false;
    if (!id) {
        callback(400, { Error: 'Missing required field' });
        return;
    }
    _data.delete('tokens', id, err => {
        if (err) {
            callback(500, { Error: 'Error in deleting token' })
            return
        }
        callback(200)
    })
}


// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
    // Lookup the token
    _data.read('tokens', id, (err, tokenData) => {

        if (err || !tokenData) {
            callback(false)
            return
        };

        // Token check
        if (tokenData.phone == phone && tokenData.expires > Date.now()) {
            callback(true)
        } else {
            if (tokenData.expires < Date.now()) {
                console.log(`New time is ${Date.now() + (1000 * 60 * 60)}`)
                console.log('Token expired')
            }
            callback(false)
        }
    })
}


handlers.checks = (data, callback) => {

    const acceptTableMethods = ['post', 'get', 'put', 'delete']
    if (acceptTableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback)
    } else {
        callback(405);
    }
}


// Container for all the checks methods
handlers._checks = {}

handlers._checks.post = (data, callback) => {
    
    // Validate inputs
    const protocol = typeof (data.payload.protocol) === 'string' && ['http', 'https'].includes(data.payload.protocol) ? data.payload.protocol.trim() : false;
    const url = typeof (data.payload.url) === 'string' && data.payload.url.length > 0 ? data.payload.url.trim() : false;
    const method = typeof (data.payload.method) === 'string' && ['get', 'post', 'put', 'delete'].includes(data.payload.method) ? data.payload.method.trim() : false;
    const successCodes = typeof (data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds = typeof (data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (!protocol || !url || !method || !successCodes || !timeoutSeconds) {
        // console.log(data)
        
        callback(400, { Error: 'Inputs are invalid' })
        return;
    }

    // Get the token in headers
    const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

    // Lookup the user by reading the token
    _data.read('tokens', token, (err, tokenData) => {
        if (err || !tokenData) {
            callback(403, { Error: 'You are not authorized' })
            return
        }

        const userPhone = tokenData.phone;

        _data.read('users', userPhone, (err, userData) => {

            if (err || !userData) {
                callback(403, { Error: 'You are not authorized' })
                return
            }

            const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

            // verify that the user has max checks per user
            if (userChecks.length >= config.maxChecks) {
                callback(400, { Error: 'The user already has max number of checks' })
                return
            }

            // Create a random Id for the check
            const checkId = helpers.createRandomString(10);

            // Create the check and user's phone
            const checkObject = {
                id: checkId,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds
            };

            // Save the object
            _data.create('checks', checkId, checkObject, err => {
                if (err) {
                    callback(500, { Error: 'Could not create new check' })
                    return
                }

                // Add the check id to the user's object
                userData.checks = userChecks;
                userData.checks.push(checkId)

                // Save the new user data
                _data.update('users', userPhone, userData, err => {
                    if (err) {
                        callback(500, { Error: 'Could not update the user with new check' })
                        return
                    }

                    callback(200, checkObject)
                })
            })
        })
    })
}

handlers._checks.get = (data, callback) => {

    // Check that the id number is valid
    const id = typeof (data.queryStringObject.id) == 'string' ? data.queryStringObject.id.trim() : false;
    if (!id) {
        callback(400, { Error: 'Missing required field' });
        return;
    }

    // Lookup the check
    _data.read('checks', id, (err, checkData) => {


        if (err || !checkData) {
            callback(404, { Error: 'Check data not found' })
            return
        }

        // Get the token in headers
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        // Verify the token validation
        handlers._tokens.verifyToken(token, checkData.userPhone, (validity) => {

            if (!validity) {
                callback(403, { Error: 'You are not authorized' })
                return
            }

            // Return the checkData 
            callback(200, checkData)
        })
    })
}

handlers._checks.put = (data, callback) => {

    // Check that the phone number is valid
    const id = typeof (data.payload.id) == 'string' ? data.payload.id.trim() : false;

    // Check for the optional fields
    const protocol = typeof (data.payload.protocol) === 'string' && ['http', 'https'].includes(data.payload.protocol) ? data.payload.protocol.trim() : false;
    const url = typeof (data.payload.url) === 'string' && data.payload.url.length > 0 ? data.payload.url.trim() : false;
    const method = typeof (data.payload.method) === 'string' && ['get', 'post', 'put', 'delete'].includes(data.payload.method) ? data.payload.method.trim() : false;
    const successCodes = typeof (data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds = typeof (data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (!id) {
        callback(400, { Error: 'Missing required field' })
        return
    }

    if (protocol || url || method || successCodes || timeoutSeconds) {

        // Lookup the check
        _data.read('checks', id, (err, checkData) => {

            if (err || !checkData) {
                callback(400, { Error: 'Check ID did not exist' })
                return
            }

            // Get the token in headers
            const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

            // Verify the token validation
            handlers._tokens.verifyToken(token, checkData.userPhone, (validity) => {

                if (!validity) {
                    callback(403, { Error: 'You are not authorized' })
                    return
                }

                // Update the check where necessary
                protocol ? checkData.protocol = protocol : '';
                url ? checkData.url = url : '';
                method ? checkData.method = method : '';
                successCodes ? checkData.successCodes = successCodes : '';
                timeoutSeconds ? checkData.timeoutSeconds = timeoutSeconds : '';

                // Store the new updated
                _data.update('checks', id, checkData, err => {
                    if (err) {
                        callback(500, { Error: 'could not update the check' })
                    }

                    callback(200, { Success: 'Successfully updated' })
                })
            })
        })

    } else {
        callback(400, { Error: 'Missing required fields to update' })
        return
    }
}



handlers._checks.delete = (data, callback) => {

    // Check that phone number is valid
    const id = typeof (data.queryStringObject.id) == 'string' ? data.queryStringObject.id.trim() : false;
    if (!id) {
        callback(400, { Error: 'Missing required field' });
        return;
    }

    _data.read('checks', id, (err, checkData) => {

        if (err || !checkData) {
            callback(400, { Error: 'Specified checkId doesnot exist' })
            return
        }

        // Get the token in headers
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        // Verify the token validation
        handlers._tokens.verifyToken(token, checkData.userPhone, (validity) => {

            if (!validity) {
                callback(403, { Error: 'You are not authorized' })
                return
            }
            _data.delete('checks', id, err => {
                if (err) {
                    callback(500, { Error: 'Error in deleting check' })
                    return
                }

                _data.read('users', checkData.userPhone, (err, userData) => {

                    if (err || !userData) {
                        callback(500, { Error: 'Could not find user who created the check' })
                        return
                    }

                    const userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];


                    // Remove the deleted check
                    const checkPosition = userChecks.indexOf(id);

                    if (checkPosition < 0) {
                        callback(500, { Error: 'Could not find the check on user\'s object' })
                        return
                    }

                    userChecks.splice(checkPosition, 1);

                    // Resave the users data
                    _data.update('users', checkData.userPhone, userData, err => {

                        if (err) {
                            callback(500, 'Couldnot update user')
                            return
                        }

                        callback(200, { Success: 'Successfully deleted check' })
                    })
                })
            })
        })
    })
}




handlers.ping = (data, callback) => {

    // Callback a http status code, and a payload object
    callback(200)
}

// Not found handler
handlers.notFound = (data, callback) => {
    callback(404);
}


// Export handlers
module.exports = handlers;