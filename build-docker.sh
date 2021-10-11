#!/usr/bin/env bash
docker build -t oa2client:latest -f Dockerfile-client .
docker build -t oa2resource:latest -f Dockerfile-resource .
docker build -t oa2server:latest -f Dockerfile-server .