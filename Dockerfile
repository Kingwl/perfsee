FROM ghcr.io/perfsee/perfsee/server:latest AS deploy
ADD . /code
WORKDIR /code
RUN yarn && yarn build
CMD ["node", "-r", "./tools/paths-register", "packages/platform-server/dist/index.js"]
