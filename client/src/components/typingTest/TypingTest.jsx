import './TypingTest.css'
import { useRef, useState, useEffect, useCallback } from 'react';

const TypingTest = ({ text, gameStarted, onComplete, onHasMistakesChange }) => {
  const wordRefs = useRef([]);
  const textareaRef = useRef(null);
  const wordsContainerRef = useRef(null);
  const wordsInnerRef = useRef(null);

  const [words, setWords] = useState([]);
  const [input, setInput] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [caretPosition, setCaretPosition] = useState({ left: 0, top: 0 });
  const [wordStatus, setWordStatus] = useState([]);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const [startTime, setStartTime] = useState(null);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0);

  const lineHeight = useRef(0);
  const lastScrollLine = useRef(0);

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
    setTotalKeystrokes(0);
    setCorrectKeystrokes(0);
    setScrollOffset(0);
    setShowTopFade(false);
    setShowBottomFade(false);
    lastScrollLine.current = 0;
    wordRefs.current = [];
    onHasMistakesChange?.(false);
  }, [text]);

  useEffect(() => {
    if (gameStarted && startTime === null) {
      setStartTime(Date.now());
    }
  }, [gameStarted, startTime]);

  useEffect(() => {
    if (!gameStarted || words.length === 0) return;

    const currentWord = words[currentWordIndex];
    let hasMistakes = false;

    for (let i = 0; i < input.length; i++) {
      if (input[i] !== currentWord[i]) {
        hasMistakes = true;
        break;
      }
    }

    if (!hasMistakes) {
      for (let i = 0; i < currentWordIndex; i++) {
        if (wordStatus[i]?.typed !== words[i]) {
          hasMistakes = true;
          break;
        }
      }
    }

    onHasMistakesChange?.(hasMistakes);
  }, [input, wordStatus, currentWordIndex, words, gameStarted, onHasMistakesChange]);

  useEffect(() => {
    const container = wordsContainerRef.current;
    const inner = wordsInnerRef.current;

    if (!container || !inner) return;

    const checkOverflow = () => {
      const containerHeight = container.getBoundingClientRect().height;
      const innerHeight = inner.getBoundingClientRect().height;

      setShowBottomFade(innerHeight > containerHeight);
    };

    checkOverflow();

    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [words]);

  useEffect(() => {
    const currentWordElement = wordRefs.current[currentWordIndex];
    const container = wordsContainerRef.current;
    const inner = wordsInnerRef.current;

    if (!currentWordElement || !container || !inner) return;

    const containerRect = container.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();

    if (innerRect.height <= containerRect.height) return;

    const wordRect = currentWordElement.getBoundingClientRect();

    if (lineHeight.current === 0 && wordRefs.current[0]) {
      lineHeight.current = wordRefs.current[0].getBoundingClientRect().height + 8; // +8 for margins
    }

    if (lineHeight.current === 0) return;

    const containerHeight = containerRect.height;
    const wordTopRelative = wordRect.top - containerRect.top;

    const currentLine = Math.floor(wordTopRelative / lineHeight.current);
    const totalVisibleLines = Math.floor(containerHeight / lineHeight.current);

    const scrollTriggerLine = totalVisibleLines - 3;

    if (currentLine >= scrollTriggerLine && currentLine > lastScrollLine.current) {
      lastScrollLine.current = currentLine;
      setScrollOffset(prev => prev + lineHeight.current);
      setShowTopFade(true);
    }
  }, [currentWordIndex]);

  const updateCaretPosition = useCallback(() => {
    if (!isFocused) return;

    const currentWordElement = wordRefs.current[currentWordIndex];
    const container = wordsInnerRef.current;

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
    const container = wordsInnerRef.current;

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

  const calculateResults = (currentCorrect, currentTotal) => {
    const endTime = Date.now();
    const timeElapsedMs = endTime - startTime;
    const timeElapsedMin = timeElapsedMs / 60000;

    // wpm = (correct keystrokes / 5) / minutes
    const wpm = Math.round((currentCorrect / 5) / timeElapsedMin);
    // accuracy = correct keystrokes / total keystrokes
    const accuracy = currentTotal > 0 ? Math.round((currentCorrect / currentTotal) * 100) : 0;

    return {
      wpm,
      accuracy,
      time: Math.round(timeElapsedMs / 1000),
      correctChars: currentCorrect,
      totalChars: currentTotal
    };
  };

  const handleChange = (e) => {
    if (!gameStarted) return;

    const value = e.target.value;
    const currentWord = words[currentWordIndex];

    if (value.length > input.length) {
      const newChar = value[value.length - 1];
      const expectedChar = currentWord[value.length - 1];

      const newTotal = totalKeystrokes + 1;
      const newCorrect = newChar === expectedChar ? correctKeystrokes + 1 : correctKeystrokes;

      setTotalKeystrokes(newTotal);
      setCorrectKeystrokes(newCorrect);

      const isLastWord = currentWordIndex === words.length - 1;
      if (isLastWord && value === currentWord) {
        const allPreviousCorrect = wordStatus.every((ws, idx) => {
          if (idx === currentWordIndex) return true;
          return ws.typed === words[idx];
        });

        if (allPreviousCorrect) {
          const results = calculateResults(newCorrect, newTotal);
          onComplete?.(results);
        }
      }
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

      const newTotal = totalKeystrokes + 1;
      const newCorrect = isCorrect ? correctKeystrokes + 1 : correctKeystrokes;

      setTotalKeystrokes(newTotal);
      setCorrectKeystrokes(newCorrect);

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
      <div className={`words-container ${gameStarted && !isFocused ? 'blurred' : ''}`} ref={wordsContainerRef}>
        {showTopFade && <div className="fade-overlay fade-top" />}
        {showBottomFade && <div className="fade-overlay fade-bottom" />}

        <div
          className="words-inner"
          ref={wordsInnerRef}
          style={{ transform: `translateY(-${scrollOffset}px)` }}
        >
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
      </div>

      {gameStarted && !isFocused && (
        <div className="focus-overlay">
          <span>Click to focus</span>
        </div>
      )}
    </div>
  );
};

export default TypingTest;
