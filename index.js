/**
 * App Backend: Enhanced ChatGPT
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Jonathan Pratte <https://jonathanpratte.com>
 * @public
 * This script sets up a Node.js server that uses the OpenAI API to connect to OpenAI's language model.
 */

// NPM packages: openai, express, bodyParser and cors.
const OpenAI = require('openai');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require("path");
const speechFile = path.resolve("./speech.mp3");

const USER_NAME = "John";// change your name here
const HTTP_PORT = "3080";// default 3080
const IP_ADDRESS = "10.0.0.145"; // default localhost. change to your network address range
/*
 * OpenAI key stored in an environment variable.
 */
let key = process.env.OPENAI_KEY; //store your key in the environment variable OPENAI_KEY='YourKey'.
let org = process.env.OPENAI_ORG; //store your key in the environment variable OPENAI_ORG='OrgKey'.

let isSpeaking = true;
/* Creating an instance of the Express app using the required middlewares for incoming HTTP
 * requests data parsing and enabling CORS.
 * The server listens on port 3080.
 */
const openai = new OpenAI({
  organization: org,
  apiKey: key,
});
const app = express();
app.use(bodyParser.json());
app.use(cors());

/* A POST request message to the server. */
app.post("/", async (req, res) => {
  const {
    model,
    messages,
    message,
    temperature,
    maxTokens,
    n,
    frequencyPenalty,
    presencePenalty,
    prompt,
    size,
    style,
    quality,
    seed
  } = req.body;
  //console.log(req.body);
  addHistory(message.message);
  try {
    if (prompt !== "") {
      console.log("prompt = " + prompt);
      const response = await openai.images.generate({
        // Images prompt
        model: "dall-e-3", // Default dall-e-2 or dall-e-3.
        prompt: prompt, // Image description prompt.
        n: parseInt(n), // Number of images to create.
        size: size, // 1024x1024, 1024x1792, 1792x1024.
        quality: quality, // Default standard or hd. set to hd.
        style: style, // Default vivid or natural.
      });
      let imageURLs = response.data.map((url) => "<img src='" + url.url + "' className='images'/>");
      res.json({ message: imageURLs });
      if(isSpeaking)
        generateSpeech(`Here is the image for you ${USER_NAME}.`);
      addHistory( imageURLs + "\n" );
      console.log("images url = " + imageURLs);
    } else {
      const response = await openai.chat.completions.create({
        // Texts prompt
        model: model, // Default "gpt-4".
        messages: [{name:USER_NAME, role: "user", content: messages}],
        temperature: Number(temperature), // Default 1.
        max_tokens: parseInt(maxTokens), // Default 32000.
        n: parseInt(n), // Number of messages to create.
        presence_penalty: Number(presencePenalty), // Default 0. From -2 to 2
        frequency_penalty: Number(frequencyPenalty), // Default 0.From -2 to 2
        seed: seed // Default 0 = random to 2147483647.
      });
      var i = 1;
      let choices = response.choices
        ?.map((choice) => (response.choices.length > 1 ? i++ + "- ": "") + choice.message.content)
        .join("\n\n")
        .trimStart();
      res.json({ message: choices, usage: response.usage });
      // console.log("reply messages = " + choices);
      if(isSpeaking)
        generateSpeech(choices);
      addHistory(choices);
    }
  } catch (error) {
    res.json({ message: error.message });
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
  }
});

/* A GET request the models from the server. */
app.get("/models", async (req, res) => {
  try {
    const response = await openai.models.list();
    res.json({ models: response.data });
  } catch (error) {
    res.json({ message: error.message });
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
  }
});

/* Listening to the port 3080. */
app.listen(HTTP_PORT, () => {
  console.log(`app listen at http://${IP_ADDRESS}:${HTTP_PORT}`);
});

// Add history to history.json
function addHistory(message){
  const currentDate = new Date().toLocaleString();
  const historyEntry = { message, date: currentDate };
  const historyData = JSON.stringify(historyEntry);
  fs.appendFile('./history.json', historyData + ',', (err) => {
    if (err) {
      console.error(err);
    }
  });
}

const cache = new Map();

// Generate speech from text
async function generateSpeech(message) {
  let buffer;
  if (cache.has(message)) {
    buffer = cache.get(message);
  } else {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "fable",
      input: message,
      quality: "low",
    });
    buffer = Buffer.from(await mp3.arrayBuffer());
    cache.set(message, buffer);
  }
  await fs.promises.writeFile(speechFile, buffer);
  const { exec } = require("child_process");
  exec("ffplay -nodisp -autoexit " + speechFile, (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
    }
    else if (stderr) {
      console.log(`stderr: ${stderr}`);
    }
  });
}

app.post('/Speak-button-clicked', (req, res) => {
  //console.log('Speak button clicked');
  isSpeaking = !isSpeaking;
  res.json({ message: 'Speak button clicked' });
});