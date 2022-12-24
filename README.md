
# Headless Blender Renderer

A UI/Server for a remote blender setup, with CPU &amp; GPU monitoring, and more. Renders can be started and results downloaded all from a web UI or from a REST Api. With a versitile permission system, many users can be created to harness the power of a remote rendering server.
Currently only support linux for the time being for actual rendering. Everything else works (even statistics) on windows but not rendering due to some quirks.

Note: Statistics only support NVIDIA gpus at this time. No support for AMD or type of card.
(If you have an AMD GPU and can help with rocm-smi then contact me)

This project is split into two parts: UI, and the Server.
The server runs independently of the UI, and exposes public HTTP routes that you could hook up any client to to check or render.
The UI uses the API routes, but also a socket.io connection for any realtime data (current frame status, render logs, statistics). 

## Preview
![image](https://user-images.githubusercontent.com/4030546/209415690-53965f04-df2c-4917-a456-0d5d8476dced.png)
(Old development screenshot)

# Server Setup

The server setup is a bit messy, but on start the server should generate the necessary folders if you do a full clone of this repository.
There are four essential folders that will be generated at `HOME_DIR`.
* zips - Where the finished renders will be put
* blends - All the *.blends, and any subfolders they may need.
* python_scripts - Any python scripts to be run, including core scripts
* tmp -Where the blend images will be created during a render
* logs - Will be generated from the render scripts, is not autocreated/essential

In the repository there is a folder called scripts, which houses 3 bash scripts: render.sh, renderCPU.sh, renderGPU.sh.
The render.sh handles the setup of the render and the processing when it is complete. The other two simply just run it in its respective mode (CPU, GPU).

Once created, on the UI (The latest UI is also hosted by https://blender.jackz.me!) add your server domain (For example, localhost:8095. You don't need to add /api path, your entered domain is suffixed with /api/...path internally). Then simply click login.

The default admin's username and password is just `admin` (Change this when you login: top right -> settings). The default user can not be deleted or have its details changed by the admin panel.

### Server Environmental Variables

Required:

```env
HOME_DIR - Location of home directory (where zips, blends, and temp would be)
JWT_TOKEN - A secret to generate JWT authentication tokens from
```

Optional:

```env
WEB_PORT - Port of webserver
STAT_UPDATE_INTERVAL_SECONDS - Update interval of GPU/CPU stats
ZIPS_DIR - Location where you want to look for zips
BLENDS_DIR - Location where you want to look for blends
```
