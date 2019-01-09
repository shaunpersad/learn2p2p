#!/usr/bin/env bash
docker build -t learn2p2p -f DockerfileProd .
docker tag learn2p2p gcr.io/learn2p2p/learn2p2p:latest
docker push gcr.io/learn2p2p/learn2p2p:latest