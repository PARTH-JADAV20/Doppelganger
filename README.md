
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

  ## Deployment (Render & Vercel)
  
  The IDE is ready to be deployed to Render (Backend) and Vercel (Frontend).
  
  ### 1. Backend (Render)
  - Create a new Web Service on Render and point it to the `backend/` directory.
  - Set the build command to `npm run build` (this will compile the C files).
  - Set the start command to `npm start`.
  - Add the following Environment Variables in Render:
    - `GITHUB_CLIENT_ID`: Your GitHub OAuth Client ID
    - `GITHUB_CLIENT_SECRET`: Your GitHub OAuth Client Secret
    - `GITHUB_CALLBACK`: `https://your-render-app-url.onrender.com/auth/github/callback`
  
  ### 2. Frontend (Vercel)
  - Deploy the root directory to Vercel (it uses Next.js).
  - Add the following Environment Variable in Vercel:
    - `NEXT_PUBLIC_API_URL`: `https://your-render-app-url.onrender.com`
  
  ### 3. Update GitHub OAuth App
  - Go back to your GitHub Developer Settings.
  - Update the **Homepage URL** to your Vercel app URL (e.g., `https://your-vercel-app.vercel.app`).
  - Update the **Authorization callback URL** to your Render backend URL (e.g., `https://your-render-app-url.onrender.com/auth/github/callback`).