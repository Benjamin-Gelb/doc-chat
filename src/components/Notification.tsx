import { useState, useEffect } from "react"


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

export default Notification