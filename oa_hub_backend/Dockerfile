# Use official Node.js Alpine image for minimal footprint
FROM node:20-alpine

# Set environment to production for performance optimizations
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Change ownership of the working directory to the non-root 'node' user
RUN chown -R node:node /app

# Switch to non-root user for security
USER node

# Copy package files first to leverage Docker layer caching
# chown is required because COPY runs as root by default
COPY --chown=node:node package*.json ./

# Install only production dependencies (ignoring devDependencies) and clean cache to reduce image size
# Note: If you have a package-lock.json, 'npm ci' is preferred, but 'npm install' is more forgiving.
RUN npm install --omit=dev && npm cache clean --force

# Copy the rest of the application code
COPY --chown=node:node . .

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
