/**
 * App Backend: Enhanced ChatGPT
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Jonathan Pratte <https://jonathanpratte.com>
 * @public
 * This script sets up a Node.js server that uses the OpenAI API to connect to OpenAI's language model.
 */

// NPM packages: openai, express, bodyParser and cors.
const OpenAI = require("openai");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require('fs');
const path = require("path");
const speechFile = path.resolve("./speech.mp3");
/*
 * OpenAI key stored in an environment variable.
 */
let key = process.env.OPENAI_KEY; //store your key in the environment variable OPENAI_KEY='YourKey'.
let org = process.env.OPENAI_ORG; //store your key in the environment variable OPENAI_ORG='OrgKey'.

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
const port = 3080;

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
      generateSpeech("Here are some images for you.");
      addHistory( imageURLs + "\n" );
      console.log("images url = " + imageURLs); 
    } else {
      const response = await openai.chat.completions.create({
        // Texts prompt
        model: model, // Default "gpt-4".
        messages: [{name:"John", role: "user", content: messages}], //Change to your name.
        temperature: Number(temperature), // Default 1.
        max_tokens: parseInt(maxTokens), // Default 32000.
        n: parseInt(n), // Number of messages to create.
        presence_penalty: Number(presencePenalty), // Default 0. From -2 to 2
        frequency_penalty: Number(frequencyPenalty), // Default 0.From -2 to 2
        seed: seed // Default 0 = random to 2147483647.
      });
      let choices = response.choices
        ?.map((choice) => choice.message.content)
        .join("\n_________________________________")
        .trimStart();
      res.json({ message: choices, usage: response.usage });
      // console.log("reply messages = " + choices);
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
app.listen(port, () => {
  console.log(`app listen at http://localhost:${port}`);
});

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

async function generateSpeech(message) {
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: message,
    quality: "low",
  });
  //console.log(speechFile);

  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);

  // play the mp3 file using ffplay
  // fix code the audio to start from the beginning
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
