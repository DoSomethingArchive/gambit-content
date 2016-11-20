FROM node:6.9.1

# Packages required to run the app
RUN npm install -g foreman
RUN npm install -g nodemon

# Create app directory
RUN mkdir -p /app
WORKDIR /app

# Install app dependencies
COPY package.json /app
RUN npm install

# Bundle app source
COPY . /app

CMD nodemon --exec "nf start"
