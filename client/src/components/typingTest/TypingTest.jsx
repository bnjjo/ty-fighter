import './TypingTest.css'
import { useRef, useState, useEffect, useCallback } from 'react';

const TypingTest = ({ text, gameStarted, onComplete }) => {
  const wordRefs = useRef([]);
  const textareaRef = useRef(null);
  const wordsContainerRef = useRef(null);

  const [words, setWords] = useState([]);
  const [input, setInput] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [caretPosition, setCaretPosition] = useState({ left: 0, top: 0 });
  const [wordStatus, setWordStatus] = useState([]);

  const [startTime, setStartTime] = useState(null);
  const [totalCorrectChars, setTotalCorrectChars] = useState(0);
  const [totalTypedChars, setTotalTypedChars] = useState(0);

  useEffect(() => {
    if (!text || text.trim() === '') {
      setWords([]);
      setWordStatus([]);
      return;
    }

    const newWords = text.split(' ');
    setWords(newWords);
    setWordStatus(newWords.map(() => ({ typed: '', status: 'pending' })));
    setCurrentWordIndex(0);
    setInput('');
    setStartTime(null);
    setTotalCorrectChars(0);
    setTotalTypedChars(0);
    wordRefs.current = [];
  }, [text]);

  const updateCaretPosition = useCallback(() => {
    if (!isFocused) return;

    const currentWordElement = wordRefs.current[currentWordIndex];
    const container = wordsContainerRef.current;

    if (currentWordElement && container) {
      const containerRect = container.getBoundingClientRect();
      const letters = currentWordElement.querySelectorAll('.letter:not(.extra)');
      const typedLength = input.length;

      let caretLeft, caretTop;
      let refRect;

      if (typedLength === 0) {
        const firstLetter = letters[0];
        if (firstLetter) {
          refRect = firstLetter.getBoundingClientRect();
          caretLeft = refRect.left - containerRect.left;
        } else {
          refRect = currentWordElement.getBoundingClientRect();
          caretLeft = refRect.left - containerRect.left;
        }
      } else if (typedLength <= letters.length) {
        const lastTypedLetter = letters[typedLength - 1];
        if (lastTypedLetter) {
          refRect = lastTypedLetter.getBoundingClientRect();
          caretLeft = refRect.right - containerRect.left;
        }
      } else {
        const extraSpan = currentWordElement.querySelector('.extra');
        if (extraSpan) {
          refRect = extraSpan.getBoundingClientRect();
          caretLeft = refRect.right - containerRect.left;
        }
      }

      if (refRect) {
        const caretHeight = 32;
        const letterVerticalCenter = refRect.top + (refRect.height / 2) - containerRect.top;
        caretTop = letterVerticalCenter - (caretHeight / 2);
      }

      setCaretPosition({ left: caretLeft, top: caretTop });
    }
  }, [currentWordIndex, input, isFocused]);

  const updateTextareaPosition = useCallback(() => {
    const currentWordElement = wordRefs.current[currentWordIndex];
    const textarea = textareaRef.current;
    const container = wordsContainerRef.current;

    if (currentWordElement && textarea && container) {
      const wordRect = currentWordElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      textarea.style.width = `${wordRect.width + 100}px`;
      textarea.style.height = `${wordRect.height}px`;
      textarea.style.left = `${wordRect.left - containerRect.left}px`;
      textarea.style.top = `${wordRect.top - containerRect.top}px`;
    }
  }, [currentWordIndex]);

  useEffect(() => {
    updateTextareaPosition();
    updateCaretPosition();
  }, [currentWordIndex, input, isFocused, updateTextareaPosition, updateCaretPosition]);

  useEffect(() => {
    const handleResize = () => {
      updateTextareaPosition();
      updateCaretPosition();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateTextareaPosition, updateCaretPosition]);

  useEffect(() => {
    if (words.length > 0 && gameStarted) {
      textareaRef.current?.focus();
    }
  }, [words, gameStarted]);

  const calculateResults = (finalWordStatus) => {
    const endTime = Date.now();
    const timeElapsedMs = endTime - startTime;
    const timeElapsedMin = timeElapsedMs / 60000;

    let correctChars = 0;
    let totalChars = 0;

    finalWordStatus.forEach((wordState, idx) => {
      const originalWord = words[idx];
      const typedWord = wordState.typed;

      totalChars += typedWord.length;

      for (let i = 0; i < Math.min(typedWord.length, originalWord.length); i++) {
        if (typedWord[i] === originalWord[i]) {
          correctChars++;
        }
      }

      if (wordState.status === 'correct' && idx < finalWordStatus.length - 1) {
        correctChars++;
        totalChars++;
      }
    });

    const wpm = Math.round((correctChars / 5) / timeElapsedMin);
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 0;

    return {
      wpm,
      accuracy,
      time: Math.round(timeElapsedMs / 1000),
      correctChars,
      totalChars
    };
  };

  const handleChange = (e) => {
    if (!gameStarted) return;

    const value = e.target.value;

    if (startTime === null && value.length > 0) {
      setStartTime(Date.now());
    }

    setInput(value);

    setWordStatus(prev => {
      const newStatus = [...prev];
      if (newStatus[currentWordIndex]) {
        newStatus[currentWordIndex] = {
          ...newStatus[currentWordIndex],
          typed: value
        };
      }
      return newStatus;
    });

    const isLastWord = currentWordIndex === words.length - 1;
    const currentWord = words[currentWordIndex];

    if (isLastWord && value === currentWord) {
      const finalStatus = wordStatus.map((ws, idx) => {
        if (idx === currentWordIndex) {
          return { typed: value, status: 'correct' };
        }
        return ws;
      });

      const results = calculateResults(finalStatus);
      onComplete?.(results);
    }
  };

  const handleKeyDown = (e) => {
    if (!gameStarted) {
      e.preventDefault();
      return;
    }

    if (e.key === 'Backspace' && input === '') {
      e.preventDefault();

      if (currentWordIndex === 0) return;

      const prevWordStatus = wordStatus[currentWordIndex - 1];
      if (prevWordStatus?.status === 'correct') return;

      setCurrentWordIndex(prev => prev - 1);
      setInput(wordStatus[currentWordIndex - 1]?.typed || '');
    }

    if (e.key === ' ') {
      e.preventDefault();

      if (input.trim() === '') return;

      const currentWord = words[currentWordIndex];
      const isCorrect = input === currentWord;
      const isLastWord = currentWordIndex === words.length - 1;

      setWordStatus(prev => {
        const newStatus = [...prev];
        if (newStatus[currentWordIndex]) {
          newStatus[currentWordIndex] = {
            typed: input,
            status: isCorrect ? 'correct' : 'incorrect'
          };
        }
        return newStatus;
      });

      if (!isLastWord) {
        setCurrentWordIndex(prev => prev + 1);
        setInput('');
      }
    }
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const handleContainerClick = () => {
    if (gameStarted) {
      textareaRef.current?.focus();
    }
  };

  const getLetterClass = (wordIdx, letterIdx, letter) => {
    const wordState = wordStatus[wordIdx];

    if (!wordState) return 'letter';

    const typedChar = wordState.typed[letterIdx];

    if (wordIdx < currentWordIndex) {
      if (typedChar === undefined) {
        return 'letter missing';
      } else if (typedChar === letter) {
        return 'letter correct';
      } else {
        return 'letter incorrect';
      }
    } else if (wordIdx === currentWordIndex) {
      if (typedChar === undefined) {
        return 'letter';
      } else if (typedChar === letter) {
        return 'letter correct';
      } else {
        return 'letter incorrect';
      }
    } else {
      return 'letter';
    }
  };

  const getWordClass = (wordIdx) => {
    const wordState = wordStatus[wordIdx];

    if (!wordState) return 'word';

    if (wordIdx === currentWordIndex) {
      return 'word active';
    } else if (wordIdx < currentWordIndex) {
      if (wordState.status === 'incorrect') {
        return 'word error';
      }
    }
    return 'word';
  };

  if (!text || text.trim() === '' || words.length === 0) {
    return <div className="typingtest-wrapper">Loading...</div>;
  }

  return (
    <div className="typingtest-wrapper" onClick={handleContainerClick}>
      <div className={`words ${gameStarted && !isFocused ? 'blurred' : ''}`} ref={wordsContainerRef}>
        {isFocused && gameStarted && (
          <div
            className="caret"
            style={{
              left: `${caretPosition.left}px`,
              top: `${caretPosition.top}px`,
            }}
          />
        )}

        <textarea
          ref={textareaRef}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="typingtest-input"
          rows="1"
          disabled={!gameStarted}
        />

        {words.map((word, wordIdx) => (
          <div
            key={wordIdx}
            className={getWordClass(wordIdx)}
            ref={el => wordRefs.current[wordIdx] = el}
          >
            {word.split('').map((letter, letterIdx) => (
              <span key={letterIdx} className={getLetterClass(wordIdx, letterIdx, letter)}>
                {letter}
              </span>
            ))}
            {wordIdx === currentWordIndex && input.length > word.length && (
              <span className="letter incorrect extra">
                {input.slice(word.length)}
              </span>
            )}
            {wordIdx < currentWordIndex && wordStatus[wordIdx]?.typed.length > word.length && (
              <span className="letter incorrect extra">
                {wordStatus[wordIdx].typed.slice(word.length)}
              </span>
            )}
          </div>
        ))}
      </div>

      {!gameStarted && (
        <div className="focus-overlay">
          <span>Get ready...</span>
        </div>
      )}

      {gameStarted && !isFocused && (
        <div className="focus-overlay">
          <span>Click to focus</span>
        </div>
      )}
    </div>
  );
};

export default TypingTest;
