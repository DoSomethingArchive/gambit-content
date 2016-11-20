FROM node:6.9.1

RUN npm install -g foreman

# Create app directory
RUN mkdir -p /app
WORKDIR /app

# Install app dependencies
COPY package.json /app
RUN npm install

# Bundle app source
COPY . /app

CMD nf start
