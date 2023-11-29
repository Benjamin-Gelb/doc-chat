import openaiLogo from '/openai-logomark.svg'


const Spinner = ({ show, spin = true }: { show: Boolean, spin: Boolean }) => {
    if (!show) return <></>
    return (
        <div className={`spinner ${spin ? 'spin-animation' : ''}`}>
            <img src={openaiLogo} alt="OpenAI Logo" />
        </div>
    )
}

export default Spinner