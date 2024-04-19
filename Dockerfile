FROM node:18.19.1
COPY . /opt/branch-updater
WORKDIR /opt/branch-updater
RUN npm install --production
ENV NODE_ENV production
CMD ["npm", "start"]
