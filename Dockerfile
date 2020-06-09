FROM node:12.18.0
COPY . /opt/branch-updater
WORKDIR /opt/branch-updater
RUN npm install --production
ENV NODE_ENV production
CMD ["npm", "start"]
