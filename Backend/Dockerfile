# Production-grade Dockerfile for Django ASGI (Backend)
FROM python:3.11-slim

# Set environment variables for better performance and logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /app

# Install system dependencies required for psycopg2, pillow, and other libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gettext \
    curl \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create directory for static and media files
RUN mkdir -p /app/staticfiles /app/media

# Add entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Use entrypoint to run migrations and then start the server
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command (can be overridden by docker-compose)
CMD ["uvicorn", "bma.asgi:application", "--host", "0.0.0.0", "--port", "8000"]
