const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const fs = require('fs');

const loadConfigFromJson = (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading JSON file: ${filePath}`);
    throw err;
  }
};
const createSpeechRecognitionFunction = () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS ='JsonGoogle.json';
    const configFilePath = 'JsonGoogle.json';

    // Load configuration from the JSON file
    const config = loadConfigFromJson(configFilePath);
  const client = new speech.SpeechClient();

  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
      model:'video',
      enableAutomaticPunctuation: true,
      useEnhanced:true,
      single_utterance :true,
    },
    interimResults: true,
  };

  const recognizeStream = client
    .streamingRecognize(request)
    .on('error', console.error)
    .on('data', data =>
      process.stdout.write(
  
        data.results[0] && data.results[0].alternatives[0]
          ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
          : '\n\nReached transcription time limit, press Ctrl+C\n'
      )
     
    );

  recorder
    .record({
      sampleRateHertz: 44100,
      threshold: 0.5,
     // verbose: false,
      recordProgram: 'sox',
      silence: '10.0',
      audioType: 'wav',
    })
    .stream()
    .on('error', console.error)
    .pipe(recognizeStream);

  console.log('Listening, press Ctrl+C to stop.');
};

// Uncomment and provide the necessary values before running the sample
// const encoding = 'Encoding of the audio file, e.g. LINEAR16';
// const sampleRateHertz = 16000;
// const languageCode = 'BCP-47 language code, e.g. en-US';

// Call the function with the specified parameters
createSpeechRecognitionFunction();
