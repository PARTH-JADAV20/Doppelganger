
  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## GitHub Integration Setup
  To enable GitHub integration (importing and pushing `.c` files), you must configure a GitHub OAuth app.

  ### 1. Create a GitHub OAuth App
  1. Go to **GitHub Developer Settings**: [https://github.com/settings/developers](https://github.com/settings/developers)
  2. Click **New OAuth App**.
  3. Configuration:
     - **Application Name**: `VoltC IDE` (or any name)
     - **Homepage URL**: `http://localhost:5173`
     - **Authorization callback URL**: `http://localhost:3001/auth/github/callback`
  4. Click **Register application**.
  5. Copy your **Client ID** and generate a new **Client Secret**.

  ### 2. Configure Backend `.env`
  1. In the `backend/` directory, create a `.env` file (you can copy `.env.example`).
  2. Add your credentials:
     ```env
     GITHUB_CLIENT_ID=your_client_id_here
     GITHUB_CLIENT_SECRET=your_client_secret_here
     GITHUB_CALLBACK=http://localhost:3001/auth/github/callback
     ```
  3. Restart the backend server if it was already running.