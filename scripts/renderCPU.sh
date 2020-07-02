#!/bin/bash
. "./render.sh"
trap _term SIGTERM
#category: setup arguments
main_setup "$@"

echo "Running CPU Blend for $blend_file ($(blender -b --version))" | tee logs/blender.log
# run blender
blender -b "$blend_file" -noaudio --render-output "/home/ezra/tmp/" -P python_scripts/settings.py -P -y ${framearg} | tee -a logs/blender.log > >(tee logs/blender.log) 2> >(tee logs/blender_errors.log >&2) &

PID=$!
echo "PID: $PID"
wait $PID

#category: clean up & archive	
checkTmp
createZip


