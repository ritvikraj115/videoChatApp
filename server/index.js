const { Server } = require("socket.io");

const port=process.env.PORT || 8000

const io = new Server(port, {
  cors: true,
});

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

io.on("connection", (socket) => {
  socket.on("room:join", (data) => {
    const { email, room } = data;
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    io.to(room).emit("user:joined", { email, id: socket.id });
    socket.join(room);
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ from:to, offer }) => {
    io.to(socket.id).emit("call:accepted", { from: to, offer });
  });

  socket.on("post:call", ({ from:to, ans}) => {
    console.log(to)
    io.to(to).emit("post:call", { from: socket.id, ans });

  })

  socket.on("peer:nego:needed", ({ to, offer }) => {
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    // console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

  socket.on("stop:stream",({to})=>{
    io.to(to).emit('stop:stream', {from:socket.id})
  })
  socket.on('call:ended',({to})=>{
    io.to(to).emit('call:end',{from:socket.id})
  })
});
