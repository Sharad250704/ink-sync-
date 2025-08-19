const express = require("express");
const cors = require("cors");
const http = require("http");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*", // allow all origins, change if needed
    methods: ["GET", "POST"]
  }
});

// Enable CORS
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Basic route
app.get("/", (req, res) => {
  res.send("hello");
});

let rooms = [];
const Port = process.env.PORT || 4000;

io.on("connection", (socket) => {
  console.log("a user connected");

  // Join Room
  socket.on("joinRoom", (data) => {
    console.log("joined room", data.roomId);
    socket.join(data.roomId);
    const elements = rooms.find((element) => element.roomId === data.roomId);
    if (elements) {
      // update the new user with the current canvas
      io.to(socket.id).emit("updateCanvas", elements);
      elements.user = [...elements.user, socket.id];
    } else {
      rooms.push({
        roomId: data.roomId,
        updatedElements: [],
        user: [socket.id],
        canvasColor: "#121212",
      });
    }
  });

  // Update the canvas
  socket.on("updateCanvas", (data) => {
    socket.to(data.roomId).emit("updateCanvas", data);
    const elements = rooms.find((element) => element.roomId === data.roomId);
    if (elements) {
      elements.updatedElements = data.updatedElements;
      elements.canvasColor = data.canvasColor;
    }
  });

  // Send message
  socket.on("sendMessage", (data) => {
    socket.to(data.roomId).emit("getMessage", data);
    io.to(socket.id).emit("getMessage", data);
  });

  // Keep server awake (ping/pong)
  socket.on("pong", () => {
    setTimeout(() => {
      socket.emit("ping");
    }, 120000);
  });

  // Clear elements when no one is in the room
  socket.on("disconnect", () => {
    rooms.forEach((element) => {
      element.user = element.user.filter((user) => user !== socket.id);
      if (element.user.length === 0) {
        rooms = rooms.filter((room) => room.roomId !== element.roomId);
      }
    });
  });
});

// Listen on Render-compatible host
server.listen(Port, "0.0.0.0", () => {
  console.log(`Server is running on port ${Port}`);
});
