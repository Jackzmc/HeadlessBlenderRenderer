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
const Middlewares_1 = require("../modules/Middlewares");
const router = express_1.default.Router();
const fs_1 = require("fs");
const { readdir } = fs_1.promises;
let renderController;
router.post(['/cancel', '/abort'], Middlewares_1.userCheck, (req, res) => {
    renderController.cancelRender()
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ error: err.message }));
});
router.get('/logs', Middlewares_1.restrictedCheck, (req, res) => {
    res.json(renderController.getLogs());
});
router.get('/status', (req, res) => {
    res.json(renderController.getSettings());
});
router.post('/:blend', Middlewares_1.userCheck, (req, res) => {
    if (!req.params.blend)
        return res.status(400).json({ error: 'Missing blend property' });
    if (!req.params.blend.endsWith(".blend"))
        return res.status(400).json({ error: 'Specified file is not a valid *.blend file.' });
    const frames = (req.body.frames && Array.isArray(req.body.frames)) ? req.body.frames : null;
    if (frames && req.body.frames.length !== 2)
        return res.status(400).json({ error: 'Frames property needs to be an array of two numbers: [start, end]' });
    const options = {
        useGPU: req.body.useGPU === true || req.body.useGPU === "true" || req.body.mode === 'gpu',
        frames,
        python_scripts: req.body.python_scripts || []
    };
    renderController.startRender(req.params.blend, options)
        .then((response) => {
        res.json(response);
    })
        .catch(err => {
        res.status(500).json({ error: err.message });
    });
});
router.get('/preview', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (renderController.isRenderActive()) {
        try {
            const files = yield readdir(process.env.HOME_DIR + "/tmp");
            if (files.length > 0) {
                const lastFile = files[files.length - 1];
                res.set('Content-Type', 'application/png');
                res.set('Content-Disposition', `attachment; filename="preview.png"`);
                const stream = fs_1.createReadStream(`${process.env.HOME_DIR}/tmp/${lastFile}`)
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
                res.json({ error: 'No frames have been rendered', code: 'RaENDER_NO_FRAMES' });
            }
        }
        catch (err) {
            console.log('[render/preview]', err);
            res.json({ error: 'No frames have been rendered', code: 'RENDER_NO_FRAMES' });
        }
    }
    else {
        return res.json({ error: 'No render is currently running.', code: 'RENDER_INACTIVE' });
    }
}));
function default_1(_controller) {
    renderController = _controller;
    return router;
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvdXRlcy9yZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzREFBb0Q7QUFDcEQsd0RBQW9FO0FBQ3BFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUE7QUFDL0IsMkJBQWdEO0FBRWhELE1BQU0sRUFBQyxPQUFPLEVBQUMsR0FBRyxhQUFRLENBQUM7QUFFM0IsSUFBSSxnQkFBa0MsQ0FBQztBQUN2QyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFDLFFBQVEsQ0FBQyxFQUFFLHVCQUFTLEVBQUUsQ0FBQyxHQUFZLEVBQUMsR0FBYSxFQUFFLEVBQUU7SUFDeEUsZ0JBQWdCLENBQUMsWUFBWSxFQUFFO1NBQzlCLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7U0FDckMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsQ0FBQTtBQUM3RCxDQUFDLENBQUMsQ0FBQTtBQUNGLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLDZCQUFlLEVBQUUsQ0FBQyxHQUFHLEVBQUMsR0FBRyxFQUFFLEVBQUU7SUFDN0MsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0FBQ3hDLENBQUMsQ0FBQyxDQUFBO0FBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUMsR0FBRyxFQUFFLEVBQUU7SUFDOUIsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFX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