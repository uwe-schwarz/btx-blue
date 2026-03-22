import { spawn } from "node:child_process";
import net from "node:net";

const host = "127.0.0.1";
const port = 4321;

function waitForPort(hostname, portNumber, timeoutMs = 15000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ host: hostname, port: portNumber });

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Server auf ${hostname}:${portNumber} wurde nicht rechtzeitig erreichbar.`));
          return;
        }

        setTimeout(tryConnect, 250);
      });
    };

    tryConnect();
  });
}

const preview = spawn(
  "pnpm",
  ["exec", "astro", "preview", "--host", host, "--port", String(port)],
  {
    stdio: "inherit",
    shell: false,
  },
);

const shutdown = () => {
  if (!preview.killed) {
    preview.kill("SIGTERM");
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);

try {
  await waitForPort(host, port);

  const tests = spawn("pnpm", ["exec", "playwright", "test"], {
    stdio: "inherit",
    shell: false,
  });

  const exitCode = await new Promise((resolve, reject) => {
    tests.on("exit", (code) => resolve(code ?? 1));
    tests.on("error", reject);
  });

  shutdown();
  process.exit(exitCode);
} catch (error) {
  shutdown();
  throw error;
}
