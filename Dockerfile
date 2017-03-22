FROM node:6.9.1

# Bundle app source
COPY . /app

# Create app directory
WORKDIR /app

# Get NPM Modules
RUN npm install && npm install -g foreman nodemon

CMD nodemon --exec "nf start"
