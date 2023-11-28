import { MouseEventHandler, memo, useEffect, useMemo, useRef, useState } from 'react'
import openaiLogo from '/openai-logomark.svg'
import './App.css'

function getCookie(name: String) {
  var cookies = document.cookie;

  var prefix = name + "=";
  var start = cookies.indexOf("; " + prefix);

  // If the cookie is at the start of the string
  if (start == -1) {
    start = cookies.indexOf(prefix);
    if (start != 0) return null;
  } else {
    start += 2;
  }

  var end = cookies.indexOf(";", start);
  if (end == -1) {
    end = cookies.length;
  }

  return decodeURIComponent(cookies.substring(start + prefix.length, end));
}

const Spinner = ({ show, spin = true }: { show: Boolean, spin: Boolean }) => {
  if (!show) return <></>
  return (
    <div className={`spinner ${spin ? 'spin-animation' : ''}`}>
      <img src={openaiLogo} alt="OpenAI Logo" />
    </div>
  )
}


const DocumentUpload = ({ uploadedDocs, setUploadedDocs }: { uploadedDocs: String[], setUploadedDocs: React.Dispatch<React.SetStateAction<String[]>> }) => {
  const [stagedFiles, stageFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [customStyles, setCustomStyles] = useState({})

  function addFiles(files: FileList) {
    for (const file of files) {
      stageFiles(prev => prev.concat(file))
    }
  }

  async function uploadToServer(files: File[]) {
    const fd = new FormData()
    for (const file of files) {
      console.log(file)
      fd.append('files', file)
    }
    const url = `${import.meta.env.VITE_LLM_SERVER}/document`
    try {
      setLoading(true)
      const response = await fetch(url, {
        credentials: 'include',
        method: 'POST',
        body: fd,
      })
      const uploadResults: {
        documents: String[]
      } = await response.json()
      setUploadedDocs(prev => prev.concat(uploadResults.documents))
      stageFiles([])

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function clearDocuments() {
    const url = `${import.meta.env.VITE_LLM_SERVER}/document`
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (response.ok) {
        setUploadedDocs([])
        stageFiles([])
      }
      console.log(await response.text())
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (stagedFiles.length === 0) {
      return
    }
    uploadToServer(stagedFiles)
  }, [stagedFiles])

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ alignSelf: 'center' }}>
          <Spinner show={true} spin={loading} />
        </div>
      </div>
      <div className='card' >

        <h3 style={{ margin: '0.5rem' }}>Uploaded Documents:</h3>
        <div>
          {uploadedDocs.map((filename, i) => <div style={{ color: 'green' }} key={i}>{filename}</div>)}
          {stagedFiles.map((file, i) => <div key={i}>{file.name}</div>)}

        </div>

      </div>
      <div className='document-upload' style={customStyles} onDragOver={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setCustomStyles({
          border: "4px #B3FFFC dotted"
        })

      }} onDragLeave={(e) => {
        setCustomStyles({})
      }}
        onDrop={(e) => {
          e.preventDefault()
          setCustomStyles({})
          addFiles(e.dataTransfer.files)
        }}
      >
        <input accept='.pdf' onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          console.log(e)
          if (e.target.files) {
            addFiles(e.target.files)
          }
          e.target.value = ''
        }} ref={inputRef} type="file" hidden={true} />
        <button onClick={(e) => {
          inputRef.current?.click()
        }}>
          Upload
        </button>
        <h5>Or drag and drop.</h5>


        <button onClick={() => {
          clearDocuments()
        }}>
          Clear Documents
        </button>
      </div>
    </>
  )
}

const Notification = ({ signal }: { signal: string }) => {
  const [customStyles, setCustomStyles] = useState({
    opacity: 0
  })
  useEffect(() => {
    setCustomStyles({
      opacity: signal.length > 0 ? 1 : 0
    })
  }, [signal])
  return (
    <div className='notification' style={customStyles}>
      <p>
        {signal}
      </p>
      <button onClick={() => {
        setCustomStyles({
          opacity: 0
        })
      }}>
        Hide
      </button>
    </div>
  )
}

enum MessageTypes {
  AI = 'AIMessage',
  HUMAN = 'HumanMessage'
}

type ChatMessage = {
  type: MessageTypes,
  content: String
}

const Chat = ({ sessionMessages }: { sessionMessages: ChatMessage[] }) => {

  const [awaitingResponse, setAwaitingResponse] = useState(false)

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(sessionMessages)
  const chatbox = useRef<HTMLDivElement>(null)


  useEffect(() => {
    setMessages(sessionMessages)
  }, [sessionMessages])

  useEffect(() => {
    chatbox.current?.scrollTo({ top: chatbox.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const Message = ({ type, content }: { type: MessageTypes, content: String }) => {
    console.log('render');

    return (
      <div className={`message ${type}`}>
        {content.split('\n').map(newline => <div>{newline}</div>)}
      </div>
    )
  }

  const ChatBox = useMemo(() => (
    <div ref={chatbox} className='chat-box scrollbar'>
      {messages.map((message, i) => <Message key={i} {...message} />)}
    </div>
  ), [messages])


  const postMessage = async () => {
    if (message === '') return
    setMessages(prev => prev.concat({
      type: MessageTypes.HUMAN,
      content: message
    }))
    setMessage('')
    const url = `${import.meta.env.VITE_LLM_SERVER}/chat`

    const response = await fetch(url, {
      credentials: 'include',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: message
      })
    })
    if (!response.ok) {
      return
    }
    const aiMessage = await response.json()
    setMessages(prev => prev.concat(aiMessage))

  }


  const Preset = ({ title, content }: { title: String, content: string }) => {

    const postMessageDirect = async (message: string) => {
      if (message === '') return
      setMessages(prev => prev.concat({
        type: MessageTypes.HUMAN,
        content: message
      }))
      setMessage('')
      const url = `${import.meta.env.VITE_LLM_SERVER}/chat`

      const response = await fetch(url, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: message
        })
      })
      if (!response.ok) {
        return
      }
      const aiMessage = await response.json()
      setMessages(prev => prev.concat(aiMessage))

    }

    return (
      <button className='preset' onClick={async () => {
        postMessageDirect(content)
      }}>
        {title}
      </button>
    )
  }

  const presets = [
    { title: "Plaintiff Position", content: "What is the plaintiff's position" },
    { title: "Defendant Position", content: "What is the defendant's position?" },
    { title: "Case Summary", content: "Give me a summary of the case." },
    { title: "Party Demands", content: "What do the parties demand?" },
    { title: "Case Participants ", content: "Who are the case Participants?" },

  ]


  return (
    <div className='chat '>
      <div>
        {presets.map(preset => <Preset title={preset.title} content={preset.content} />)}
      </div>
      <div className='chat-input'>
        <input className='fancy-text-input' type="text" value={message} onChange={(e) => {
          setMessage(e.target.value)
        }} onKeyDown={(e) => {
          if (e.key === 'Enter') {
            postMessage()
          }
        }} />
        <button disabled={awaitingResponse} onClick={(e) => {
          postMessage()
        }}>
          Ask
        </button>
      </div>
      <>{ChatBox}</>
    </div>
  )
}

type ServerResponse = {
  exists: boolean
  sessions: [{
    documents: String[],
    conversation: String[]
  }]
}

function App() {
  const [uploadedDocs, setUploadedDocs] = useState<String[]>([])
  const [notificationSignal, sendNotificationSignal] = useState('')
  const [conversation, setConversation] = useState<ChatMessage[]>([])

  type Session = { documents: String[], conversation: ChatMessage[], sessionCookie: String }

  const [session, setSession] = useState<Session>({
    documents: [],
    conversation: [],
    sessionCookie: ''
  })

  function handleError(err: unknown) {
    sendNotificationSignal("There has been an error on the server, please try again.")
  }

  function setVisitor(sessions: Session[]) {
    const sessionCookie = getCookie('session-cookie')
    if (!sessionCookie) {
      // Session-Cookie is missing from Application Cache
      return registerVisitor()

    }
    const currentSession = sessions.filter(session => session.sessionCookie === sessionCookie)
    if (currentSession.length < 1) {
      //handle sessioncookie error
      console.log('session cookie error');

    }
    setSession(currentSession[0])
  }


  async function getVisitor() {
    const url = `${import.meta.env.VITE_LLM_SERVER}/visitor`
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      })
      if (!response.ok) {
        //handle
      }
      const visitor: {
        exists: Boolean
        sessions: Session[]
      } = await response.json();

      if (!visitor.exists) {
        registerVisitor()
      } else {
        setVisitor(visitor.sessions)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function registerVisitor() {
    const url = `${import.meta.env.VITE_LLM_SERVER}/visitor`
    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include'
      })
      if (!response.ok) {
        //handle
      }
      const visitor: {
        exists: Boolean
        sessions: Session[]
      } = await response.json();
      setVisitor(visitor.sessions)

    } catch (err) {
      console.error(err)
    }
  }



  async function createSession() {
    const url = `${import.meta.env.VITE_LLM_SERVER}/session`
    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include'
      })
      const visitor: { sessions: Session[] } = await response.json()
      console.log(visitor)
      setVisitor(visitor.sessions)

      // Do something with the session
    } catch (err) {
      handleError(err)
    }
  }

  async function getSession() {
    const url = `${import.meta.env.VITE_LLM_SERVER}/session`
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'

      })
      const sessionData: ServerResponse = await response.json()
      if (sessionData.exists) {
        setUploadedDocs(sessionData.sessions[0].documents)
      } else {
        createSession()
      }
    } catch (err) {
      handleError(err)
      console.error(err)
      //notify user if issue present with server
    }
  }


  useEffect(() => {
    getVisitor()
  }, [])

  useEffect(() => {
    console.log(session)
    setUploadedDocs(session.documents)
    setConversation(session.conversation)
  }, [session])

  return (
    <>
      <Notification signal={notificationSignal} />
      <h1>Document-Chat</h1>
      <main style={{ display: 'flex' }}>
        <div>

          <div className='card'>
            <DocumentUpload uploadedDocs={uploadedDocs} setUploadedDocs={setUploadedDocs} />
          </div>
          <div className='card'>
            <button onClick={createSession}>
              New Session
            </button>
          </div>
        </div>

        <div className='card'>
          <Chat sessionMessages={session.conversation} />
        </div>
      </main>

    </>
  )
}

export default App
