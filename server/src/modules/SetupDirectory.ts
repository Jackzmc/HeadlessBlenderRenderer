import fs from 'fs'
import path from 'path'

const FOLDER_BLENDS = path.join(process.env.HOME_DIR, "blends")
const FOLDER_ZIPS = path.join(process.env.HOME_DIR, "zips")
const FOLDER_PYSCRIPTS = path.join(process.env.HOME_DIR, "python_scripts")
const FOLDER_SCRIPTS = path.join(__dirname, "/../../../scripts");
if(!fs.existsSync(process.env.HOME_DIR)) {
    console.error(`'HOME_DIR' path (${process.env.HOME_DIR}) does not exist on disk. Exiting...`)
    process.exit(1)
}

try {
    fs.mkdirSync(FOLDER_BLENDS, { recursive: true })
    fs.mkdirSync(FOLDER_ZIPS)
    fs.mkdirSync(FOLDER_PYSCRIPTS)

    if(!process.env.TMP_DIR) {
        const FOLDER_TMP = path.join(process.env.HOME_DIR, "tmp")
        fs.mkdirSync(FOLDER_TMP)
    }else{
        if(!fs.existsSync(process.env.TMP_DIR)) {
            console.error('\'TMP_DIR\' path does not exist. Exiting...')
            process.exit(1)
        }
    }
    fs.stat(path.join(process.env.HOME_DIR, "render.sh"), (err,stat) => {
        if(!stat) {
            fs.stat(FOLDER_SCRIPTS, (err,exists) => {
                if(exists) {
                    fs.readdir(FOLDER_SCRIPTS, (err, files) => {
                        if(err) return console.error('ERROR: Failed to setup HOME_DIR, could not read scripts folder. Does it exist?')
                        files.forEach(file => {
                            fs.rename(path.join(FOLDER_SCRIPTS,file), path.join(process.env.HOME_DIR, file), null)
                        })
                    })
                }else{
                    console.warn('WARNING: Scripts folder is missing, scripts may not exist')
                }
            })
        }
    })
    
}catch(err) {
    //ignore errors
}

