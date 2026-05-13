# Production Build for React (Frontend)
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production Stage: Serve with Nginx
FROM nginx:stable-alpine

# Copy build artifacts to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx config for React routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
