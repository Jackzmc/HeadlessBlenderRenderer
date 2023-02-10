import fs from 'fs'
import path from 'path'

const FOLDER_BLENDS = path.join(process.env.HOME_DIR, "blends")
const FOLDER_ZIPS = path.join(process.env.HOME_DIR, "zips")
const FOLDER_PYSCRIPTS = path.join(process.env.HOME_DIR, "python_scripts")
const FOLDER_LOGS = path.join(process.env.HOME_DIR, "logs")
const FOLDER_TMP = path.join(process.env.HOME_DIR, "tmp")
const FOLDER_SCRIPTS = path.join(__dirname, "/../../../scripts");
if(!fs.existsSync(process.env.HOME_DIR)) {
    console.error(`'HOME_DIR' path (${process.env.HOME_DIR}) does not exist on disk. Exiting...`)
    process.exit(1)
}

mkdir(FOLDER_BLENDS, { recursive: true })
mkdir(FOLDER_ZIPS)
mkdir(FOLDER_LOGS)
mkdir(FOLDER_PYSCRIPTS)

if(!process.env.TMP_DIR) {
    mkdir(FOLDER_TMP)
} else {
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
                        fs.rename(path.join(FOLDER_SCRIPTS,file), path.join(process.env.HOME_DIR, file), () => {})
                    })
                })
            }else{
                console.warn('WARNING: Scripts folder is missing, scripts may not exist')
            }
        })
    }
})


function mkdir(path: fs.PathLike, opts?: any) {
    try {
        fs.mkdirSync(path, opts)
    } catch(err) {
        if(err.code != "EEXIST") throw err
    }
}