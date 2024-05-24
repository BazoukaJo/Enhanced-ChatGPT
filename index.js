const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const cache = new Map();

const USER_NAME = 'John';
const USER_ROLE = 'user';
const HTTP_PORT = 3080;
const IP_ADDRESS = '10.0.0.145';
const IMAGE_MODEL = 'dall-e-3';
const ANTHROPIC_MODEL = 'claude-3-opus-20240229';

let openai_key = process.env.OPENAI_KEY;
let org = process.env.OPENAI_ORG;

let claude_key = process.env.CLAUDE_KEY;

const anthropic = new Anthropic({
  apiKey: claude_key,
});

const openai = new OpenAI({
  organization: org,
  apiKey: openai_key,
});
const app = express();

app.use(bodyParser.json());
app.use(cors());

app.post('/', async (req, res) => {
  const {
    model,
    messages,
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
    if (prompt !== '') {
      const response = await openai.images.generate({
        model: IMAGE_MODEL,
        prompt: prompt,
        n: parseInt(n),
        size: size,
        quality: quality,
        style: style
      });
      let imageURLs = response.data.map((url) => url.url);
      res.json({ message: imageURLs });
    } else {
      if(model == ANTHROPIC_MODEL){
        response = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: parseInt(maxTokens),
          messages: [{ role: USER_ROLE, content: messages }],
        });
        let i = 1;
        console.log(response.content[0].text);
        res.json({ message: response.content[0].text, usage: response.usage });
      } else {
        response = await openai.chat.completions.create({
          model: model,
          messages: [{ name: USER_NAME, role: USER_ROLE, content: messages }],
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
        res.json({ message: choices, usage: response.usage });
      }
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
    quality: 'high',
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