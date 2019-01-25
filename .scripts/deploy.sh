#!/usr/bin/env bash
rm -rf data/private/socket/cli-socket
rm -rf data/private/private-key.pem
rm -rf data/public/public-key.pem
docker build -t learn2p2p -f DockerfileProd .
docker tag learn2p2p gcr.io/learn2p2p/learn2p2p:latest
docker push gcr.io/learn2p2p/learn2p2p:latest