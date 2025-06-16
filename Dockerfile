# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy requirements file first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt 

# Create necessary directories for volumes BEFORE copying files
# This ensures the directories exist with the right permissions
RUN mkdir -p /data 
RUN chmod 777 /data 

# Copy the rest of the application (respecting .dockerignore)
COPY . . 

# Expose the port
EXPOSE 6000

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "6000"]