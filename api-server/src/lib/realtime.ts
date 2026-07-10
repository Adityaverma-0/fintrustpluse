import { WebSocketServer, WebSocket } from "ws";
import { parse as parseUrl } from "url";
import { logger } from "./logger";

const clients = new Map<number, Set<WebSocket>>();

export function initRealtime(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: any, socket: any, head: any) => {
    const parsed = parseUrl(request.url || "", true);
    if (parsed.pathname === "/realtime") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws: WebSocket, request: any) => {
    const parsed = parseUrl(request.url || "", true);
    const userId = parseInt(String(parsed.query.userId));

    if (isNaN(userId)) {
      ws.close(1008, "Missing userId");
      return;
    }

    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId)!.add(ws);
    logger.info({ userId }, "WebSocket connection established");

    ws.on("close", () => {
      const userSockets = clients.get(userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          clients.delete(userId);
        }
      }
      logger.info({ userId }, "WebSocket connection closed");
    });

    ws.on("error", (err) => {
      logger.error({ err, userId }, "WebSocket error");
    });
  });

  logger.info("Realtime WebSocket service initialized");
}

export function broadcastToUser(userId: number, event: string, data: any) {
  const userSockets = clients.get(userId);
  if (userSockets) {
    const payload = JSON.stringify({ type: event, data });
    for (const ws of userSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}

export function broadcastToAll(event: string, data: any) {
  const payload = JSON.stringify({ type: event, data });
  for (const [userId, userSockets] of clients.entries()) {
    for (const ws of userSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}
