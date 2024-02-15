const express = require('express');
const { SpeechClient } = require('@google-cloud/speech');

const app = express();
const port = 3000;

const keyFilePath = './JsonGoogle.json';
const projectId = 'transcribe-qa';

const speechClient = new SpeechClient({
  projectId: projectId,
  keyFilename: keyFilePath,
});

app.use(express.json({ limit: '50mb' }));

app.post('/streamingRecognize', async (req, res) => {
  try {
    const audioContent = req.body.audioContent;

    const request = {
      audio: {
        content: audioContent,
      },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
    };

    const [response] = await speechClient.streamingRecognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('');

    console.log('Transcription:', transcription);

    res.json({ transcription });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
