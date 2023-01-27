import './App.css';
import './normal.css';
import './prism.css';
import Prism from "prismjs";
import { useEffect, useState } from 'react';

/**
 * App frontend: Enanced ChatGPT
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Jonathan Pratte <https://jonathanpratte.com>
 * @public
 */
function App() {
  const MAX_TOKENS = parseInt(4096);
  const PLACE_HOLDER = "What is the answer to Life, the Universe, and Everything?";
  const DEFAULT_QUERY = "Ask me anything...";

  useEffect(() => {getEngines();}, []);
  const [input, setInput] = useState("");
  const [models, setModels] = useState([]);
  const [chatLog, setChatLog] = useState([{user:"gpt",  message :DEFAULT_QUERY}]);
  const [history, setHistory] = useState([{user:"gpt",  message :""}]);
  const [historyIndex , setHistoryIndex] = useState(0);
  const [currentModel, setCurrentModel] = useState("text-davinci-003");
  const [temperature, setTemperature] = useState(Number(0.5));
  const [maxTokens, setMaxTokens] = useState(parseInt(1000));
  const [n , setN] = useState(Number(1));
  const [best_of , setBest_of] = useState(Number(1));

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
  async function handleSubmit(e){
    e.preventDefault();
    let chatLogNew = [...chatLog];
    if (input !== "") {
      chatLogNew.push({ user: "user", message: `${input}` });
    } else {
      chatLogNew.push({ user: "user", message: PLACE_HOLDER });
    }
    const messages = chatLogNew.map((message) => message.message).join("\n");
    setChatLog(chatLogNew);
    setHistoryIndex(chatLogNew.length-1);
    setHistory(chatLogNew);
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
    // TODO: make the code syntax highlight
    console.log(data.message);
    //let html = Prism.highlight(data.message, Prism.languages.javascript, 'javascript')
    //setChatLog([...chatLogNew,{user:"gpt", message:`${html}`}]);
    setChatLog([...chatLogNew,{user:"gpt", message:`${data.message}`}]);
    // Scrool up
    setTimeout(function(){
      document.getElementsByClassName("chatbox")[0].scrollTo(0, document.getElementsByClassName("chat-log")[0].clientHeight);
    }, 200);
  }
  //###################### END Async Functions #######################

  function clearChat() {
    setChatLog([{user:"gpt",  message :`${DEFAULT_QUERY}`}])
  }

  function setTemp(numb){
      setTemperature(Number(numb));
  }

  function showLoader() {
    document.querySelector('.loader').style.visibility = "visible";
  }

  function hideLoader() {
    document.querySelector('.loader').style.visibility = "hidden";
  }

  function focusTheTextArea(){
    document.getElementsByClassName("chat-input-textarea")[0].focus();
  }

  //###################### History #######################
  /* Listening for keydown events key up and key down to cycle input history.*/
  let timer;
  let keyEventHandler = function(key) {
    clearTimeout(timer);
    timer = setTimeout(function(){
      if (key.keyCode === 40) {
        setInput(history.at(Math.min(Math.max(historyIndex + 1, 0), history.length-1)).message);
        setHistoryIndex(Math.min(Math.max(historyIndex + 1, 0), history.length-1));
      } else if (key.keyCode === 38) {
        setInput(history.at(Math.min(Math.max(historyIndex - 1, 0), history.length-1)).message);
        setHistoryIndex(Math.max(Math.min(historyIndex - 1, history.length-1), 0));
      }
    },0.001);
  };
  document.addEventListener("keydown", keyEventHandler);
  //###################### END History #######################

  //###################### Return HTML ########################
  /* The above code is a React component that renders the chatbot UI. */
  return (
    <div className="App">
      <aside className="sidemenu">
          <div className="side-menu-button" onClick={clearChat}>
            <span>+ </span>New Chat
          </div>
        <div className="models">
        <div className="tool-text">MODELS</div>
          <select className="model-slection" onChange={(e)=> {setCurrentModel(e.target.value); clearChat();}}>
            {models.map((model, index) => (
              <option key={model.id} value={model.id} selected={model.id === currentModel ? model.id : ""}>
                {model.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="tool-text">TEMPERATURE</div>
          <input  className="side-menu-button" type="number" max="1" min="0" rows="1" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
          <div className="side-menu-button-text" onClick={() => setTemp(0)}>0 - Logical</div>
          <div className="side-menu-button-text" onClick={() => setTemp(0.5)}>0.5 - Balanced</div>
          <div className="side-menu-button-text" onClick={() => setTemp(1)}>1 - Creative</div>
        </div>
        <div>
          <div className="tool-text">TOKENS</div>
          <input className="side-menu-button" type="number" max={MAX_TOKENS} min="0" rows="1" step="10" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />
        </div>
        <div>
          <div className="tool-text">COMPLETIONS</div>
          <input className="side-menu-button"  type="number" max="5" min="1" rows="1" step="1" value={n} onChange={(e) => {setN(e.target.value); setBest_of(e.target.value);}}/>
        </div>
      </aside>
      <section className="chatbox">
        <div className="chat-log">
          {chatLog.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
        </div>
        <div className="Chat-input-holder">
          <form onSubmit={handleSubmit}>
            <input className="chat-input-textarea" placeholder={PLACE_HOLDER} autoFocus rows="1" value={input} onChange={(e) => setInput(e.target.value)} />
            <button className='send-button' type="button" onClick={handleSubmit} tabIndex="-1" onFocus={focusTheTextArea}>
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg"><polygon points="4,6 22,18 4,30" fill="white" /></svg>
            </button>
          </form>
        </div>
      </section>
      <div className="loader">
        <svg width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth={1.5} className="h-6 w-6"><path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835A9.964 9.964 0 0 0 18.306.5a10.079 10.079 0 0 0-9.614 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 7.516 3.35 10.078 10.078 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.813ZM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.496ZM6.392 31.006a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744ZM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.01L7.04 23.856a7.504 7.504 0 0 1-2.743-10.237Zm27.658 6.437-9.724-5.615 3.367-1.943a.121.121 0 0 1 .113-.01l8.052 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.65-1.132Zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763Zm-21.063 6.929-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225Zm1.829-3.943 4.33-2.501 4.332 2.5v5l-4.331 2.5-4.331-2.5V18Z" fill="currentColor"/></svg>
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
            <svg width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth={1.5} className="h-6 w-6"><path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835A9.964 9.964 0 0 0 18.306.5a10.079 10.079 0 0 0-9.614 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 7.516 3.35 10.078 10.078 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.813ZM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.496ZM6.392 31.006a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744ZM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.01L7.04 23.856a7.504 7.504 0 0 1-2.743-10.237Zm27.658 6.437-9.724-5.615 3.367-1.943a.121.121 0 0 1 .113-.01l8.052 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.65-1.132Zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763Zm-21.063 6.929-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225Zm1.829-3.943 4.33-2.501 4.332 2.5v5l-4.331 2.5-4.331-2.5V18Z" fill="currentColor" /></svg>}
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
