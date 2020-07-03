
# Headless Blender Renderer

A UI/Server for a headless blender setup, with CPU &amp; GPU monitoring, and more

Note: Statistics only support NVIDIA gpus at this time. No support for AMD or type of card.
(If you know a way to get statistics for amd similar to nvidia-smi, notify me)

This project is split into two parts: UI, and the Server.
The server runs independently of the UI, and exposes public HTTP routes that you could hook up any client to to check or render.
The UI uses the same routes, but also socket.io for any realtime data (current frame #, logs, statistics). Eventually the UI will support multiple server connections at once, but at the moment only supports one.

# Server Setup

The server setup is a bit messy, but on start the server should generate the necessary folders if you do a full clone of this repository.
There are four essential folders: 
* zips - Where the finished renders will be put
* blends - All the *.blends, and any subfolders they may need.
* python_scripts - Any python scripts to be run, including core scripts
* tmp - This doesn't have to be a subdirectory, but for permission and ease of access it is located as a subdirector by default

* logs - Will be generated from the render scripts, is not autocreated/essential

In the repository there is a folder called scripts, which houses 3 bash scripts: render.sh, renderCPU.sh, renderGPU.sh.
The render.sh handles the setup of the render and the processing when it is complete. The other two simply just run it in its respective mode (CPU, GPU).

### Server Environmental Variables

Required:

```env
HOME_DIR - Location of home directory (where zips, blends, and temp would be)
```

Optional:

```env
WEB_PORT - Port of webserver
STAT_UPDATE_INTERVAL_SECONDS - Update interval of GPU/CPU stats
ZIPS_DIR - Location where you want to look for zips
BLENDS_DIR - Location where you want to look for blends
```
