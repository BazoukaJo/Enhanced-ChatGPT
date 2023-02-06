import './App.css';
import './normal.css';
import React, { useState, useEffect } from 'react'
import { useSpeechSynthesis } from 'react-speech-kit';
const WindowsSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const mic = new WindowsSpeechRecognition();
mic.continuous = true;
mic.interimResults = true;
mic.lang = 'en-US';

/**
 * App Frontend: Enhanced ChatGPT
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Jonathan Pratte <https://jonathanpratte.com>
 * @public
 */
function App() {
  const MAX_TOKENS = parseInt(4096);
  const PLACE_HOLDER = "Question";
  const DEFAULT_QUERY = "Ask me anything...";
  const DEFAULT_MODEL = "text-davinci-003";

  const [input, setInput] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [models, setModels] = useState([]);
  const [chatLog, setChatLog] = useState([{user:"gpt",  message :DEFAULT_QUERY}]);
  const [currentModel, setCurrentModel] = useState(DEFAULT_MODEL);
  const [temperature, setTemperature] = useState(Number(0.5));
  const [maxTokens, setMaxTokens] = useState(parseInt(1000));
  const [n , setN] = useState(Number(1));
  const [best_of , setBest_of] = useState(Number(1));
  useEffect(() => {getEngines();}, []);
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line
  useEffect(() => {handleListen();}, [isListening]);
  const [isReading, setIsReading] = useState(false);
  // eslint-disable-next-line
  useEffect(() => {handleReading(`${chatLog[chatLog.length-1]?.message}`);}, [isReading]);
  const {speak, voices} = useSpeechSynthesis();

  //###################### Async Functions #######################
  /**
   * When the page loads, fetch the data from the server and then set the models state to the data that
   * was fetched.
   */
  async function getEngines(){
    fetch("http://localhost:3080/models")
    .then(res => res.json())
    .then(data => setModels(data.models))
  }

  /**
   * It takes the input from the user, sends it to the server, and then displays the response from the
   * server.
   * @param e - the event object
   */
  async function handleSubmit(){
    let chatLogNew = [...chatLog];
    if (input !== "") {
      chatLogNew.push({ user: "user", message: `${prefix + (prefix === "" ? "" : " ; ") + input + (suffix === "" ? "" : " ; ") + suffix}` });
    } else {
      chatLogNew.push({ user: "user", message: PLACE_HOLDER });
    }
    const messages = chatLogNew?.map((message) => message.message).join("\n");
    setChatLog(chatLogNew);
    setInput("");
    showLoader();
    // Scrool up
    setTimeout(function(){
      document.getElementsByClassName("chatbox")[0].scrollTo(0, document.getElementsByClassName("chat-log")[0].clientHeight);
    }, 2);
    const response = await fetch("http://localhost:3080/", {
      method:"POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({
        currentModel,
        message: messages,
        temperature:Number(temperature),
        maxTokens:parseInt(maxTokens),
        n:Number(n),
        best_of:Number(best_of),
        frequency_penalty:1.0,
      })
    });
    hideLoader();
    const data = await response.json();
    setChatLog([...chatLogNew,{user:"gpt", message:`${data.message}`}]);
    // Scrool up and read
    setTimeout(function(){
      document.getElementsByClassName("chatbox")[0].scrollTo(0, document.getElementsByClassName("chat-log")[0].clientHeight);
      handleReading(`${data.message}`);
    }, 200);
  }
  //###################### END Async Functions #######################

  function clearChat() {
    setChatLog([{user:"gpt",  message :`${DEFAULT_QUERY}`}])
  }

  function showLoader() {
    document.querySelector('.loader').style.visibility = "visible";
  }

  function hideLoader() {
    document.querySelector('.loader').style.visibility = "hidden";
  }

  function showRecorder() {
    document.querySelector('.recorder').style.visibility = "visible";
  }

  function hideRecorder() {
    document.querySelector('.recorder').style.visibility = "hidden";
  }

  function showMute() {
    document.querySelector('.mute').style.visibility = "visible";
    document.querySelector('.unmute').style.visibility = "hidden";
  }

  function hideMute() {
    document.querySelector('.mute').style.visibility = "hidden";
    document.querySelector('.unmute').style.visibility = "visible";
  }

  function focusTheTextArea(){
    document.getElementsByClassName("chat-input-textarea")[0].focus();
  }

  const handleListen = () => {
    if (isListening) {
      mic.start();
      mic.onend = () => {
        //console.log('continue..');
        mic.start();
      }
    } else {
      mic.stop()
      mic.onend = () => {
        //console.log('Mic off');
        handleSubmit();
        hideRecorder();
      }
    }
    mic.onstart = () => {
      //console.log('Mic on');
      showRecorder();
    }
    mic.onresult = event => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      setInput(transcript);
      mic.onerror = event => {
        //console.log(event.error);
      }
    }
  }

  const handleReading = (message) => {
    if (isReading) {
      //console.log(message);
      speak({text:message, voice: voices[2]});
      showMute();
    }
    else{
      //console.log("stopReading");
      speak({ text: '', stop: true });
      hideMute();
    }
  }

  function copyToClipboard(){
    document.getElementsByClassName("chat-input-textarea")[0].select();
    document.execCommand("copy");
  }

  //###################### Return HTML ########################
  /* The above code is a React component that renders the chatbot UI in HTML. */
  return (
    <div className="App">
      <aside className="sidemenu">
          <div className="side-menu-button" onClick={clearChat}>
            <span>+ </span>New Chat
          </div>
        <div className="models">
        <div className="tool-text">MODELS</div>
          <select className="model-slection" onChange={(e)=> {setCurrentModel(e.target.value); clearChat();}} value={DEFAULT_MODEL}>
            {models?.map((model, index) => (
              <option key={model.id} value={model.id}>
                {model.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="tool-text">TEMPERATURE</div>
          <input className="side-menu-button-input" type="number" max="1" min="0" rows="1" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
          <div className='min-max-infos'>0 - Logical&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Creative - 1</div>
        </div>
        <div>
          <div className="tool-text">TOKENS - Text Lenght</div>
          <input className="side-menu-button-input" type="number" max={MAX_TOKENS} min="10" rows="1" step="10" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />
          <div className='min-max-infos'>10 - Low&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;High - {MAX_TOKENS}</div>
        </div>
        <div>
          <div className="tool-text">COMPLETIONS</div>
          <input className="side-menu-button-input"  type="number" max="5" min="1" rows="1" step="1" value={n} onChange={(e) => {setN(e.target.value); setBest_of(e.target.value);}}/>
          <div className='min-max-infos'>1 -&nbsp;&nbsp;&nbsp;Number Of Answers&nbsp;&nbsp;&nbsp;- 5</div>
        </div>
      </aside>
      <section className="chatbox">
        <div className="chat-log">
          {chatLog?.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
        </div>
        <div className="Chat-input-holder">
          <form className="form1" onSubmit={handleSubmit}>
            <input className="chat-input-textarea-prefix" placeholder='Prefix' onChange={(e) => setPrefix(e.target.value)}/>
            <input className="chat-input-textarea" placeholder={PLACE_HOLDER} autoFocus rows="1" value={input} onChange={(e) => setInput(e.target.value)} />
            <input className="chat-input-textarea-suffix" placeholder='Suffix' onChange={(e) => setSuffix(e.target.value)}/>
            <button className='send-button' type="button" title="Send Prompt" onClick={handleSubmit} tabIndex="-1" onFocus={focusTheTextArea}>
              <svg width="16" height="27" fill="currentColor" viewBox="0 0 16 16"><path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z"/></svg>
            </button>
            <button className='record-voice-button' type="button" title="Record Voice"onClick={() => setIsListening(prevState => !prevState)}>
              <svg width="16" height="27" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/><path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/></svg>
              <div className="recorder">
                <svg height="24" width="24"><circle cx="12" cy="12" r="10" stroke="black" fill="red" /></svg>
              </div>
            </button>
            <button className="copy-button" title="Copy To Clipboard"onClick={() => copyToClipboard()}>
              <div>
                <svg width="16" height="16" fill="currentColor" viewBox="-2 -4 20 20"><path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
              </div>
            </button>
            <button className='read-button' title="AI Read Answer" type="button" onClick={() => setIsReading(prevState => !prevState)}>
              <div className="unmute">
                <svg width="20" height="20" fill="currentColor" viewBox="1.5 -1 16 16"><path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/><path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/><path d="M10.025 8a4.486 4.486 0 0 1-1.318 3.182L8 10.475A3.489 3.489 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.486 4.486 0 0 1 10.025 8zM7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12V4zM4.312 6.39 6 5.04v5.92L4.312 9.61A.5.5 0 0 0 4 9.5H2v-3h2a.5.5 0 0 0 .312-.11z"/></svg>
              </div>
              <div className="mute">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06zM6 5.04 4.312 6.39A.5.5 0 0 1 4 6.5H2v3h2a.5.5 0 0 1 .312.11L6 10.96V5.04zm7.854.606a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0z"/></svg>
              </div>
            </button>
          </form>
        </div>
      </section>
      <div className="loader">
        <svg width="40" height="40" fill="none" ><path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835A9.964 9.964 0 0 0 18.306.5a10.079 10.079 0 0 0-9.614 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 7.516 3.35 10.078 10.078 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.813ZM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.496ZM6.392 31.006a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744ZM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.01L7.04 23.856a7.504 7.504 0 0 1-2.743-10.237Zm27.658 6.437-9.724-5.615 3.367-1.943a.121.121 0 0 1 .113-.01l8.052 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.65-1.132Zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763Zm-21.063 6.929-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225Zm1.829-3.943 4.33-2.501 4.332 2.5v5l-4.331 2.5-4.331-2.5V18Z" fill="currentColor"/></svg>
      </div>
    </div>
  );}
  //###################### END Return HTML ########################

/**
 * @returns A React component that renders a div with a class of chat-message.
 */
const ChatMessage = ({message}) => {
  return (
    <div className={`chat-message ${message.user === "gpt" && "chatgpt"}`}>
      <div className="chat-message-center">
        <div className={`avatar ${message.user === "gpt" && "chatgpt"}`}>
          {message.user === "gpt" &&
            <svg width="40" height="40" fill="none" ><path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835A9.964 9.964 0 0 0 18.306.5a10.079 10.079 0 0 0-9.614 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 7.516 3.35 10.078 10.078 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.813ZM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.496ZM6.392 31.006a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744ZM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.01L7.04 23.856a7.504 7.504 0 0 1-2.743-10.237Zm27.658 6.437-9.724-5.615 3.367-1.943a.121.121 0 0 1 .113-.01l8.052 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.65-1.132Zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763Zm-21.063 6.929-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225Zm1.829-3.943 4.33-2.501 4.332 2.5v5l-4.331 2.5-4.331-2.5V18Z" fill="currentColor" /></svg>}
          {message.user === "user" &&
            <div className='you'>You</div>}
        </div>
        <div className='precode-box'>
          {message.user === "gpt" &&
            <pre><code className={'language-javascript'}><span className="highlight-message">{message.message}</span></code></pre>}
        </div>
        <div className='nocode-box'>
          {message.user === "user" &&
            <span className='simple-message'>{message.message}</span>}
        </div>
      </div>
    </div>
  );
}

export default App;
