# Branding Server 🌐

![GitHub release](https://img.shields.io/github/release/zayi17/branding-server.svg) ![Docker](https://img.shields.io/badge/docker-v20.10.7-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-v0.68.0-green)

Welcome to the **Branding Server** repository! This project serves as a Docker-based CSS and assets server designed to centralize CSS deployment. With a visual web GUI and a CSS editor, it aims to simplify the management of your brand's stylesheets. Please note that this project is still a work-in-progress.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

- **Centralized CSS Management**: Store and manage all your CSS files in one place.
- **Visual Web GUI**: A user-friendly interface to edit and preview your styles.
- **CSS Editor**: Built-in editor for quick changes and immediate feedback.
- **Docker Support**: Easily deploy the server using Docker and Docker Compose.
- **FastAPI Integration**: Fast and efficient API for seamless interactions.

## Getting Started

To get started with Branding Server, follow these steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/zayi17/branding-server.git
   cd branding-server
   ```

2. **Download the Latest Release**:
   Visit [the releases page](https://github.com/zayi17/branding-server/releases) to download the latest version. If there is a specific file, download and execute it to get started.

3. **Set Up Docker**:
   Make sure you have Docker and Docker Compose installed. You can find installation instructions on the [Docker website](https://docs.docker.com/get-docker/).

4. **Run the Server**:
   Use the following command to start the server:
   ```bash
   docker-compose up
   ```

5. **Access the Web GUI**:
   Open your browser and navigate to `http://localhost:8000` to access the web GUI.

## Usage

Once you have the server running, you can begin using it to manage your CSS files.

### Uploading CSS Files

1. Click on the "Upload" button in the web GUI.
2. Select the CSS files you want to upload.
3. The files will be stored in the server for easy access.

### Editing CSS

1. Navigate to the CSS file you want to edit.
2. Click on the file name to open the editor.
3. Make your changes and click "Save" to apply them.

### Previewing Changes

After editing your CSS, you can preview the changes in real-time. Simply refresh your web page to see the updates.

## API Documentation

The Branding Server provides a RESTful API for programmatic access to its features. Below are some key endpoints:

### GET /api/css

Retrieve a list of all CSS files stored on the server.

### POST /api/css

Upload a new CSS file. Include the file in the request body.

### PUT /api/css/{filename}

Update an existing CSS file. Provide the updated file in the request body.

### DELETE /api/css/{filename}

Delete a CSS file from the server.

For more detailed API documentation, refer to the `docs` folder in this repository.

## Contributing

We welcome contributions to Branding Server! To get involved:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Make your changes and commit them (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a pull request.

Please ensure your code adheres to our coding standards and includes tests where applicable.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Contact

For questions or suggestions, please open an issue in this repository. You can also reach out to the maintainer via GitHub.

---

Thank you for your interest in Branding Server! We hope this tool helps you streamline your CSS management. Don't forget to check the [Releases](https://github.com/zayi17/branding-server/releases) section for the latest updates and features.