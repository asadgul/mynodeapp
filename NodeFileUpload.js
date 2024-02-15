const express = require('express');
const http = require('http');
const fs  = require('fs');
 const cors = require('cors');
const app = express();
const axios = require('axios');
const { Storage } = require('@google-cloud/storage');
const Path =require('path');
// const {Translate}=require('@google-cloud/translate').v2;
const {TranslationServiceClient} = require('@google-cloud/translate').v3beta1;
const location = 'global';
let date_ob = new Date();
let ActualFileName='';
const FormData = require('form-data');
let extension=''
const projectId = 'transcribe-qa';
const targetLanguageCode = 'sr-Latn';
app.use(cors());
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Server is open for testing' });
});
let translatedFilePath = '';

const server = http.createServer(app);
var io = require('socket.io')(server, {
    cors: {
       origin: '*',
    }
});

const PORT = 3000;
let FileUploadUrl=''
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
process.env.GOOGLE_APPLICATION_CREDENTIALS ='JsonGoogle.json';
const storage = new Storage();
const bucketName = 'smartclinix-qa';
let localFilePath = ''; // Update with your local file path
let remoteFilePath = ''; // Update with the desired path in the bucket

// Upload the file to Google Cloud Storage

// Creating Client Service
const CREDENTIALS = require('./JsonGoogle.json');
const { Console } = require('console');

io.on("connection", (socket) => {

let updatefilename=''
socket.on("FileName",(filenamextension)=>{
  ActualFileName=Path.parse(filenamextension).name;
     extension = filenamextension.substring(filenamextension.lastIndexOf('.') + 1);
     console.log('extension is'+extension);
     updatefilename=ActualFileName+"-"+date_ob.getTime()+"."+extension;
   //  translatedFilePath=updatefilename;
    console.log('file name'+ActualFileName);
});
socket.on("FileUrl",(FileUploadU)=>{
  FileUploadUrl=FileUploadU;
  console.log(`File url ${FileUploadU}`);

});
socket.on("upload", (file, callback) => {
  const jsondata=JSON.stringify(file);
    console.log('upload name'+jsondata.name);
//      let pat='E:\\UserData\\Asad Gul\'
      let pat=FileUploadUrl;

      console.log(`file name is ${updatefilename}`)
    const path='D:\\Logs\\'+updatefilename
    console.log()
    pat=pat+ActualFileName+"."+extension;
  translatedFilePath=pat;
    remoteFilePath=ActualFileName+"."+extension;
    localFilePath=pat;
    uploadFile(bucketName,remoteFilePath);
// uploadFileToGCS(FileUploadUrl,remoteFilePath);

//          socket.on('TranslateFile', (currentlanguage) => {
//           console.log('CALLED TRANSLATE FILE is '+currentlanguage);
//       });
          
} 

);
socket.on("TranslateDocument",(languageCode)=>{

translateDocument(remoteFilePath,languageCode,socket);
})
  });
  async function uploadFile(bucketName,remoteFilePathurl) {
    try {
      console.log(`remote url ${remoteFilePathurl}`);
            process.env.GOOGLE_APPLICATION_CREDENTIALS = 'JsonGoogle.json';
        await storage.bucket(bucketName).upload(remoteFilePathurl, {
        destination: remoteFilePathurl,
      });
      console.log(`remote file path is${remoteFilePathurl}`);
   //   translateDocument(remoteFilePathurl,'ar');
 console.log('downloading');
      //console.log(File ${localFilePath} uploaded to Google ${bucketName}/${remoteFilePath});

} catch (err) {
  console.error('Error uploading file:', err);
}
  }
  async function translateDocument(remoteFile,convertlanguage,socket) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('remote file'+remoteFile);
    try {
      const inputUri = `gs://${bucketName}/${remoteFile}`; // Replace with the actual GCS URI

  console.log(`input uri is ${inputUri}`);
  const documentInputConfig = {
    gcsSource: {
      inputUri: inputUri,
    },
  };
  process.env.GOOGLE_APPLICATION_CREDENTIALS = 'jsonfile.json';  

  const translationClient = new TranslationServiceClient();

  // Construct request
  const request = {
    parent: translationClient.locationPath(projectId, location),
    documentInputConfig: documentInputConfig,
    //sourceLanguageCode: sourceLanguageCode,
    targetLanguageCode: convertlanguage,
    mimeType: 'text/plain',
  };

  // Run request
  const [response] =await  translationClient.translateDocument(request);
  const translatedContentBuffer = response.documentTranslation.byteStreamOutputs[0];

  // Output the translated content
  console.log('Translated Content:');
  console.log(response);
  if(translatedContentBuffer!=null){
    console.log(success);
        socket.emit('Response','Success');
  }

  let transpath=`E:\\UserData\\${ActualFileName+"."+extension}`//testfilehmd.pdf'
              console.log('going to read file and called request file');
              fs.writeFile(transpath, translatedContentBuffer, (err) => {
                console.log('going to read file and called request file');
                const fileStream = fs.createReadStream(transpath);
                fileStream.on('data', (data) => {
                  console.log('going to send file chunk');
                socket.emit('fileChunk', data);
                console.log('called file chunk');
            });
            fileStream.on('end', () => {
              console.log('end now ');
                socket.emit('fileEnd');
                console.log('end file end');
            });
          });
} catch (error) {
  console.error('Error during translation:', error);
  socket.emit('Response','Error');
}

  
  async function uploadFileToGCS(url, fileName) {
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        process.env.GOOGLE_APPLICATION_CREDENTIALS = 'jsonfile.json';
        // Download the file from URL
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
      });
      // Create a writable stream to upload file to GCS
      const file = storage.bucket(bucketName).file(fileName);
      const stream = file.createWriteStream({
        resumable: false,
      });

  // Pipe the downloaded file to the GCS stream
  response.data.pipe(stream);

  // Wait for the upload to complete
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  console.log(`File ${fileName} uploaded to GCS bucket ${bucketName} url is ${url}`);
} catch (error) {
  console.error('Error uploading file to GCS:', error);
}
}
  }
