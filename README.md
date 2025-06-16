# Branding Server

## Description

This project is a Branding Server designed to centralize the management of brand assets for web projects. It provides a web interface where users can create "Sites" and define multiple "Brand Stylings" within them. These stylings contain assets such as CSS variables for colors, images, and fonts, as well as specific CSS rules for selectors. The primary output is a dynamic CSS file for each styling that can be imported into other websites to ensure brand consistency. The system is built as a two-container Docker application, featuring a FastAPI backend and an Apache frontend, and is secured using both Keycloak for user logins and a static API key for external systems.

## Features

* Centralized management of brand assets (colors, fonts, images, dimensions).
* Dynamic generation of CSS files for easy integration.
* Support for brand inheritance between different stylings.
* Visual web interface for managing all assets.
* Export assets to CSS, SCSS, and JSON formats.
* Dual authentication system: Keycloak for UI users and a static API key for services.
* Fully containerized with Docker for easy deployment.

## Technology Stack

* **Backend**: Python 3.10, FastAPI, Uvicorn, SQLAlchemy.
* **Frontend**: Apache HTTP Server, HTML, CSS, JavaScript.
* **Authentication**: Keycloak.
* **Deployment**: Docker & Docker Compose.

## Prerequisites

* Docker and Docker Compose installed.
* A running Keycloak instance.
* A reverse proxy (like Nginx Proxy Manager, Caddy, or Traefik) to handle SSL and route traffic to the containers.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Set up the Directory Structure:**
    The `Dockerfile.frontend` requires your web app files to be in a `webapp` directory. Ensure your structure looks like this:
    ```
    .
    ├── webapp/
    │   ├── index.html
    │   ├── css/
    │   ├── scripts/
    │   └── public/
    ├── docker-compose.yml
    ├── Dockerfile
    ├── Dockerfile.frontend
    ├── app.py
    └── ... (other backend files)
    ```

3.  **Configure Keycloak:**
    * In your Keycloak instance, create a new client (e.g., `kc-client-id`).
    * Set **Client authentication** to **Off** to make it a public client.
    * Set the **Valid Redirect URIs** to your public frontend URL (e.g., `https://brand-assets.apps.yourdomain.com/*`).
    * Set the **Web Origins** to your public frontend origin (e.g., `https://brand-assets.apps.yourdomain.com`).

4.  **Configure Reverse Proxy:**
    Set up your reverse proxy to route traffic to the Docker containers:
    * Route `https://brand-assets.apps.yourdomain.com` to the frontend container at `http://<your-server-ip>:5080`.
    * Route `https://api.yourdomain.com` to the backend container at `http://<your-server-ip>:5000`.

5.  **Create `.env` file:**
    Create a file named `.env` in the root of the project directory and add your API key. Docker Compose will automatically load this file.
    ```env
    # Generate a strong, random key for service-to-service authentication
    API_KEY=YOUR_STRONG_SECRET_API_KEY_HERE
    ```

6.  **Configure `docker-compose.yml`:**
    Below is a sample `docker-compose.yml` file for your reference. Adapt the ports and domain names as needed.
    ```yaml
    services:
      branding-server:
        build:
          context: .
          dockerfile: Dockerfile
        ports:
          - "5000:6000"
        volumes:
          - ./assets:/app/assets
          - ./data:/data
        environment:
          - HOST=0.0.0.0
          - PORT=6000
          - DEBUG=True
          - DB_URL=sqlite:////data/branding_server.db
          - ASSET_DIR=assets
          - API_KEY_REQUIRED=True
          - API_KEY=${API_KEY}
          - CORS_ORIGINS=[https://brand-assets.apps.yourdomain.com](https://brand-assets.apps.yourdomain.com)
          - BASE_URL=[https://api.yourdomain.com](https://api.yourdomain.com)
        restart: always

      frontend-server:
        build:
          context: .
          dockerfile: Dockerfile.frontend
        ports:
          - "5080:80"
        volumes:
          - ./index.html:/usr/local/apache2/htdocs/index.html
          - ./css:/usr/local/apache2/htdocs/css
          - ./scripts:/usr/local/apache2/htdocs/scripts
          - ./public:/usr/local/apache2/htdocs/public
        environment:
          - API_URL=[https://api.yourdomain.com](https://api.yourdomain.com)
          - API_KEY=${API_KEY}
          - OIDC_ENABLED=True
          - OIDC_URL=[https://auth.secure.yourdomain.com](https://auth.secure.yourdomain.com)
          - OIDC_REALM=kc-realm
          - OIDC_CLIENT_ID=kc-client-id
        depends_on:
          - branding-server
        restart: always
    ```

7.  **Build and Run the Application:**
    Use Docker Compose to build the images and start the services.
    ```bash
    docker-compose up -d --build
    ```

## Usage

* **Web Interface**: Access the application by navigating to the frontend URL you configured (e.g., `https://brand-assets.apps.yourdomain.com`). You will be prompted to log in via Keycloak.
* **Public CSS URL**: The generated CSS for any brand styling is publicly accessible and does not require authentication. Use the following URL format in your projects:
    ```
    [https://api.yourdomain.com/brand/](https://api.yourdomain.com/brand/){STYLING_ID}/css
    ```
* **API Access for External Systems**: To use the API with an external system, include the API key in the `X-API-Key` header with your requests.
    ```bash
    curl -H "X-API-Key: YOUR_STRONG_SECRET_API_KEY_HERE" [https://api.yourdomain.com/sites/](https://api.yourdomain.com/sites/)
    ```

## License

This project is licensed under the [Your License Here] License - see the `LICENSE.md` file for details.
