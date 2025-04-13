import express from "express";
import type { Request, Response, NextFunction } from "express";
import http from "http";

// Create express app with HTTP server
const app = express();
const server = http.createServer(app);

// Basic middleware
app.use(express.json());

// Basic health check route
app.get("/api/healthcheck", (_req, res) => {
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
});

// Basic error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Start the server
const port = parseInt(process.env.PORT || "5000");
console.log(`Starting minimal test server on port ${port}...`);

server.listen(port, "0.0.0.0", () => {
  console.log(`Minimal test server is running on http://0.0.0.0:${port}`);
});

server.on("error", (error: any) => {
  console.error(`Server error: ${error.message}`);
  console.error("Full error details:", error);
});