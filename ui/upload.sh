#!/bin/sh
yarn build && scp -r dist/* jackz@192.168.1.19:/var/www/blender.jackz.me