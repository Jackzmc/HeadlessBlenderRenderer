#!/bin/bash
tsc && \
    scp -r package.json yarn.lock hs1:/home/jackz/HeadlessBlenderRenderer-Production/server/ && \
    scp -r dist/* hs1:/home/jackz/HeadlessBlenderRenderer-Production/server/dist/ && \
    ssh hs1 'yarn'
