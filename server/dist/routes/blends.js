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
const router = express_1.default.Router();
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const fs_1 = require("fs");
const pretty_ms_1 = __importDefault(require("pretty-ms"));
const path_1 = __importDefault(require("path"));
const Middlewares_1 = require("../modules/Middlewares");
const BLENDS_DIR = process.env.BLENDS_DIR || `${process.env.HOME_DIR}/blends`;
router.use(express_fileupload_1.default({
    limits: { fileSize: 500 * 1024 * 1024 },
    abortOnLimit: true,
}));
router.get('/', Middlewares_1.userCheck, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const entries = yield fs_1.promises.readdir(BLENDS_DIR, { withFileTypes: true });
        const promises = [];
        entries.forEach(dirent => {
            if (dirent.isDirectory()) {
                promises.push(new Promise((resolve, reject) => {
                    fs_1.promises.readdir(path_1.default.join(BLENDS_DIR, dirent.name))
                        .then(folderFiles => {
                        resolve({
                            folder: dirent.name,
                            files: folderFiles
                        });
                    })
                        .catch(err => reject(err));
                }));
            }
            else {
                if (!dirent.name.endsWith(".blend"))
                    return;
                promises.push(new Promise((resolve, reject) => {
                    fs_1.promises.stat(`${BLENDS_DIR}/${dirent.name}`)
                        .then(stat => {
                        resolve({
                            file: dirent.name,
                            size: stat.size,
                            date: pretty_ms_1.default(Date.now() - stat.mtime.getTime(), { secondsDecimalDigits: 0, millisecondsDecimalDigits: 0 }),
                            timestamp: stat.mtime
                        });
                    })
                        .catch(err => reject(err));
                }));
            }
        });
        Promise.all(promises)
            .then(files => {
            const blends = files.filter(v => v.file);
            const folders = files.filter(v => v.folder);
            res.json({ blends, folders });
        }).catch((err) => {
            res.status(500).json({ error: err.message });
            console.error('[Error]', err.message);
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
}));
router.get('/:name', Middlewares_1.userCheck, (req, res) => {
    res.set('Content-Disposition', `attachment; filename="${req.params.name}"`);
    const stream = fs_1.createReadStream(`${BLENDS_DIR}/${req.params.name}`)
        .on('open', () => {
        stream.pipe(res);
    })
        .on('error', (err) => {
        res.status(500).send(err);
    })
        .on('end', () => {
        res.end();
    });
});
router.delete('/:name', Middlewares_1.userCheck, (req, res) => {
    fs_1.promises.unlink(`${BLENDS_DIR}/${req.params.name}`)
        .then(() => {
        res.send();
    })
        .catch(err => {
        if (err.code === "ENOENT") {
            return res.status(500).json({ error: "That file does not exist." });
        }
        return res.status(500).json({ error: err.message });
    });
});
router.post('/upload', Middlewares_1.userCheck, (req, res) => {
    //@ts-expect-error
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.json({ error: 'No files were uploaded.' });
    }
    const promises = [];
    //@ts-expect-error
    Object.values(req.files)
        .forEach((file) => {
        promises.push(new Promise((resolve, reject) => {
            if (!file.name.endsWith(".blend"))
                return resolve({ failed: file.name });
            file.mv(path_1.default.join(BLENDS_DIR, file.name), (err) => {
                if (err) {
                    resolve({ failed: file.name });
                }
                else {
                    resolve({
                        file: file.name,
                        size: file.size
                    });
                }
            });
        }));
    });
    Promise.all(promises)
        .then((data) => {
        const successful = data.filter(v => !v.failed);
        const failures = data.filter(v => v.failed).map(v => v.failed);
        res.json({ uploads: successful, failures });
    })
        .catch(err => {
    });
});
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmxlbmRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvdXRlcy9ibGVuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzREFBb0Q7QUFDcEQsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNoQyw0RUFBMkM7QUFDM0MsMkJBQW1EO0FBQ25ELDBEQUEyQztBQUMzQyxnREFBdUI7QUFDdkIsd0RBQWdEO0FBRWhELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLFNBQVMsQ0FBQTtBQUU3RSxNQUFNLENBQUMsR0FBRyxDQUFDLDRCQUFVLENBQUM7SUFDbEIsTUFBTSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFFO0lBQ3ZDLFlBQVksRUFBRSxJQUFJO0NBQ3JCLENBQUMsQ0FBQyxDQUFDO0FBRUosTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsdUJBQVMsRUFBRSxDQUFNLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUM1RCxJQUFJO1FBQ0EsTUFBTSxPQUFPLEdBQUcsTUFBTSxhQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxFQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNwQixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3JCLElBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFO2dCQUNyQixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFDLE1BQU0sRUFBRSxFQUFFO29CQUN6QyxhQUFFLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLE1BQU0s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WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDUCxDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDO1NBQ3BCLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ1gsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzlDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzlELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDL0MsQ0FBQyxDQUFDO1NBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBRWIsQ0FBQyxDQUFDLENBQUE7QUFDTixDQUFDLENBQUMsQ0FBQTtBQUNGLGtCQUFlLE1BQU0sQ0FBQyJ9