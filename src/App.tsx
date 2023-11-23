import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import openaiLogo from '/openai-logomark.svg'
import './App.css'

const Spinner = ({ show }: { show: Boolean }) => {
  if (!show) return <></>
  return (
    <div className='spinner'>
      <img src={openaiLogo} alt="OpenAI Logo" />
    </div>
  )
}

const DocumentUpload = () => {
  const [stagedFiles, stageFiles] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<String[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const [customStyles, setCustomStyles] = useState({})
  console.log(stagedFiles)

  function addFiles(files: FileList) {
    for (const file of files) {
      stageFiles(prev => prev.concat(file))
    }
  }

  async function uploadToServer(files: File[]) {
    const fd = new FormData()
    for(const file of files) {
      fd.append('files', file)
    }
    const url = `${import.meta.env.VITE_LLM_SERVER}/document`
    try {
      const response = await fetch(url, {
        credentials: 'include',
        method: 'POST',
        body: fd,
      })
      const uploadResults: {
        documents: String[]
      } = await response.json()
      setUploadedFiles(prev => prev.concat(uploadResults.documents))
      stageFiles([])

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
    <div className='document-upload' style={customStyles} onDragOver={(e) => {
      e.stopPropagation();
      e.preventDefault();

      setCustomStyles({
        border: "4px #B3FFFC solid"
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
      <input onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
          addFiles(e.target.files)
        }
      }} ref={inputRef} type="file" hidden={true} />
      <button onClick={(e) => {
        inputRef.current?.click()
      }}>
        Upload
      </button>
      <div>
        {stagedFiles.map((file, i) => <div key={i}>{file.name}</div>)}
        {uploadedFiles.map((filename, i) => <div style={{color: 'green'}} key={i}>{filename}</div>)}
      </div>
      <button onClick={() => setFiles([])}>
        Clear Documents
      </button>
    </div>
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



function App() {
  const [count, setCount] = useState(0)
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
      const session: {
        exists: boolean
        data: any
      } = await response.json()

      console.log(session)

      if (session.exists) {
      } else {
        createSession()
      }
      //handle not session
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
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <Spinner show={false} />
      <DocumentUpload />
      <Notification signal={notificationSignal} />
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
