FROM node:alpine
COPY . /tmp/src
RUN cd /tmp/src \
    && yarn install \
    && yarn build \
    && mv lib/ /moauth/ \
    && mv node_modules / \
    && cd / \
    && rm -rf /tmp/*

ENV NODE_ENV=production
ENV NODE_CONFIG_DIR=/data/config

CMD node /moauth/index.js
VOLUME ["/data"]
