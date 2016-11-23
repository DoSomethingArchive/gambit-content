FROM node:6.9.1

# Create app directory
WORKDIR /app

# Bundle app source
COPY . /app

# Get NPM Modules
RUN npm install && npm install -g foreman nodemon

CMD nodemon --exec "nf start"
