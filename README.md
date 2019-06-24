
# HeadlessBlenderWebUI

A UI for a headless blender setup, with CPU &amp; GPU monitoring, and more

Note: Statistics only support NVIDIA gpus at this time. No support for AMD or Intel Integrated (but why?)
But if you know a way to get AMD information (like nvidia's 'nvidia-smi' command, tell me!)

## Environmental Variables

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
