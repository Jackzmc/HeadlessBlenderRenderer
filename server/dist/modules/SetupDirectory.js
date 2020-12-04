"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const FOLDER_BLENDS = path_1.default.join(process.env.HOME_DIR, "blends");
const FOLDER_ZIPS = path_1.default.join(process.env.HOME_DIR, "zips");
const FOLDER_PYSCRIPTS = path_1.default.join(process.env.HOME_DIR, "python_scripts");
const FOLDER_SCRIPTS = path_1.default.join(__dirname, "/../../../scripts");
if (!fs_1.default.existsSync(process.env.HOME_DIR)) {
    console.error(`'HOME_DIR' path (${process.env.HOME_DIR}) does not exist on disk. Exiting...`);
    process.exit(1);
}
try {
    fs_1.default.mkdirSync(FOLDER_BLENDS, { recursive: true });
    fs_1.default.mkdirSync(FOLDER_ZIPS);
    fs_1.default.mkdirSync(FOLDER_PYSCRIPTS);
    if (!process.env.TMP_DIR) {
        const FOLDER_TMP = path_1.default.join(process.env.HOME_DIR, "tmp");
        fs_1.default.mkdirSync(FOLDER_TMP);
    }
    else {
        if (!fs_1.default.existsSync(process.env.TMP_DIR)) {
            console.error('\'TMP_DIR\' path does not exist. Exiting...');
            process.exit(1);
        }
    }
    fs_1.default.stat(path_1.default.join(process.env.HOME_DIR, "render.sh"), (err, stat) => {
        if (!stat) {
            fs_1.default.stat(FOLDER_SCRIPTS, (err, exists) => {
                if (exists) {
                    fs_1.default.readdir(FOLDER_SCRIPTS, (err, files) => {
                        if (err)
                            return console.error('ERROR: Failed to setup HOME_DIR, could not read scripts folder. Does it exist?');
                        files.forEach(file => {
                            fs_1.default.rename(path_1.default.join(FOLDER_SCRIPTS, file), path_1.default.join(process.env.HOME_DIR, file), null);
                        });
                    });
                }
                else {
                    console.warn('WARNING: Scripts folder is missing, scripts may not exist');
                }
            });
        }
    });
}
catch (err) {
    //ignore errors
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2V0dXBEaXJlY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kdWxlcy9TZXR1cERpcmVjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLDRDQUFtQjtBQUNuQixnREFBdUI7QUFFdkIsTUFBTSxhQUFhLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtBQUMvRCxNQUFNLFdBQVcsR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0FBQzNELE1BQU0sZ0JBQWdCLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0FBQzFFLE1BQU0sY0FBYyxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLG1CQUFtQixDQUFDLENBQUM7QUFDakUsSUFBRyxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtJQUNyQyxPQUFPLENBQUMsS0FBSyxDQUFDLG9CQUFvQixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsc0NBQXNDLENBQUMsQ0FBQTtJQUM3RixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0NBQ2xCO0FBRUQsSUFBSTtJQUNBLFlBQUUsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDaEQsWUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUN6QixZQUFFLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFFOUIsSUFBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFO1FBQ3JCLE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDekQsWUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtLQUMzQjtTQUFJO1FBQ0QsSUFBRyxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNwQyxPQUFPLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxDQUFDLENBQUE7WUFDNUQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUNsQjtLQUNKO0lBQ0QsWUFBRSxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFDLElBQUksRUFBRSxFQUFFO1FBQy9ELElBQUcsQ0FBQyxJQUFJLEVBQUU7WUFDTixZQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLEdBQUcsRUFBQyxNQUFNLEVBQUUsRUFBRTtnQkFDbkMsSUFBRyxNQUFNLEVBQUU7b0JBQ1AsWUFBRSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUU7d0JBQ3RDLElBQUcsR0FBRzs0QkFBRSxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0ZBQWdGLENBQUMsQ0FBQTt3QkFDOUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTs0QkFDakIsWUFBRSxDQUFDLE1BQU0sQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBQyxJQUFJLENBQUMsRUFBRSxjQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO3dCQUMxRixDQUFDLENBQUMsQ0FBQTtvQkFDTixDQUFDLENBQUMsQ0FBQTtpQkFDTDtxQkFBSTtvQkFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLDJEQUEyRCxDQUFDLENBQUE7aUJBQzVFO1lBQ0wsQ0FBQyxDQUFDLENBQUE7U0FDTDtJQUNMLENBQUMsQ0FBQyxDQUFBO0NBRUw7QUFBQSxPQUFNLEdBQUcsRUFBRTtJQUNSLGVBQWU7Q0FDbEIifQ==