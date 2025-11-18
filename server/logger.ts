import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.resolve(__dirname, "../logs");
const LOG_FILE = path.join(LOG_DIR, "server.log");

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create a write stream for the log file (append mode)
const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLogMessage(level: string, message: string, source = "express"): string {
  const timestamp = formatTimestamp();
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  
  return `[${timestamp}] [${formattedTime}] [${source}] [${level}] ${message}`;
}

export function logToFile(level: string, message: string, source = "express"): void {
  const logMessage = formatLogMessage(level, message, source);
  
  // Write to file
  logStream.write(logMessage + "\n");
  
  // Also write to console
  if (level === "ERROR") {
    console.error(logMessage);
  } else if (level === "WARN") {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
}

export function log(message: string, source = "express"): void {
  logToFile("INFO", message, source);
}

export function logError(message: string, source = "express"): void {
  logToFile("ERROR", message, source);
}

export function logWarn(message: string, source = "express"): void {
  logToFile("WARN", message, source);
}

export function logDebug(message: string, source = "express"): void {
  logToFile("DEBUG", message, source);
}

// Log object/data structures
export function logObject(level: string, label: string, obj: any, source = "express"): void {
  const jsonString = JSON.stringify(obj, null, 2);
  logToFile(level, `${label}:\n${jsonString}`, source);
}

// Clean up on process exit
process.on("exit", () => {
  logStream.end();
});

process.on("SIGINT", () => {
  logStream.end();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logStream.end();
  process.exit(0);
});

