import './TypingTest.css'

const TypingTest = ({ text }) => {
  return (
    <div className="typingtest-wrapper">
      {/* <textarea */}
      {/*   autoCapitalize="off" */}
      {/*   autoComplete="off" */}
      {/*   rows="" */}
      {/*   cols="" */}
      {/*   className="typingtest-input"> */}
      {/**/}
      {/* </textarea> */}
      <div className="typingtest-words">
        {text}
      </div>
    </div>
  )
}

export default TypingTest
