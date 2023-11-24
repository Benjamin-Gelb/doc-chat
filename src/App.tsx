import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import openaiLogo from '/openai-logomark.svg'
import './App.css'

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

const Chat = () => {
  enum MessageTypes {
    AI = 'AIMessage',
    HUMAN = 'HumanMessage'
  }

  type ChatMessage = {
    type: MessageTypes,
    content: String
  }

  const [awaitingResponse, setAwaitingResponse] = useState(false)

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const chatbox = useRef<HTMLDivElement>(null)

  useEffect(()=> {
    chatbox.current?.scrollTo({top: chatbox.current.scrollHeight, behavior: 'smooth'})
  }, [messages])

  const Message = ({ type, content }: { type: MessageTypes, content: String }) => {
    return (
      <div className={`message ${type}`}>
        {content}
      </div>
    )
  }

  const ChatBox = ({ messages }: { messages: ChatMessage[] }) => {
    return (
      <div ref={chatbox} className='chat-box scrollbar'>
        {messages.map(message => <Message {...message} />)}
      </div>
    )
  }

  // const messages: ChatMessage[] = [
  //   {
  //     type: MessageTypes.HUMAN,
  //     content: 'Hi Im Benjamin.'
  //   },
  //   {
  //     type: MessageTypes.AI,
  //     content: 'Bet you like to goon, huh Ben?'
  //   },
  // ]

  return (
    <div className='chat '>
      <div className='chat-input'>
        <input className='fancy-text-input' type="text" value={message} onChange={(e) => {
          setMessage(e.target.value)
        }} />
        <button disabled={awaitingResponse} onClick={(e) => {
          setMessages(prev => prev.concat({
            type: MessageTypes.HUMAN,
            content: message
          })
          )
        }}>
          Ask
        </button>
      </div>
      <ChatBox messages={messages} />
    </div>
  )
}

type ServerResponse = {
  exists: boolean
  data: {
    documents: String[],
    conversation: String[]
  }
}

function App() {
  const [uploadedDocs, setUploadedDocs] = useState<String[]>([])
  const [notificationSignal, sendNotificationSignal] = useState('')

  function handleError(err: unknown) {
    sendNotificationSignal("There has been an error on the server, please try again.")
  }

  async function createSession() {
    const url = `${import.meta.env.VITE_LLM_SERVER}/session`
    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include'
      })
      console.log(response)
      const session: {
        exists: boolean
        data: any
      } = await response.json()
      console.log(session)
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
      const session: ServerResponse = await response.json()
      if (session.exists) {
        setUploadedDocs(session.data.documents)
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
    getSession()
  }, [])

  return (
    <>
      <Notification signal={notificationSignal} />
      <h1>Document-Chat</h1>
      <main style={{ display: 'flex' }}>
        <div>
          {/* <div>
          <a href="https://vitejs.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div> */}
          <div className='card'>
            <DocumentUpload uploadedDocs={uploadedDocs} setUploadedDocs={setUploadedDocs} />
          </div>
        </div>
        <div className='card'>
          <Chat />
        </div>
      </main>

    </>
  )
}

export default App
