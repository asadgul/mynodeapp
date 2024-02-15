const express = require('express');
const http = require('http');
//const socketIO = require('socket.io');
const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const fs = require('fs');
// const cors = require('cors');
const app = express();
let activeClients = 0;
//app.use(cors(corsOptions));
const server = http.createServer(app);
var io = require('socket.io')(server, {
    cors: {
      origin: '*',
    }
});
//const io = socketIO(server);
let recognizeStream=null;
let recordingstream=null;
const loadConfigFromJson = (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading JSON file: ${filePath}`);
    throw err;
  }
};

const createSpeechRecognitionFunction = (socket) => {
  try{
  process.env.GOOGLE_APPLICATION_CREDENTIALS = 'JsonGoogle.json';
  const configFilePath = 'JsonGoogle.json';
  const config = loadConfigFromJson(configFilePath);
  const client = new speech.SpeechClient();

  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    },
    interimResults: true,
  };
   recognizeStream = client
    .streamingRecognize(request)
    .on('error', console.error)
    .on('data', (data) => {
      const transcription =
        data.results[0] && data.results[0].alternatives[0]
          ? data.results[0].alternatives[0].transcript
          : '';
          if(data.results[0].isFinal)
          {
            socket.emit('Finaltranscription', transcription);

          }
          else{
            socket.emit('Interimtranscription', transcription);

          }

      // Emit the transcription to the connected Angular client
     
      console.log(`Transcription: ${transcription}`);
      console.log(`clients':${activeClients}`);
    });

   
 recordingstream= recorder
    .record({
      sampleRateHertz: 44100,
      threshold: 0.5,
      recordProgram: 'sox',
      silence: '10.0',
      audioType: 'wav',
    })
    .stream()
    .on('error', console.error)
    .pipe(recognizeStream);
  console.log('Listening, press Ctrl+C to stop.');
  }
  catch(e){

  }
};

io.on('connection', (socket) => {
  activeClients++;
  console.log('Angular client connected');

  // Listen for start button click from Angular client
  socket.on('startStreaming', () => {
   
    //if(activeClients>0)
    //{
    socket.emit('Speak','Please speak now');    
    createSpeechRecognitionFunction(socket);  
  //}
 
  
  });
  socket.on('disconnect', () => {
       activeClients--;   
       if(activeClients==0)
       {        
        if(recordingstream!=null){
        recordingstream.destroy();
      }
        console.log('no clients');
          
                 
  }
    console.log('Angular client disconnected');
  });
  socket.on('StopStreaming', () => {
    if(recordingstream!=null){
      recordingstream.destroy();
    }
 console.log('Angular client disconnected');
});


});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Optionally, perform cleanup and restart the server
  cleanupAndRestart();
});


function cleanupAndRestart() {
  // Perform any necessary cleanup here

  // Stop transcription and disconnect the microphone

  // Restart the server
  server.close(() => {
      console.log('Server closed, restarting...');
      process.exit(1);
  });
}

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
