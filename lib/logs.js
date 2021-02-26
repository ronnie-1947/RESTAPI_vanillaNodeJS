/*
* Library for storing and rotating logs
*/

// Dependencies

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// container for the module
const lib = {}

// Base directory of the logs folder
lib.baseDir = path.join(__dirname, '..', '.logs/')

// Append a string to a file, Create a file if doesnot exist
lib.append = (file, str, callback)=>{
    
    fs.open(lib.baseDir+file+`.log`, 'a', (err, fileDescriptor)=>{
        
        if(err){
            callback('Could not open file for appending')
            return
        }

        // Append to the file and close it
        fs.appendFile(fileDescriptor, str+'\n', err=>{

            if(err){
                callback('Error appending to file');
                return
            }
            fs.close(fileDescriptor, err=>{
                if(err){
                    callback('Error closing the file that was being appended');
                    return
                }
                callback(false)
            })
        })
    })
}

// List all the logs, and optionally include the compressed logs
lib.list = (includeCompressedLogs, callback)=>{

    fs.readdir(lib.baseDir, (err, data)=>{

        if(err || !data){
            callback(err, data)
            return
        }

        const trimmedFileNames = data.map(fileName=>{

            // Add the .log files
            if(fileName.indexOf('.log')>-1){
                return fileName.replace('.log', '')
            }

            // Add on the .gz files
            if(fileName.indexOf('.gz.b64') < 0 || !includeCompressedLogs){
                return(fileName.replace('.gz.b64', ''))
            }
        })
        callback(false, trimmedFileNames);
    })
}

// Compress the contens of one.log file into a .gz.b64
lib.compress = (logId, newFileId, callback)=>{

    const sourceFile = logId+'.log';
    const destFile =newFileId+'.gz.b64';

    // Read the source file
    fs.readFile(lib.baseDir+sourceFile, 'utf8', (err, inputString)=>{

        if(err || !inputString){
            callback(err)
            return
        }

        // Compress the data using gzip
        zlib.gzip(inputString, (err, buffer)=>{
            if(err || !buffer){
                callback(err)
                return
            }
            fs.open(lib.baseDir+destFile, 'wx', (err, fileDescriptor)=>{

                if(err || !fileDescriptor){
                    callback(err)
                    return
                }

                // Write to the destination file
                fs.writeFile(fileDescriptor, buffer.toString('base64'), err=>{
                    if(err){
                        callback(err)
                        return
                    }
                    fs.close(fileDescriptor, err=>{
                        if(err){
                            callback('Error closing the file that is to be compressed')
                            return
                        }
                        callback(false)
                    })
                })
            })
        })
    })
}

// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = (fileId, callback)=>{

    const fileName = fileId+'.gz.b64';
    fs.readFile(lib.baseDir+fileName, 'utf8', (err, str)=>{
        if(err || !str){
            callback(err)
            return    
        }
        // Decompress the data
        const inputBuffer = Buffer.from(str, 'base64');
        zlib.unzip(inputBuffer, (err, outputBuffer)=>{
            if(err || !outputBuffer){
                callback(err)
                return
            }

            const str = outputBuffer.toString();
            callback(false, str)
        })
    })
}

// Truncate a log file
lib.truncate = (logId, callback)=>{

    fs.truncate(lib.baseDir+logId+'.log', 0, err=>{

        if(err){
            callback(err)
            return
        }
        callback(false)
    })
}


// Export the library
module.exports = lib;