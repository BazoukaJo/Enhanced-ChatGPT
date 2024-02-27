import "./App.css";
import "./normal.css";

import React, { useEffect, useState } from "react";

import Prism from 'prismjs';
import { marked } from 'marked';

/**
 * App Frontend: Enhanced ChatGPT
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Jonathan Pratte <https://jonathanpratte.com>
 * @public
 */

const speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const mic = new speechRecognition();
mic.continuous = true;
mic.interimResults = true;
mic.lang = "en-US";

function App() {

  // HTTP_PORT define the value of the port used by the server.
  const HTTP_PORT = "3080";

  // IP_ADDRESS define the value of the IP address used by the server.
  const IP_ADDRESS = "10.0.0.145"; //Default localhost

  // MAX_TOKENS defined as integer with a value assigned by parsing the result of "4096" to an integer.
  const MAX_TOKENS = "32768";

  // DEFAULT_TOKEN define the default max tokens.
  const DEFAULT_TOKEN = "4096";

  // DEFAULT_TEMPERATURE define the value of the default temperature.
  const DEFAULT_TEMPERATURE = 0.5;

  // SYSTEM_ROLE define the value of the default bot role.
  const SYSTEM_ROLE = "assistant";

  // USER_NAME define the value of the user name.
  const USER_NAME = "John";// Change your name here

  // BOT_NAME define the value of the bot name.
  const BOT_NAME = "Sage";// Change your name here

  // START_INSTRUCTION define the value of the default bot role.
  const START_INSTRUCTION = `I am ${BOT_NAME}, your dedicated personal assistant. Not only can I answer all your questions, but I can also generate images using DALL-E-3. To do so, simply start your prompt with 'imagine', leaving the prefix field blank.`;

  // DEFAULT_MODEL set to "gpt-4-1106-preview".
  const DEFAULT_MODEL = "gpt-4-turbo-preview";

  // DEFAULT_RESOLUTION set to image generation resolution
  const DEFAULT_RESOLUTION = "1024x1024";

  // DEFAULT_STYLE set to image generation resolution
  const DEFAULT_STYLE = "vivid";

  // DEFAULT_QUALITY set to image generation resolution
  const DEFAULT_QUALITY = "hd";

  // DEFAULT_SEED define the value of the Default seed = 0 = random.
  const DEFAULT_SEED = 0;

  const SEED_MAX = 2147483647;

  let controller;

  // declare input, prefix and suffix with state hook useState
  const [input, setInput] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");

  // Image resolution settings
  const resolutions = [
    { id: "1024x1024" },
    { id: "1024x1792" },
    { id: "1792x1024" },
  ];

  // Image realism settings
  const styles = [
    { id: "vivid" },
    { id: "natural" }
  ];

  // Side menu settings
  const SIDE_X_IN = "0px";
  const SIDE_X_OUT = "-140px";

  // Set current resolution with default value 'DEFAULT_RESOLUTION' using state hook useState
  const [currentResolution, setResolution] = useState(DEFAULT_RESOLUTION);

  // Set current style with default value 'DEFAULT_STYLE' using state hook useState
  const [currentStyle, setStyle] = useState(DEFAULT_STYLE);

  // Set current seed with default value 'DEFAULT_SEED' using state hook useState
  const [currentSeed, setSeed] = useState(DEFAULT_SEED);

  // models set with list of objects using state hook useState
  const [models, setModels] = useState([]);

  // chatLog set with state hook useState
  const [chatLog, setChatLog] = useState([{name:BOT_NAME, user:"gpt", role:SYSTEM_ROLE, message :START_INSTRUCTION, type:"string"}]);

  // History set with state hook useState
  const [history] = useState([]);

  // Set currentModel with default value 'DEFAULT_MODEL' using state hook useState
  const [currentModel, setCurrentModel] = useState(DEFAULT_MODEL);

  // Set History Index to cycle trough history
  const [historyIndex, setHistoryIndex] = useState(0);

  // temperature is set with state hook with 0.5 as the initial value
  const [temperature, setTemperature] = useState(Number(DEFAULT_TEMPERATURE));

  // maxTokens is set with state hook with 100 parsed to an integer as the initial value
  const [maxTokens, setMaxTokens] = useState(parseInt(DEFAULT_TOKEN));

  // declare 'n' with state hook with 1 as initial value
  const [n, setN] = useState(1);

  // declare 'bestOf' with state hook with 1 as initial value
  const [bestOf, setBestOf] = useState(1);

  // declare 'presencePenalty' with state hook with 0 as initial value
  const [presencePenalty, setPresencePenalty] = useState(0);

  // declare 'frequencyPenalty' with state hook with 0 as initial value
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);

  // call getEngines() once when component is mounted
  // eslint-disable-next-line
  useEffect(() => {getEngines();}, []);

  // declare isListening as false with state hook, toggle when handleListen() called
  const [isListening, setIsTranscribing] = useState(false);

  // eslint-disable-next-line
  useEffect(() => {handleTranscriptSpeech();}, [isListening]);

  // declare isReading as false with state hook toggle botIsReading() when called
  const [isSpeaking, toggleButtonSpeak] = useState(true);

  // eslint-disable-next-line
  useEffect(() => {handleReadingButton();}, [isSpeaking]);

  //###################### Async Functions #######################
  /**
   * When the page loads, fetch the data from the server and then set the models state to the data that
   * was fetched.
   */
  async function getEngines() {
    try {
        const response = await fetch(`http://${IP_ADDRESS}:${HTTP_PORT}/models`);
        const data = await response.json();
        const filteredModels = data.models.filter((item) => item.id.startsWith("gpt"));
        setModels(filteredModels);
    } catch (error) {
        console.log('Error fetching models:', error);
        showWarning('Error fetching models:' + error);
    }
    setTimeout(() => {document.getElementsByClassName("App")[0].style.left = SIDE_X_OUT;}, 4000);
  }
  /**
   * This code is a messaging platform where a user can chat with a chatbot powered by OpenAI's language model.
   * A copy of current chatlog, chatLog, is made and assigned to chatLogNew.
   * If the input value is not an empty string, a new message object is created and added to chatLogNew
   * The messages are mapped to their respective messages and joined into a single text string.
   * The updated chatLog & an empty input value is set in state.
   * showLoader() is called to indicate that some processing is happening.
   * After calling the function to scroll up the chatlog window, a post request is made to a locally hosted endpoint with certain parameters to get a response from the GPT language model.
   * The data received from the post request is processed & then a update to the chatlog with the latest informative message from "gpt" is added.
   * Finally, the UI is scrolled up to show the latest message. The loader is hidden. If there is an error, it is logged.
   * After 3000 milliseconds delay. The loader is hidden. This is to ensure that the loader is visible for at least 3 seconds.
   */
  async function handleSubmitPrompt() {
    if (input === "" && suffix === "" && prefix === "") return;
    //Pre request
    let chatLogNew = [...chatLog];
    let currentMessage = {
      name: USER_NAME,
      user: "user",
      role:"user",
      message: `${prefix + (prefix === "" ? "" : ".\n") + input + (suffix === "" ? "" : ".\n") + suffix + "."}`, type: "string"};
    chatLogNew.push(currentMessage);
    history.push({ message: input });
    setChatLog(chatLogNew);
    const messages = chatLogNew?.map((message) => message.message.startsWith("<img ") ? message.message.match(/<img src='(.*?)' className='images'\/>/)[1] : message.message ).join("\n");
    setInput("");
    showLoader();
    // Scroll down
    setTimeout(function() { document.getElementsByClassName("chatbox")[0].scrollTo(0, document.getElementsByClassName("chat-log")[0].clientHeight);}, 2);

    // look for the word imagine to define the image prompt.
    let currentPrompt =
    chatLogNew[chatLogNew.length - 1]
      ?.message.toLowerCase().substring(0, 7) === "imagine"
      ? chatLogNew[chatLogNew.length - 1]?.message
      : "";
    // Assign a new AbortController to controller
    controller = new AbortController();
    const signal = controller.signal;
    // Post request
    const response = await fetch(`http://${IP_ADDRESS}:${HTTP_PORT}/`, {
      method: "POST",
      headers: { "content-type": "application/json","Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        model: currentModel,
        messages: messages,
        message: currentMessage,
        temperature: temperature,
        maxTokens: maxTokens,
        n: n,
        frequencyPenalty: frequencyPenalty,
        presencePenalty: presencePenalty,
        prompt: currentPrompt,
        size: currentResolution,
        bestOf: bestOf,
        style: currentStyle,
        quality: DEFAULT_QUALITY,
        seed: currentSeed
      }),
      signal: signal
    });

    const data = await response.json();
    if (data.error && data.error !== "") {
      showWarning("response error "+data.error);
    } else {
    if (currentPrompt !== ""){
      setUsages("");
      setChatLog([
        ...chatLogNew,
        { name:BOT_NAME, user: "gpt", role:SYSTEM_ROLE, message: "<img src='" + data.message + "' className='images'/>", type: "image" },
      ]);
      playResponse(`Here is the image for you ${USER_NAME}.`);
    } else {
      setUsages(data.usage);
      setChatLog([
        ...chatLogNew,
        { name:BOT_NAME, user: "gpt", role:SYSTEM_ROLE, message: data.message, type: "string" },
      ]);
      playResponse(data.message);
    }
    // Scroll down
    setTimeout(function() {document.getElementsByClassName("chatbox")[0].scrollTo( 0, document.getElementsByClassName("chat-log")[0].clientHeight);}, 200);}
    hideLoader();
  }

  // Stop request to GPT
  function handleStopController(){
    controller.abort();
    hideLoader();
  }

  async function playResponse(message) {
    if (!isSpeaking)
      return;
    try {
      const response = await fetch(`http://${IP_ADDRESS}:${HTTP_PORT}/generateSpeech?message=${encodeURIComponent(message)}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const audioBlob = await response.blob();
      if (!audioBlob.type.startsWith('audio/')) {
        console.error('The fetched blob is not an audio file');
        return;
      }
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play().catch(function(error) {
        console.log('Failed to play audio: ', error);
      });
    } catch (error) {
      console.error('There has been a problem with your fetch audio response operation: ', error);
    }
  }

  /*
   * This code is a function that handles listening with a microphone.
   * It checks if the microphone is listening, and if it is, it starts the microphone and sets an 'onend' event listener.
   * If the microphone is not listening, it stops the microphone and sets an 'onend' event listener.
   * It also sets an 'onstart' event listener which shows the recorder, and an 'onresult'
   * event listener which sets the input to the transcript of what was said. Finally, it sets an 'onerror' event listener which logs any errors that occur.
   */
  const handleTranscriptSpeech = () => {
    if (isListening) {
      mic.start();
      mic.onend = () => {
        mic.start();
      };
    } else {
      mic.stop();
      mic.onend = () => {
        //console.log('Mic off');
        handleSubmitPrompt();
        hideRecorder();
      };
    }
    mic.onstart = () => {
      //console.log('Mic on');
      showRecorder();
    };
    mic.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join("");
      setInput(transcript);
      mic.onerror = (event) => {
        console.log(event.error);
        showWarning(event.error);
      };
    };
  };

  const handleReadingButton = () => {
    if (isSpeaking) {
      hideMute();
    } else {
      showMute();
    }
  };

  // show warning in flashing red
  function showWarning(error){
    document.getElementsByClassName("errors")[0].innerHTML = error;
    setTimeout(function() {document.getElementsByClassName("errors")[0].innerHTML = "";}, 4000);
  }
  /*
   * function to clear the chat messages
   * set chatLog to an array with one object containing nothing
   */
  function clearChat() {
    setChatLog([{name:"GPT", user:"gpt", role:SYSTEM_ROLE, message:START_INSTRUCTION, type:"string"}]);
    setUsages("");
  }

  /*
   * This code is a function that will show a loader.
   * The function first sets the visibility of the element with the class 'loader' to visible.
   */
  function showLoader() {
    document.querySelector(".loader").style.visibility = "visible";
    document.querySelector(".stop-button").style.visibility = "visible";
  }

  /*
   * This function hides the loader.
   * It uses document.querySelector() to select elements with the class 'loader'
   */
  function hideLoader() {
    document.querySelector(".loader").style.visibility = "hidden";
    document.querySelector(".stop-button").style.visibility = "hidden";
  }

  /*
   * This function shows the recorder by making it visible. It uses the document.
   * querySelector() method to select the element with the class of 'recorder' and then sets its
   * style.visibility property to "visible".
   */
  function showRecorder() {
    document.querySelector(".recorder").style.visibility = "visible";
  }

  /*
   * This function hides an element with the class of "recorder" by changing its visibility to "hidden".
   * It uses the querySelector() method to select the element and then sets its
   * style.visibility property to "hidden".
   */
  function hideRecorder() {
    document.querySelector(".recorder").style.visibility = "hidden";
  }

  /*
   * This function hides or shows an element with the class of "mute" and "unmute" by changing its visibility to "hidden" or "visible".
   * It uses the querySelector() method to select the element and then sets its
   * style.visibility property to "hidden" or "visible".
   */
  function showMute() {
    document.querySelector(".mute").style.visibility = "visible";
    document.querySelector(".unmute").style.visibility = "hidden";
  }

  /*
   * This function hides or shows an element with the class of "mute" and "unmute" by changing its visibility to "hidden" or "visible".
   * It uses the querySelector() method to select the element and then sets its
   * style.visibility property to "hidden" or "visible".
   */
  function hideMute() {
    document.querySelector(".mute").style.visibility = "hidden";
    document.querySelector(".unmute").style.visibility = "visible";
  }

  /*
   * This function focuses the text area element with the class name "chat-input-textarea".
   * It uses the getElementsByClassName() method to select the element and then calls the focus() method on it.
   */
  function focusTheTextArea() {
    document.getElementsByClassName("chat-input-textarea")[0].focus();
  }

  // This function will handle Delete Home, End, Up and Down key press
  let keyTimer;
  let keyEventHandler = function(event) {
    clearTimeout(keyTimer);
    keyTimer = setTimeout(function() {
      //console(event.keyCode);
      if (event.keyCode === 38) {
        //Up key, cycle history in text input
        if(isPrefixFocus())
          cycleHistory(-1);
      } else if (event.keyCode === 40) {
        //Down key, cycle history in text input
        if(isPrefixFocus())
          cycleHistory(1);
      } else if (event.keyCode === 36) {
        //End key, toggle GPT read the text
        setIsTranscribing((prevState) => !prevState);
      } else if (event.keyCode === 35) {
        //Home key, toggle speak to GPT
        toggleButtonSpeak((prevState) => !prevState);
      } else if (event.keyCode === 46) {
        //Delete key, new prompt
        clearChat();
      }
    }, 0.0001);
  };
  document.addEventListener("keydown", keyEventHandler);

  let mouseOutTimer;
  let chatbox = document.getElementsByClassName("chatbox")[0];
  let chatPost = document.getElementsByClassName("chat-message-center")[0];
  document.addEventListener("mouseout", function(event) {
    if (event.target.id === "sidemenu" && (event.relatedTarget === chatbox || event.relatedTarget === chatPost || event.relatedTarget === null)) {
      clearTimeout(mouseOutTimer);
      mouseOutTimer = setTimeout(function() {document.getElementsByClassName("App")[0].style.left = SIDE_X_OUT;}, 4000);
    }
  });

  // Add an event listener for 'mouseover' events for the "sidemenu".
  document.addEventListener("mouseover", function(event) {
    if ((event.target.id === "sidemenu" && (event.relatedTarget === chatbox || event.relatedTarget === chatPost || event.relatedTarget === null))
    || (event.target.id === "" && event.relatedTarget === null)
    ) {
      clearTimeout(mouseOutTimer);
      document.getElementsByClassName("App")[0].style.left = SIDE_X_IN;
    }
  });

  function isPrefixFocus(){
    return document.activeElement === document.getElementsByClassName("chat-input-textarea-prefix")[0];
  }

  // This function cycle through history display in the prefix text.
  function cycleHistory(index) {
    let nextIndex = historyIndex + index;
    if (nextIndex < 0) {
      nextIndex = 0;
    } else if (nextIndex > history.length - 1) {
      nextIndex = history.length - 1;
    }
    setHistoryIndex(nextIndex);
    setPrefix(history[nextIndex]?.message);
  }

  // This function change the height of the textarea to fit the content.
  function changeTextareaHeight() {
    document.getElementsByClassName("chat-input-textarea")[0].style.height = "auto";
    document.getElementsByClassName("chat-input-textarea")[0].style.height =
      document.getElementsByClassName("chat-input-textarea")[0].scrollHeight + "px";
  }

  //this function will return the the tokens infos and show it.
  function setUsages(usage){
    document.getElementsByClassName("usage")[0].innerHTML = usage && usage !== "" ? "Prompt Tokens : " + usage.prompt_tokens + " | Completion Tokens : " + usage.completion_tokens + " | Total Tokens : " + usage.total_tokens : "";
  }

  function colorSyntaxWithPrism(html) {
    //return Prism.highlight(html, "language-javascript");
    return html;
  }

  function convertAndHighlightMarkdown(message) {
    let html = marked.parse(message.message);
    let colorSyntaxCode = colorSyntaxWithPrism(html);
    return colorSyntaxCode;
  }

  //###################### Return HTML ########################
  /* The above code is a React component that renders the chatbot UI in HTML. */
  return (
    <div className="App">
      <audio id="audio-player" src="/speech.mp3" type="audio/mpeg"></audio>
      <aside className="sidemenu" id="sidemenu">
        <div
          className="side-menu-button"
          onClick={(e) => {clearChat(); focusTheTextArea();}}
          title="Copy Input To Clipboard"
        >
          <span>+ </span>New Prompts
        </div>
        <div className="models">
          <div className="tool-text">MODELS</div>
          <select
            title="Model Selection"
            className="model-selection"
            onChange={(e) => {setCurrentModel(e.target.value); clearChat();}}
            value={currentModel}
          >
            {models?.map((model, index) => (
              <option key={model.id} value={model.id}>
                {model.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="tool-text">TEMPERATURE</div>
          <input
            title="TEMPERATURE"
            className="side-menu-button-input"
            onChange={(e) => setTemperature(e.target.value)}
            value={temperature}
            type="number"
            max="1"
            min="0"
            rows="1"
            step="0.1"
          />
        </div>
        <div>
          <div className="tool-text">TOKENS</div>
          <input
            title="MAX TOKENS"
            className="side-menu-button-input"
            onChange={(e) => setMaxTokens(e.target.value)}
            type="number"
            max={MAX_TOKENS}
            min="10"
            rows="1"
            step="10"
            value={maxTokens}
          />
        </div>
        <div>
          <div className="tool-text">SEED</div>
          <input
            title="SEED"
            className="side-menu-button-input"
            onChange={(e) => {setSeed(e.target.value);}}
            type="number"
            max={SEED_MAX}
            min="-1"
            rows="1"
            step="1"
            value={currentSeed}
          />
        </div>
        <div>
          <div className="tool-text">PRESENCE</div>
          <input
            title="PRESENCE PENALTY"
            className="side-menu-button-input"
            onChange={(e) => {setPresencePenalty(e.target.value);}}
            type="number"
            max="2"
            min="-2"
            rows="1"
            step="0.1"
            value={presencePenalty}
          />
        </div>
        <div>
          <div className="tool-text">FREQUENCY</div>
          <input
            title="FREQUENCY PENALTY"
            className="side-menu-button-input"
            onChange={(e) => {setFrequencyPenalty(e.target.value);}}
            type="number"
            max="2"
            min="-2"
            rows="1"
            step="0.1"
            value={frequencyPenalty}
          />
        </div>
        <div>
          <div className="tool-text">#COMPLETIONS</div>
          <input
            title="COMPLETIONS"
            className="side-menu-button-input"
            onChange={(e) => {setN(e.target.value); setBestOf(e.target.value);}}
            type="number"
            max="10"
            min="1"
            rows="1"
            step="1"
            value={n}
          />
        </div>
        <div>
          <div className="tool-text">RESOLUTION</div>
          <select
            title="RESOLUTION"
            className="selection"
            onChange={(e) => {setResolution(e.target.value);}}
            value={currentResolution}
          >
            {resolutions?.map((resolution, index) => (
              <option key={resolution.id} value={resolution.id}>
                {resolution.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="tool-text">STYLE</div>
          <select
            title="STYLE"
            className="selection"
            onChange={(e) => {setStyle(e.target.value);}}
            value={currentStyle}
          >
            {styles?.map((style, index) => (
              <option key={style.id} value={style.id}>
                {style.id}
              </option>
            ))}
          </select>
        </div>
      </aside>
      <section className="chatbox">
        <div className="chat-log">
          {chatLog?.map((message, index) => (<ChatMessage key={index} message={message} htmlMessage={convertAndHighlightMarkdown(message)}/>))}
        </div>
        <div className="chat-input-holder">
          <div
            className="form1"
            onKeyDown={(e) => {!e.getModifierState("Shift") && e.keyCode === 13 && handleSubmitPrompt() && e.preventDefault();}}
            onInput={(e) => {changeTextareaHeight()}}
          >
            <textarea
              type="text"
              className="chat-input-textarea"
              onChange={(e) => {setInput(e.target.value);}}
              placeholder="Prompt"
              autoFocus
              rows="1"
              value={input}
            />
          </div>
          <input
            className="chat-input-textarea-prefix"
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="Prefix And History"
            value={prefix}
          />
          <input
            className="chat-input-textarea-suffix"
            onChange={(e) => setSuffix(e.target.value)}
            placeholder="Suffix"
            value={suffix}
          />
          <button
            className="send-button"
            onClick={() => {handleSubmitPrompt();}}
            tabIndex="-1"
            onFocus={() => {focusTheTextArea();}}
            type="button"
            title="Send Prompt to GPT"
          >
            <svg width="16" height="27" fill="currentColor" viewBox="0 0 16 16">
              <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z" />
            </svg>
          </button>
          <button
            className="stop-button"
            onClick={() => {handleStopController();}}
            tabIndex="-1"
            onFocus={() => {focusTheTextArea();}}
            type="button"
            title="Stop request to GPT"
          >
            <svg fill="#ffffff" viewBox="10 0 240 200" id="Flat" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="stop" strokeWidth="0"></g><g id="stop" strokeLinecap="round" strokeLinejoin="round"></g><g id="stop"> 
              <path d="M212,58.90918V197.09082A14.92639,14.92639,0,0,1,197.09082,212H58.90918A14.92639,14.92639,0,0,1,44,197.09082V58.90918A14.92607,14.92607,0,0,1,58.90918,44H197.09082A14.92607,14.92607,0,0,1,212,58.90918Z"></path> </g>
            </svg>
          </button>
          <button
            className="record-voice-button"
            onClick={() => setIsTranscribing((prevState) => !prevState)}
            type="button"
            title="Record Voice To Prompt - Shortcut : Home"
          >
            <svg width="16" height="27" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z" />
              <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z" />
            </svg>
            <div className="recorder">
              <svg height="24" width="24">
                <circle cx="12" cy="12" r="10" stroke="black" fill="red" />
              </svg>
            </div>
          </button>
          <button
            className="copy-button"
            onClick={() => {navigator.clipboard.writeText(document.getElementsByClassName("chat-input-textarea")[0].value);
            }}
            title="Copy Input To Clipboard"
          >
            <div>
              <svg
                width="18"
                height="18"
                fill="currentColor"
                viewBox="0 -1 16 17"
              >
                <path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z" />
                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
              </svg>
            </div>
          </button>
          <button
            className="read-button"
            onClick={() => { toggleButtonSpeak((prevState) => !prevState); }}
            title="Answers Read By AI - Shortcut : End"
            type="button"
          >
            <div className="unmute">
              <svg
                width="20"
                height="20"
                fill="currentColor"
                viewBox="1.5 -1 16 16"
              >
                <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z" />
                <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z" />
                <path d="M10.025 8a4.486 4.486 0 0 1-1.318 3.182L8 10.475A3.489 3.489 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.486 4.486 0 0 1 10.025 8zM7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12V4zM4.312 6.39 6 5.04v5.92L4.312 9.61A.5.5 0 0 0 4 9.5H2v-3h2a.5.5 0 0 0 .312-.11z" />
              </svg>
            </div>
            <div className="mute">
              <svg
                width="20"
                height="20"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06zM6 5.04 4.312 6.39A.5.5 0 0 1 4 6.5H2v3h2a.5.5 0 0 1 .312.11L6 10.96V5.04zm7.854.606a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0z" />
              </svg>
            </div>
          </button>
          <div className="errors"></div>
          <div className="usage"></div>
          <button
            className="clear-button"
            onClick={() => {setInput("");}}
            onFocus={() => {focusTheTextArea();}}
            type="button"
            title="Clear Input"
          >
            <svg
              width="19"
              height="20"
              fill="currentColor"
              viewBox="-2 -4 20 20"
            >
              <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
          <button
            className="clear-button-prefix"
            onClick={() => {setPrefix("");}}
            onFocus={() => {focusTheTextArea();}}
            type="button"
            title="Clear Prefix"
          >
            <svg
              width="19"
              height="20"
              fill="currentColor"
              viewBox="-2 -4 20 20"
            >
              <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
          <button
            className="clear-button-suffix"
            onClick={() => {setSuffix("");}}
            onFocus={() => {focusTheTextArea();}}
            type="button"
            title="Clear Suffix"
          >
            <svg
              width="19"
              height="20"
              fill="currentColor"
              viewBox="-2 -4 20 20"
            >
              <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
        </div>
      </section>
      <div className="loader">
        <svg width="40" height="40" fill="none">
          <path
            d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835A9.964 9.964 0 0 0 18.306.5a10.079 10.079 0 0 0-9.614 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 7.516 3.35 10.078 10.078 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.813ZM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.496ZM6.392 31.006a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744ZM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.01L7.04 23.856a7.504 7.504 0 0 1-2.743-10.237Zm27.658 6.437-9.724-5.615 3.367-1.943a.121.121 0 0 1 .113-.01l8.052 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.65-1.132Zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763Zm-21.063 6.929-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225Zm1.829-3.943 4.33-2.501 4.332 2.5v5l-4.331 2.5-4.331-2.5V18Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  );
}
//###################### END Return HTML ########################

/**
 * @returns A React component that renders a div with a class of chat-message.
 */
const ChatMessage = ({ message, htmlMessage }) => {
  return (
    <div className={`chat-message ${message.user === "gpt" && "chatgpt"}`}>
      <div className="chat-message-center">
        <div className={`avatar ${message.user === "gpt" && "chatgpt"}`}>
          {message.user === "gpt" && (
            <svg width="40" height="40" fill="none">
              <path
                d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835A9.964 9.964 0 0 0 18.306.5a10.079 10.079 0 0 0-9.614 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 7.516 3.35 10.078 10.078 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.813ZM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.496ZM6.392 31.006a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744ZM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.01L7.04 23.856a7.504 7.504 0 0 1-2.743-10.237Zm27.658 6.437-9.724-5.615 3.367-1.943a.121.121 0 0 1 .113-.01l8.052 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.65-1.132Zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763Zm-21.063 6.929-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225Zm1.829-3.943 4.33-2.501 4.332 2.5v5l-4.331 2.5-4.331-2.5V18Z"
                fill="currentColor"
              />
            </svg>
          )}
          {message.user === "user" && <div className="you">ME</div>}
        </div>
        { message.user !== "user" && <div className="gpt-box">
          {message.user === "gpt" && message.type === "image" && (
            <span
              className="gpt-message"
              dangerouslySetInnerHTML={{ __html: htmlMessage }}
            ></span>
          )}
          {message.user === "gpt" && message.type === "string" && (
            <span
            className="gpt-message"
            dangerouslySetInnerHTML={{ __html: htmlMessage }}
          ></span>
          )}
        </div>}
        {message.user !== "gpt" && <div className="user-box">
          {message.user === "user" && (
            <span className="user-message">{message.message}</span>
          )}
        </div>}
        <button
          title="Copy Message To Clipboard"
          className="copy-current-button"
          onClick={() => {navigator.clipboard.writeText(message.message);}}
        >
          <svg width="16" height="16" fill="currentColor" viewBox="1 -3 19 19">
            <path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z" />
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default App;
