/**
 * App Backend: Enhanced ChatGPT
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Jonathan Pratte <https://jonathanpratte.com>
 * @public
 * This script sets up a Node.js server that uses the OpenAI API to connect to OpenAI's language model.
 */

// Messages for display in case of connectivity or compatibility errors.
const ERROR_MESSAGE = "Generics Errors Message";

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
  } = req.body;
  console.log(req.body);
  addHistory(message.message);
  try {
    if (prompt !== "") {
      const response = await openai.createImage({
        // Images prompt
        model:"dall-e-3",
        prompt: prompt,
        n: parseInt(n),
        size: size,
      });
      let imageURLs = response.data.data.map(
        (url) => "<img src='" + url.url + "' className='images'/>"
      );
      res.json({ message: imageURLs, usage: {} });
      addHistory(" " + imageURLs);
      console.log("image urls = " + imageURLs);
    } else {
      const response = await openai.createChatCompletion({
        // Texts prompt
        model: model, // "gpt-4",
        messages: [{name:"John", role: "user", content: messages}],//Change to your name.
        temperature: Number(temperature),
        max_tokens: parseInt(maxTokens),
        n: parseInt(n),
        presence_penalty: Number(presencePenalty),
        frequency_penalty: Number(frequencyPenalty),
      });
      let choices = response.data.choices
        ?.map((choice) => choice.message.content)
        .join("\n_________________________________")
        .trimStart();
      res.json({ message: choices, usage: response.data.usage });
      console.log("reply messages = " + choices);
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
    ERROR_MESSAGE = error.message;
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
