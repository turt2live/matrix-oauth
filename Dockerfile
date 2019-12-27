FROM node:alpine
COPY . /tmp/src
RUN cd /tmp/src \
    && yarn install \
    && yarn build \
    && mv lib/ /moauth/ \
    && mv templates/ /moauth/templates/ \
    && mv public/ /moauth/public/ \
    && mv node_modules / \
    && cd / \
    && rm -rf /tmp/*

ENV NODE_ENV=production
ENV NODE_CONFIG_DIR=/data/config

WORKDIR /moauth
CMD node index.js
VOLUME ["/data"]
