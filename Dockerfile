#https://hub.docker.com/_/node?tab=tags&page=1
FROM node:16.14.2-alpine3.15

WORKDIR /usr/src/app

COPY tsconfig.json .
COPY package*.json ./
COPY src ./src
COPY test ./test
COPY migration ./migration
COPY patches ./patches

RUN apk add --update alpine-sdk
RUN apk add git python3
RUN apk add --no-cache  chromium --repository=http://dl-cdn.alpinelinux.org/alpine/v3.10/main
RUN npm ci
RUN npm i -g ts-node
COPY config ./config
RUN npm run build
