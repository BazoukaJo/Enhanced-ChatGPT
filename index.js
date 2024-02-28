const OpenAI = require('openai');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const cache = new Map();
const USER_NAME = 'John';
const HTTP_PORT = 3080;
const IP_ADDRESS = '10.0.0.145';

let key = process.env.OPENAI_KEY;
let org = process.env.OPENAI_ORG;

const openai = new OpenAI({
  organization: org,
  apiKey: key,
});
const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use((_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.post('/', async (req, res) => {
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

  try {
    let audioData;

    if (prompt !== '') {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: parseInt(n),
        size: size,
        quality: quality,
        style: style,
        audioData: audioData
      });

      let imageURLs = response.data.map((url) => url.url);
      res.json({ message: imageURLs, audioData: audioData });
    } else {
      const response = await openai.chat.completions.create({
        model: model,
        messages: [{ name: USER_NAME, role: 'user', content: messages }],
        temperature: Number(temperature),
        max_tokens: parseInt(maxTokens),
        n: parseInt(n),
        presence_penalty: Number(presencePenalty),
        frequency_penalty: Number(frequencyPenalty),
        seed: seed
      });

      let i = 1;
      let choices = response.choices
        ?.map((choice) => (response.choices.length > 1 ? i++ + '- ' : '') + choice.message.content)
        .join('\n\n')
        .trimStart();

      res.json({ message: choices, usage: response.usage, audioData: audioData });
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

async function generateSpeech(message) {
  return cache.get(message) || cache.set(message, Buffer.from(await (await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'nova',
    input: message,
    quality: 'low',
  })).arrayBuffer())).get(message);
}

app.get('/generateSpeech', async (req, res) => {
  const message = req.query.message;
  const audioBuffer = await generateSpeech(message);
  res.set('Content-Type', 'audio/mpeg');
  res.send(audioBuffer);
});

app.get('/models', async (_, res) => {
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

app.listen(HTTP_PORT, () => {
  console.log(`app listen at http://${IP_ADDRESS}:${HTTP_PORT}`);
});