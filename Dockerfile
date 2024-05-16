# Use the official Node.js 16 image as the base image
FROM node:16

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install project dependencies using npm
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Expose a port (if your backend listens on a specific port)
EXPOSE 3000

# Command to run the backend using "npm start"
CMD ["npm", "start"]
