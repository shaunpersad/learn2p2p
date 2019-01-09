#!/usr/bin/env bash
docker run --rm -it -p 1337:1337 -e "DHT_PORT=1337" -v $(pwd):/usr/src/app learn2p2p /bin/bash