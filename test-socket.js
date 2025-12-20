const io = require("socket.io-client");

// STEP 1: Paste your Token here (inside quotes)
const MY_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTM4OTg2MmJhYzQ0OTViZjJkNzNjYTMiLCJpYXQiOjE3NjYwOTMzMDEsImV4cCI6MTc2NjA5NDIwMX0.cIhqZqx49uT_AF_z_p_zurSj8a5DISfzTxIzBtjzi3o";

// STEP 2: Paste the Receiver ID here (inside quotes)
const RECEIVER_ID = "693899bdbac4495bf2d73ca7";

// connecting to server
const socket = io("http://localhost:8000", {
  auth: {
    token: MY_TOKEN,
  },
});

socket.on("connect", () => {
  console.log("Connected to server with ID:", socket.id);

  // sending a test message
  console.log("Sending message...");
  socket.emit("send_message", {
    receiverId: RECEIVER_ID,
    content: "Testing Cache Invalidation Day 2",
  });
});

// listening for delivery confirmation
socket.on("message_delivered", (data) => {
  console.log("Message Delivered! ID:", data.messageId);
  console.log("Test Complete. Check your Server Terminal now.");
  socket.disconnect();
});

socket.on("connect_error", (err) => {
  console.log("Connection Error:", err.message);
});
