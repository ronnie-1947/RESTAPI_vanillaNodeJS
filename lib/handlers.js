/*
* Request Handlers
*/

const _data = require('./data');
const helpers = require('./helpers');



const handlers = {};

handlers.users= (data, callback)=>{

    const acceptTableMethods = ['post', 'get', 'put', 'delete']
    if(acceptTableMethods.indexOf(data.method)>-1){
        handlers._users[data.method](data, callback)
    }else{
        callback(405);
    }
}

// Container for the users submethods
handlers._users = {};

// users post
handlers._users.post = (data, callback)=>{
    
    // Check that all required fields are filled out
    const firstName = typeof(data.payload.firstName)==='string' && data.payload.firstName.trim().length > 0 ?data.payload.firstName.trim():false;
    const lastName = typeof(data.payload.lastName)==='string' && data.payload.lastName.trim().length > 0 ?data.payload.lastName.trim():false;
    const phone = typeof(data.payload.phone)==='string' && data.payload.phone.trim().length == 10 ?data.payload.phone.trim():false;
    const password = typeof(data.payload.password)==='string' && data.payload.password.trim().length > 0 ?data.payload.password.trim():false;
    const tosAgreement = typeof(data.payload.tosAgreement)==='boolean' && data.payload.tosAgreement== true?true:false;

    if(!firstName || !lastName || !phone || !tosAgreement){
        callback(400, {Error: 'Missing required fields'})
        return
    }

    // Make sure that the user doesn't exist
    _data.read('users', phone, (err)=>{
        if(!err){
            // User already exist
            callback(400, {Error: 'User already exist'})
            return
        }

        // Hash the password
        const hashedPassword = helpers.hash(password);
        
        // Create the user object
        if(!hashedPassword){
            callback(500, {Error: 'Failed to create hashed password'})
            return
        }

        const userObject = {
            firstName, lastName, phone, hashedPassword, tosAgreement: true
        }

        // Store the user
        _data.create('users', phone, userObject, (err)=>{
            if(err){
                callback(500, {Error: 'Could not create new user'})
                return
            }
            callback(200)
        })
    })
};

// users get
handlers._users.get = (data, callback)=>{
    
    // Check that the phone number is valid
    const phone = typeof(data.queryStringObject.phone)=='string' && data.queryStringObject.phone.trim().length == 10 ?data.queryStringObject.phone.trim():false;
    if(!phone){
        callback(400, {Error: 'Missing required field'});
        return;
    }
    _data.read('users', phone, (err, data)=>{
        if(err){
            callback(404, {Error: 'User not found'})
            return
        }
        
        // Remove hashed password
        delete data.hashedPassword;
        
        callback(200, data)
    })
};

// users put
handlers._users.put = (data, callback)=>{

    // Check that the phone number is valid
    const phone = typeof(data.payload.phone)=='string' && data.payload.phone.trim().length == 10 ?data.payload.phone.trim():false;

    // Check for the optional fields
    const firstName = typeof(data.payload.firstName)==='string' && data.payload.firstName.trim().length > 0 ?data.payload.firstName.trim():false;
    const lastName = typeof(data.payload.lastName)==='string' && data.payload.lastName.trim().length > 0 ?data.payload.lastName.trim():false;
    const password = typeof(data.payload.password)==='string' && data.payload.password.trim().length > 0 ?data.payload.password.trim():false;

    // Error if the phone is invalid in all cases
    if(!phone){
        callback(400, {Error: 'Missing phone number'});
        return;
    }

    // Error if nothing is sent to update
    if(firstName || lastName || password){

        // Lookup User
        _data.read('users', phone , (err, userData)=>{
            if(err){
                callback(400, {Error: 'User not exist'})
                return
            }

            firstName?userData.firstName=firstName:'';
            lastName?userData.lastName=lastName:'';
            password?userData.hashedPassword= helpers.hash(password):'';

            // Store the new updates
            _data.update('users', phone, userData, err=>{

                if(err){
                    callback(500, {Error: 'Could not update the user'})
                    return
                }
                callback(200)
            })
        })
    }else{
        callback(400, {Error: 'Missing Fields to update'})
        return
    }
};

// users delete
handlers._users.delete = (data, callback)=>{

    // Check that phone number is valid
    // Check that the phone number is valid
    const phone = typeof(data.queryStringObject.phone)=='string' && data.queryStringObject.phone.trim().length == 10 ?data.queryStringObject.phone.trim():false;
    if(!phone){
        callback(400, {Error: 'Missing required field'});
        return;
    }
    _data.delete('users', phone, err=>{
        if(err){
            callback(500, {Error: 'Error in deleting user'})
            return
        }
        callback(200)
    })
};


handlers.ping = (data, callback)=>{

    // Callback a http status code, and a payload object
    callback(200)
}

// Not found handler
handlers.notFound = (data, callback)=>{
    callback(404);
}


// Export handlers
module.exports = handlers;