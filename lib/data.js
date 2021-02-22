/*
* Library for Storing and Editing File
*/

// Dependencies

const fs = require('fs');
const path = require('path');

//  Container for the module (to be exported)
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '..', '.data')

// Write data to a file
lib.create = function(dir, file, data, callback){

    // Open the file for writing
    fs.open(lib.baseDir + '/'+ dir + '/' + file + '.json', 'wx', (err, fileDescriptor)=>{
        if(err){
            // console.log(err)
            callback('Could not create new file, it may already exist')
        }
        
        // Convert data to string
        const stringData = JSON.stringify(data);

        // Write to file and close it
        fs.writeFile(fileDescriptor, stringData, (err)=>{
            if(err){
                callback('Error writing to new File')
            }

            fs.close(fileDescriptor, err=>{ 
                if(err){
                    callback('Error closing new file')
                }
                callback(false)
            })
        })
    })
};


// Read Data from a file
lib.read = (dir, file, callback)=>{
    fs.readFile(`${lib.baseDir}/${dir}/${file}.json`, 'utf8', (err,data)=>{
        callback(err, data)
    })
}

// update existing file
lib.update = (dir, file, data, callback)=>{

    // Open the file for writing
    fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'r+', (err, fileDescriptor)=>{
        if(err){
            callback('Could not open the file for updating. May not existing yet')
        }

        // Convert data to string
        const stringData = JSON.stringify(data);

        // Write to file and close it
        fs.ftruncate(fileDescriptor, (err)=>{ 
            if(err){
                callback('Error truncating file')
            }

            fs.writeFile(fileDescriptor, stringData, (err)=>{
                if(err){
                    callback('Error in writing in existing fle')
                }
                fs.close(fileDescriptor, err=>{
                    if(err){
                        callback('Error in closing the file')
                    }
                    callback(false)
                })

            })
        })
    })
}

lib.delete = (dir, file, callback)=>{

    // unlink the file

    fs.unlink(`${lib.baseDir}/${dir}/${file}.json`, (err)=>{
        if(err){
            callback('Error in deleting file')
        }
        callback(false)
    })
}

module.exports = lib