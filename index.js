const CONNECTION_ERROR_MESSAGE = ":( The connection to the server failed. Press [+ New Chat], to retry if possible o7" ;
const COMPATIBILITY_ERROR_MESSAGE = ":( This model is not compatible with current setup. Please change the model o7"
const PREFIX = "";
const SUFIX = "\n\nafter you answers, write a justification and a brief explanation for your responses";
const { Configuration, OpenAIApi } = require("openai");
const express = require('express');
const bodyParser = require("body-parser");
const cors = require("cors");
let key = process.env.OPENAI_KEY;//store your key in the .env file, create it with OPENAI_KEY='YourKey' if don't exist.
const configuration = new Configuration({
    organization: "org-ZIGnH4RbSIOqCjHUzsSsMWA7",
    apiKey:key,
});
const openai = new OpenAIApi(configuration);
const app = express();
app.use(bodyParser.json());
app.use(cors());
const port = 3080;

/* A POST request message to the server. */
app.post('/', async (req, res) => {
    const {currentModel, message, temperature, maxTokens, best_of, n} = req.body;
    try {
        response = await openai.createCompletion({
            model: `${currentModel}`,// "text-davinci-003",
            prompt: `${PREFIX+message+SUFIX}`,
            temperature: Number(`${temperature}`),
            max_tokens: parseInt(`${maxTokens}`),
            n: Number(`${n}`),
            best_of: Number(`${best_of}`),
        });
        let choices = response.data.choices.map(choice => choice.text)
        .join('\n ________________________________________________________________________________\n')
        .trimStart().trimEnd()
        res.json({ message: choices });
    }
    catch(error){
        res.json({ message: COMPATIBILITY_ERROR_MESSAGE });
    }
});

/* A GET request the models from the server. */
app.get('/models', async (req, res) => {
    try {
        const response = await openai.listModels();
        res.json({models: response.data.data});
    }
    catch (error) {
        res.json({ message: CONNECTION_ERROR_MESSAGE });
    }
});

/* Listening to the port 3080. */
app.listen(port,() => {
    console.log(`app listen at http://localhost:${port}`);
});