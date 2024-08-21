# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set environment variables
ENV MONGO_URL="mongodb+srv://shahzaibanwar009u097:shahzaibanwar009u097@cluster0.mcwyizy.mongodb.net"
ENV GOOGLE_CLIENT_ID=436334823056-29idghjq33okc0lq6q54gmohn448rad0.apps.googleusercontent.com
ENV GOOGLE_CLIENT_SECRET=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
ENV FRONTEND_URL=http://localhost:5173
ENV SOCKET_URL=https://cloud-wallet.cosmichub.store
ENV PORT=8081
ENV CHAIN_PREFIX=neutron
ENV JWT_SECRET=880@mo0dAjuX0lodhiDUUQXZz49bt1RhVEav90aHY3SE2v7C8c
ENV CHAIN_PREFIX=neutron
ENV CHAIN_PREFIX=loop
ENV CHAIN_PREFIX=neutron
ENV TWITTER_CLIENT_ID=UGVENGVYMDdtN3hTSmNfSkNyZWo6MTpjaQ
ENV TWITTER_APP_SECRET=ND7xHUXg8sQH_8O5jPQJqCSeP4uEnv4JmBME5CJxth5UrW8NXs
ENV TWITTER_CLIENT_ID=sslSgP9tESZTqdYhpy0xPsXes
ENV TWITTER_APP_SECRET=sZm7i4zGjmvuHOIG78IkzTAAcPkrjdXZsMTylkhG7oG9hrS6RT

# Expose the port the app runs on
EXPOSE 8081

# Command to run the application
CMD ["yarn", "start"]
