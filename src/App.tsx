import { useEffect, useState } from 'react'
import { consumeContext } from './Context';
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

type ServerResponse = {
  exists: boolean
  sessions: [{
    documents: String[],
    conversation: String[]
  }]
}

import Chat from './components/Chat';
import DocumentUpload from './components/Document';
import Notification from './components/Notification';

import { ChatMessage } from './components/Chat';


function App() {
  const [uploadedDocs, setUploadedDocs] = useState<String[]>([])
  const [notificationSignal, sendNotificationSignal] = useState('')
  const [conversation, setConversation] = useState<ChatMessage[]>([])

  const {setDocuments} = consumeContext()
  
  useEffect(()=> {
    setDocuments(uploadedDocs)
  }, [uploadedDocs])

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
          <Chat sessionMessages={conversation} />
        </div>
      </main>

    </>
  )
}

export default App
