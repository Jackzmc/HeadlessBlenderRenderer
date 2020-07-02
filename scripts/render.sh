#!/bin/bash
#category: setup arguments
_term() { 
  echo "Caught SIGTERM signal!" 
  kill -TERM "$PID" 2>/dev/null
}
main_setup() {
    if [ $# -eq 0 ]; then
        echo "Please specify a .blend file"
        exit
    fi
    #category:  modify arguments
    blend_file=$1
    blend_file="${blend_file%\"}"
    blend_file="${blend_file#\"}"
    shift
    zip_file=${blend_file%".blend"}
    zip_file=${zip_file#"blends/"}
    if [[ $# -ge 2 ]]; then
        if [[ $1 == "all" ]]; then
		framearg="-a"
	else
		framearg="--render-frame ${1}..${2}"
	fi
        shift 2
    else
        framearg="-a"
    fi

    if [[ ! $blend_file == *.blend ]]; then
            blend_file=${blend_file}.blend
    fi

    if [[ ! -e $blend_file ]]; then
        if [ ! -f "blends/$blend_file" ] ; then
                echo "Blend file missing, and not found in blends folder"
                exit
        else
                blend_file="blends/$blend_file"
                echo "Found blend file in blends folder"
        fi
    fi
}

#category: clean up & archive	
checkTmp() {
    #check if files were generated
    if [ -z "$(ls -A /home/ezra/tmp)" ]; then
       echo "No files were generated in ~/tmp" | tee -a logs/blender.log
       exit
    fi
}
#if pre-existing .zip, make new
createZip() {
    if [[ -e "zips/${zip_file}.zip" ]]; then
        counter=1
        # until a zip file doesnt exist, then keep looping
        until [ ! -e "zips/${zip_file} (${counter}).zip" ]
        do
          ((counter++))
        done
        #todo: add duplicate"
        zip_file="${zip_file} (${counter})"
    fi
    zip -s 500m -j -r "zips/${zip_file}.zip" /home/ezra/tmp/* &&
    rm /home/ezra/tmp/*.png
}


