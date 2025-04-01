const http = require('http').createServer();
const io = require('socket.io')(http, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
const wrtc = require('wrtc');

// Store connected clients
const clients = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  clients.set(socket.id, { socket });

  // Handle offer from a client
  socket.on('offer', async (offer) => {
    try {
      console.log('Received offer from:', socket.id);
      // Find another client to pair with
      const otherClient = [...clients.entries()].find(([id]) => id !== socket.id);
      if (!otherClient) {
        console.log('No other clients to pair with');
        return;
      }
      const otherSocket = otherClient[1].socket;

      // Create peer connection for this pair
      const peerConnection = new wrtc.RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      const movementChannel = peerConnection.createDataChannel('movement', {
        ordered: false, maxRetransmits: 0,
      });
      const criticalChannel = peerConnection.createDataChannel('critical', {
        ordered: true,
      });

      clients.set(socket.id, { socket, peerConnection, movementChannel, criticalChannel });

      // Handle ICE candidates
      socket.on('candidate', (candidate) => {
        peerConnection.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
      });

      peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.emit('candidate', candidate.toJSON());
          otherSocket.emit('candidate', candidate.toJSON());
        }
      };

      // Set offer and generate answer
      await peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', answer);

      // Relay data between paired clients
      movementChannel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Movement update:', data);
        data.serverTimestamp = Date.now();
        otherSocket.emit('movement', JSON.stringify(data));
      };

      criticalChannel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Critical update:', data);
        data.serverTimestamp = Date.now();
        otherSocket.emit('critical', JSON.stringify(data));
      };
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  });

  socket.on('movement', (data) => {
    const client = clients.get(socket.id);
    if (client && client.movementChannel.readyState === 'open') {
      client.movementChannel.send(data);
    }
  });

  socket.on('critical', (data) => {
    const client = clients.get(socket.id);
    if (client && client.criticalChannel.readyState === 'open') {
      client.criticalChannel.send(data);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const client = clients.get(socket.id);
    if (client && client.peerConnection) client.peerConnection.close();
    clients.delete(socket.id);
  });
});

const port = 3000;
http.listen(port, '0.0.0.0', () => console.log(`Server running on port ${port}`));