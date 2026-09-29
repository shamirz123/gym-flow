// Vercel serverless entry: every request is rewritten here (see vercel.json) and handled by the Express app
import { createApp } from "../dist/app.js";

export default createApp();
