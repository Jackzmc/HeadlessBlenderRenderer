#!/bin/bash
tsc && \
    scp -r package.json yarn.lock dist/* jackz@192.168.1.15:/home/jackz/HeadlessBlenderRenderer-Production/server/dist/ && \
    yarn
