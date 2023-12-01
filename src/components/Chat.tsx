import { useState, useRef, useEffect, useMemo } from "react"
import { consumeContext } from "../Context"

export enum MessageTypes {
    AI = 'AIMessage',
    HUMAN = 'HumanMessage'
}


export type ChatMessage = {
    type: MessageTypes,
    content: String
}

function dotDotDot(text: String) {
    if (text.length > 3) {
        return "."
    }
    return text.concat(".")
}

const Chat = ({ sessionMessages }: { sessionMessages: ChatMessage[], }) => {

    const { documents } = consumeContext()


    const [awaitingResponse, setAwaitingResponse] = useState(false)
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState<ChatMessage[]>(sessionMessages)
    const chatbox = useRef<HTMLDivElement>(null)

    useEffect(() => {
        chatbox.current?.scrollTo({ top: chatbox.current.scrollHeight, behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        setMessages(sessionMessages)
    }, [sessionMessages])

    const Message = ({ type, content }: { type: MessageTypes, content: String }) => {

        return (
            <div className={`message ${type}`}>
                {content.split('\n').map((newline, i) => <div key={i}>{newline}</div>)}
            </div>
        )
    }

    const ChatBox = useMemo(() => (
        <div ref={chatbox} className='chat-box scrollbar'>
            {messages.map((message, i) => <Message key={i} {...message} />)}
            {awaitingResponse ? <div className='message AIMessage dot'>
                <div className='dot-flashing'>
                </div>
            </div> : <></>}
        </div>
    ), [messages])

    const [showDocMessage, setShowDocMessage] = useState(false)


    const postMessage = async () => {
        if (message === '') return

        if (documents.length === 0) {
            setShowDocMessage(true)
            return
        }


        setMessages(prev => prev.concat({
            type: MessageTypes.HUMAN,
            content: message
        }))
        setMessage('')
        const url = `${import.meta.env.VITE_LLM_SERVER}/chat`

        setAwaitingResponse(true)
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
        setAwaitingResponse(false)
        setMessages(prev => prev.concat(aiMessage))

    }


    const DocMessage = () => {

        useEffect(() => {
            if (showDocMessage) {
                setTimeout(() => {
                    setShowDocMessage(false)
                }, 3000);
            }
            // return () => {
            //     if (show) {
            //         setShow(false)
            //     }
            // }
        }, [showDocMessage])


        if (!showDocMessage) {
            return <></>
        }

        return (
            <div className="doc-message-wrapper">
            <div className='doc-message'>
                You can't chat until you've uploaded some documents.
            </div>
            </div>
        )

    }


    const Preset = ({ title, content }: { title: String, content: string }) => {
        return (
            <button className='preset' onClick={() => {
                setMessage(content)
            }}>
                {title}
            </button>
        )
    }

    const presets = [
        { title: "Plaintiff Position", content: "What is the plaintiff's position" },
        { title: "Defendant Position", content: "What is the defendant's position?" },
        { title: "Case Summary", content: "Give me a summary of the case." },
        { title: "Demands & Negotiations", content: "What has been demanded? What has been offered? What is the state of any current negotiations?" },
        { title: "Case Participants ", content: "Who are the case Participants? Respond with a bulleted list." },
    ]


    return (
        <div className='chat '>
            <div>
                {presets.map((preset, i) => <Preset title={preset.title} content={preset.content} key={i} />)}
            </div>
            <div className='chat-input'>
                <input className='fancy-text-input' type="text" value={message} disabled={awaitingResponse} onChange={(e) => {
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
            <DocMessage />
            <>{ChatBox}</>
        </div>
    )
}

export default Chat