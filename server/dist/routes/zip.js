"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const fs_1 = require("fs");
const adm_zip_1 = __importDefault(require("adm-zip"));
const path_1 = __importDefault(require("path"));
const pretty_ms_1 = __importDefault(require("pretty-ms"));
const Middlewares_1 = require("../modules/Middlewares");
const router = express_1.default.Router();
const ZIP_DIR = process.env.ZIP_DIR || `${process.env.HOME_DIR}/zips`;
const BLENDS_DIR = process.env.BLENDS_DIR || `${process.env.HOME_DIR}/blends`;
const DL_TOKENS = new Map(); //<filename,{token:<expires>}>
router.use(express_fileupload_1.default({
    limits: { fileSize: 500 * 1024 * 1024 },
    abortOnLimit: true,
}));
router.get('/debug', (req, res) => {
    res.json(DL_TOKENS);
});
router.get('/:name/download', (req, res) => {
    if (req.query.token) {
        const downloadTokens = DL_TOKENS.get(req.params.name);
        //@ts-expect-error
        if (downloadTokens && downloadTokens[req.query.token] && downloadTokens[req.query.token] >= Date.now()) {
            res.set('Content-Type', 'application/zip');
            res.set('Content-Disposition', `attachment; filename="${req.params.name}"`);
            const stream = fs_1.createReadStream(`${ZIP_DIR}/${req.params.name}`)
                .on('open', () => {
                stream.pipe(res);
            })
                .on('error', (err) => {
                res.status(500).send(err);
            })
                .on('end', () => {
                res.end();
            });
        }
        else {
            return res.status(403).json({ error: 'No download exists for that zip file or token has expired. Request one with POST /zips/:name/token.', code: 'INVALID_TOKEN' });
        }
    }
    else {
        return res.status(403).json({ error: 'Missing download token query parameter. Request one with POST /zips/:name/token.', code: 'MSSING_TOKEN' });
    }
});
router.post('/:name/token', Middlewares_1.userCheck, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield fs_1.promises.stat(`${ZIP_DIR}/${req.params.name}`);
        const token = generateUID();
        const expires = new Date();
        expires.setDate(expires.getHours() + 4);
        let tokens = DL_TOKENS.has(req.params.name) || {};
        tokens[token] = expires.getTime();
        DL_TOKENS.set(req.params.name, tokens);
        return res.json({ token });
    }
    catch (err) {
        return res.status(404).json({ error: "That zip does not exist." });
    }
}));
router.delete('/:name', Middlewares_1.userCheck, (req, res) => {
    fs_1.promises.unlink(`${ZIP_DIR}/${req.params.name}`)
        .then(() => {
        res.send();
    })
        .catch(err => {
        if (err.code === "ENOENT") {
            return res.status(500).json({ error: "That zip does not exist." });
        }
        return res.status(500).json({ error: err.message });
    });
});
router.get('/', Middlewares_1.userCheck, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const files_raw = yield fs_1.promises.readdir(ZIP_DIR);
        const promises = [];
        files_raw.forEach(file => {
            if (!file.endsWith(".zip"))
                return;
            const promise = new Promise((resolve, reject) => {
                fs_1.promises.stat(`${ZIP_DIR}/${file}`)
                    .then(stat => {
                    resolve({
                        name: file,
                        size: stat.size,
                        date: pretty_ms_1.default(Date.now() - new Date(stat.mtime).getTime(), { secondsDecimalDigits: 0, millisecondsDecimalDigits: 0 }),
                        timestamp: stat.mtime
                    });
                })
                    .catch(err => reject(err));
            });
            promises.push(promise);
        });
        Promise.all(promises)
            .then(files => {
            res.json({ files });
        }).catch((err) => {
            res.status(500).json({ error: err.message });
            console.error('[Error]', err.message);
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ error: true });
    }
}));
router.post('/upload', Middlewares_1.userCheck, (req, res) => {
    //@ts-expect-error
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.file) {
        return res.json({ error: 'No file was uploaded.' });
    }
    try {
        //@ts-expect-error
        const folderName = req.files.file.name.replace('.zip', '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        //@ts-expect-error
        const zip = new adm_zip_1.default(req.files.file.data);
        zip.extractAllTo(path_1.default.join(BLENDS_DIR, folderName), true);
        res.send('Upload successful');
    }
    catch (err) {
        res.status(500).send('Upload failed');
    }
});
exports.default = router;
function generateUID() {
    // I generate the UID from two parts here 
    // to ensure the random number provide enough bits.
    let firstPart = (Math.random() * 46656) | 0;
    let secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
}
setInterval(() => {
    const now = Date.now();
    DL_TOKENS.forEach((tokens, file) => {
        for (const token in tokens) {
            if (now >= tokens[token]) {
                delete tokens[token];
            }
        }
        if (Object.keys(tokens).length == 0) {
            DL_TOKENS.delete(file);
        }
        else {
            DL_TOKENS.set(file, tokens);
        }
    });
}, 1000 * 60 * 30); //run every 30 minutes, clear up any expired tokens
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemlwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvdXRlcy96aXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzREFBNkI7QUFDN0IsNEVBQTJDO0FBQzNDLDJCQUFtRDtBQUNuRCxzREFBNEI7QUFDNUIsZ0RBQXVCO0FBQ3ZCLDBEQUEyQztBQUMzQyx3REFBbUQ7QUFDbkQsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxPQUFPLENBQUE7QUFDckUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsU0FBUyxDQUFBO0FBRTdFLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyw4QkFBOEI7QUFFM0QsTUFBTSxDQUFDLEdBQUcsQ0FBQyw0QkFBVSxDQUFDO0lBQ2xCLE1BQU0sRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBRTtJQUN2QyxZQUFZLEVBQUUsSUFBSTtDQUNyQixDQUFDLENBQUMsQ0FBQztBQUVKLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFDLEdBQUcsRUFBRSxFQUFFO0lBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDdkIsQ0FBQyxDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLENBQUMsR0FBRyxFQUFDLEdBQUcsRUFBRSxFQUFFO0lBQ3RDLElBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUU7UUFDaEIsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDLEdB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