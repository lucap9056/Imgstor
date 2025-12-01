# Imgstor

----

## Overview


**Imgstor** is a frontend-only application designed for managing files uploaded to various image hosting platforms. The application provides a seamless user experience for organizing, searching, and filtering your image collection. It relies on Google Drive for backing up original image files and storing configuration files and the database.

----

## Features

- **Image Management**: Effortlessly manage your image hosting uploads.

- **Search by Title**: Quickly locate files using a title-based search.

- **Tag Filtering**: Filter images by associated tags for better organization.

- **Google Drive Integration**: Automatically backup original files and store configurations and database in your Google Drive.

- **Lightweight Frontend**: Built with modern tools such as Bun.js, Vite, and React.

- **Customizable Deployment**: Requires a user-provided web server for deployment.

- **Built-in Transcoder**: Imgstor includes a basic transcoder based on `ffmpeg.wasm`, with additional Rust-based WASM modules used to assist `ffmpeg.wasm` operations. **Note**: For animations, it is recommended to use a more specialized transcoder for optimal performance.

----

## Prerequisites

To use Imgstor, ensure you have:

1. **Google API Credentials**:
	- A Google Cloud project with OAuth 2.0 credentials enabled.
	- An API key and client ID configured.

2. **Web Server**:
	- A self-hosted or cloud-hosted web server capable of serving the application.

3. **Environment Configuration**:
	- Specify required environment variables in an `.env` file.

----

## Installation

1. Clone the repository:
	```
	git clone https://github.com/lucap9056/Imgstor
	cd imgstor
	```

2. Install dependencies using Bun:
	```
	bun install
	```

3. Configure your environment:
	- Create a `.env` file in the project root and specify the following:
		```
		VITE_GOOGLE_API_KEY=your-google-api-key
		VITE_GOOGLE_CLIENT_ID=your-google-client-id
		VITE_APP_NAME=Imgstor
		```

4. Build the application:
	```
	bun build
	```

----

## Deployment

1. Serve the built files using your preferred web server. For example, with Nginx:
	```
	server {
	    listen 80;
	    server_name your-domain.com;
	    root /path/to/imgstor/dist;
	    index index.html;
	    location / {
	        try_files $uri /index.html;
	    }
	}
	```

2. Start your web server and access the application at your configured domain.

----

## Usage

1. **Initial Setup**:
	- Authorize the application with Google Drive using your OAuth credentials.
	- Configure image hosting platforms and tags.

2. **Uploading Files**:
	- Upload images to your preferred platforms via the Imgstor interface.
	- Backups are automatically synced to Google Drive.

3. **Managing Files**:
	- Use the search bar to locate images by title.
	- Apply tag filters to refine your view.

4. **Transcoding Media**:
	- Imgstor has an integrated transcoder using `ffmpeg.wasm` for basic media file transcoding. Rust-based WASM modules assist in the transcoding process.
	- **Recommendation**: For more complex animations, consider using a dedicated transcoder for better results.
