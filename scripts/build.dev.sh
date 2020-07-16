#!/bin/sh

cp ../../prayers.v2.f7/framework7.phonegap.js ./src/ || exit 1
webpack || exit 1
rm -rf ../../prayers.v2.f7/* || exit 1
cp -a ./dev/. ../../prayers.v2.f7/ || exit 1
