/**
 * App Backend: Enhanced ChatGPT
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Jonathan Pratte <https://jonathanpratte.com>
 * @public
 * This script sets up a Node.js server that uses the OpenAI API to connect to OpenAI's language model.
 */

//NPM packages: openai, express, bodyParser and cors.
const { Configuration, OpenAIApi } = require("openai");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require('fs');

/*
 * OpenAI key stored in an environment variable.
 */
let key = process.env.OPENAI_KEY; //store your key in the environment variable OPENAI_KEY='YourKey'.
let org = process.env.OPENAI_ORG; //store your key in the environment variable OPENAI_ORG='OrgKey'.
const configuration = new Configuration({
  organization: org,
  apiKey: key,
});

/* Creating an instance of the Express app using the required middlewares for incoming HTTP
 * requests data parsing and enabling CORS.
 * The server listens on port 3080.
 */
const openai = new OpenAIApi(configuration);
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
      const response = await openai.createImage({
        // Images prompt
        model:"dall-e-3",//Default dall-e-2 or dall-e-3.
        prompt: prompt,// Image description prompt.
        n: parseInt(n),// Number of images to create.
        size: size,//1024x1024, 1024x1792, 1792x1024.
        quality: quality,//Default standard or hd. set to hd.
        style: style,//Default vivid or natural.
        seed: seed,//Default 0 = random.
      });
      let imageURLs = response.data.data.map(
        (url) => "<img src='" + url.url + "' className='images'/>"
      );
      res.json({ message: imageURLs, usage: {} });
      addHistory(" " + imageURLs);
      //console.log("image urls = " + imageURLs);
    } else {
      const response = await openai.createChatCompletion({
        // Texts prompt
        model: model, //Default "gpt-4".
        messages: [{name:"John", role: "user", content: messages}],//Change to your name.
        temperature: Number(temperature),//Default 1.
        max_tokens: parseInt(maxTokens),//Default 32000.
        n: parseInt(n),// Number of messages to create.
        presence_penalty: Number(presencePenalty),//Default 0.
        frequency_penalty: Number(frequencyPenalty),//Default 0.
        seed: seed,//Default 0 = random to 2147483647.
      });
      let choices = response.data.choices
        ?.map((choice) => choice.message.content)
        .join("\n_________________________________")
        .trimStart();
      res.json({ message: choices, usage: response.data.usage });
      //console.log("reply messages = " + choices);
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
    const response = await openai.listModels();
    res.json({ models: response.data.data });
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
  fs.appendFile('./history.json', `${historyData}\n `, (err) => {
    if (err) throw err;
    console.log(err);
  });
}
