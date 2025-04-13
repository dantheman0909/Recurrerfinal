import express from "express";
import http from "http";

// Create Express app
const app = express();

// Add a health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = http.createServer(app);

// Start server on port 5000
const port = 5000;
server.listen(port, "0.0.0.0", () => {
  console.log(`Port test server running on http://0.0.0.0:${port}`);
});

// Set up error handler
server.on("error", (error: any) => {
  console.error(`Server error: ${error.message}`);
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use`);
  }
});