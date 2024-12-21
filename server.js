require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const corsConfig = {
  origin: "*",
  credential: true,
  methods:["GET","POST","PUT","DELETE"],
};

const app = express();
const server = http.createServer(app);
const io = socketIo(server);


const activeRooms = {};
const blockedUsers = new Set();
const MODERATOR_PASSWORD = 'lit3x7';

aap.options("",cors(corsConfig));
app.use(cors(corsConfig));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const upload = multer({ dest: 'uploads/' });


app.use(session({
  secret: 'lit3x7',
  resave: false,
  saveUninitialized: true,
}));


app.set('view engine', 'ejs');


app.get('/', (req, res) => {
  res.render('home');  
});


app.get('/chat', (req, res) => {
  const { username, roomId } = req.body;



  req.session.username = username;
  req.session.roomId = roomId;


  res.redirect('/chat');
});

app.get('/chat', (req, res) => {
  const { username, roomId } = req.session;


  if (!username || !roomId) {
    return res.redirect('/');
  }

  res.render('chat', { username, roomId });
});




app.get('/moderator', (req, res) => {
  if (!req.session.logged_in) {
    return res.redirect('/login');
  }
  res.render('moderator', { rooms: activeRooms, blockedUsers });
});


app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const password = req.body.password;
  if (password === MODERATOR_PASSWORD) {
    req.session.logged_in = true;
    return res.redirect('/moderator');
  }
  res.status(403).send("Invalid password");
});


app.get('/logout', (req, res) => {
  req.session.logged_in = false;
  res.redirect('/');
});


app.post('/block_user', (req, res) => {
  if (!req.session.logged_in) {
    return res.redirect('/login');
  }

  const username = req.body.username;
  blockedUsers.add(username);
  res.redirect('/moderator');
});


app.post('/upload', upload.single('file'), (req, res) => {
  if (req.file) {
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, fileName: req.file.originalname });
  } else {
    res.status(400).send('No file uploaded');
  }
});


io.on('connection', (socket) => {
  console.log('A user connected.');


  socket.on('join', (data) => {
    const { username, room_id } = data;


    if (username.toLowerCase().includes('rahul') || blockedUsers.has(username)) {
      return;
    }

    socket.join(room_id);
    

    if (!activeRooms[room_id]) {
      activeRooms[room_id] = [];
    }

    if (!activeRooms[room_id].includes(username)) {
      activeRooms[room_id].push(username);
    }


    const message = `${username} has joined the room.`;
    io.to(room_id).emit('message', { username: 'System', message });
    console.log(message);
  });


  socket.on('message', (data) => {
    const { username, room_id, message } = data;
    

    if (blockedUsers.has(username)) {
      return;
    }

    io.to(room_id).emit('message', { username, message });
  });


  socket.on('sendFile', (data) => {
    const { username, room_id, filePath, fileName } = data;
    

    if (blockedUsers.has(username)) {
      return;
    }

    io.to(room_id).emit('message', {
      username,
      filePath,
      fileName
    });
  });


  socket.on('leave', (data) => {
    const { username, room_id } = data;
    
    socket.leave(room_id);
    if (activeRooms[room_id] && activeRooms[room_id].includes(username)) {
      activeRooms[room_id] = activeRooms[room_id].filter(user => user !== username);
    }

    const message = `${username} has left the room.`;
    io.to(room_id).emit('message', { username: 'System', message });
    console.log(message);
  });


  socket.on('disconnect', () => {
    console.log('A user disconnected.');
  });
});


const port = process.env.PORT || 3000;


server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
