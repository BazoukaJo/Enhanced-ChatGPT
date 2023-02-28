/**
 * App Backend: Enhhanced ChatGPT
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Jonathan Pratte <https://jonathanpratte.com>
 * @public
 * This script sets up a Node.js server that uses the OpenAI API to connect to OpenAI's language model.
 */

// Messages for display in case of connectivity or compatibility errors.
const ERROR_MESSAGE = "Connection Or Compatibility Error";

//NPM packages: openai, express, bodyParser and cors.
const { Configuration, OpenAIApi } = require("openai");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

/*
 * OpenAI key stored in an environment variable.
 */
let key = process.env.OPENAI_KEY; //store your key in the environement variable OPENAI_KEY='YourKey'.
const configuration = new Configuration({
  organization: "org-ZIGnH4RbSIOqCjHUzsSsMWA7",
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
    currentModel,
    message,
    temperature,
    maxTokens,
    bestOf,
    n,
    prompt,
    size,
  } = req.body;
  try {
    let response;
    console.log("prompt = "+prompt);
    if (prompt !== "") {
      response = await openai.createImage({
        // Images prompt
        prompt: prompt,
        n: n,
        size: size,
      });
      console.log(response.data);
      let imageURLs = response.data.data.map(
        (url) => "<img src='" + url.url + "' className='images' onload=''/>"
      );
      res.json({ message: imageURLs });
      console.log("message = "+imageURLs);
    } else {
      response = await openai.createCompletion({
        // Texts prompt
        model: `${currentModel}`, // "text-davinci-003",
        prompt: `${message}`,
        temperature: Number(`${temperature}`),
        max_tokens: parseInt(`${maxTokens}`),
        n: Number(`${n}`),
        best_of: Number(`${bestOf}`),
        stop: "\n",
      });
      let choices = response.data.choices
        ?.map((choice) => choice.text)
        .join("\n_________________________________")
        .trimStart();
      res.json({ message: choices });
      console.log("message = "+choices);
    }
  } catch (error) {
    res.json({ message: ERROR_MESSAGE });
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
    res.json({ message: ERROR_MESSAGE });
  }
});

/* Listening to the port 3080. */
app.listen(port, () => {
  console.log(`app listen at http://localhost:${port}`);
});
