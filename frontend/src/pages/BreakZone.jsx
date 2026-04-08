import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  IoChevronForward,
  IoCafeOutline,
  IoMusicalNotesOutline,
  IoHeadsetOutline,
  IoGameControllerOutline,
  IoRocketOutline
} from 'react-icons/io5';
import { FloatingParticles, GradientMesh } from '../components/SVGBackgrounds/SVGBackgrounds';

const wordBank = [
  { word: 'FOCUS', hint: 'What you need for deep study sessions.' },
  { word: 'MEMORY', hint: 'Brain skill strengthened by practice.' },
  { word: 'LOGIC', hint: 'Core of puzzle solving.' },
  { word: 'ENERGY', hint: 'Short breaks help restore this.' },
  { word: 'REVISE', hint: 'What you do before exams.' },
  { word: 'LEARN', hint: 'The main goal of Educolink.' },
];

const sudokuPuzzle = [
  ['', '2', '', '4'],
  ['3', '', '1', ''],
  ['', '1', '', '3'],
  ['2', '', '4', ''],
];

const sudokuSolution = [
  ['1', '2', '3', '4'],
  ['3', '4', '1', '2'],
  ['4', '1', '2', '3'],
  ['2', '3', '4', '1'],
];

const memorySymbols = ['CALM', 'CALM', 'ZEN', 'ZEN', 'FLOW', 'FLOW', 'REST', 'REST'];

const ambientSoundscapes = [
  {
    id: 'rain',
    title: 'Rain Vibes',
    note: 'Gentle rain texture for deep concentration.',
    embedUrl: 'https://www.youtube.com/embed/mPZkdNFkNps?si=6vWFMUpEorDlx4rY',
  },
  {
    id: 'cafe',
    title: 'Cafe Focus',
    note: 'Soft cafe chatter and coffeehouse ambience.',
    embedUrl: 'https://www.youtube.com/embed/gaGrHUekGrc?si=YmbY2tSRxEuwv3EJ',
  },
  {
    id: 'nature',
    title: 'Nature Calm',
    note: 'Forest and birds ambience to relax your mind.',
    embedUrl: 'https://www.youtube.com/embed/eKFTSSKCzWA?si=ZZsD96s7-LlB65fN',
  },
];

const triviaQuestions = [
  {
    question: 'Which habit helps concentration the most?',
    options: ['Multitasking', 'Short focused sessions', 'Skipping breaks', 'Random scrolling'],
    answer: 'Short focused sessions',
    hint: 'Think about the Pomodoro style.',
  },
  {
    question: 'What should you do after a hard study round?',
    options: ['Reset with a quick break', 'Study longer without pause', 'Close all notes', 'Switch off water'],
    answer: 'Reset with a quick break',
    hint: 'The app is built around smart breaks.',
  },
  {
    question: 'Which game trains memory?',
    options: ['Memory Match', 'Typing random keys', 'Idle waiting', 'Mute music'],
    answer: 'Memory Match',
    hint: 'One of the existing mini brain games.',
  },
  {
    question: 'What is the best first step before a quiz?',
    options: ['Review the topic', 'Guess blindly', 'Skip instructions', 'Open four tabs'],
    answer: 'Review the topic',
    hint: 'Preparation beats guessing.',
  },
  {
    question: 'Which sound usually helps focus?',
    options: ['Soft rain', 'Loud alarms', 'Car horns', 'Static noise'],
    answer: 'Soft rain',
    hint: 'Check Ambient Sound options.',
  },
];

function shuffleWord(word) {
  const letters = word.split('');
  for (let i = letters.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  const shuffled = letters.join('');
  return shuffled === word ? word.split('').reverse().join('') : shuffled;
}

function createWordRound() {
  const randomWord = wordBank[Math.floor(Math.random() * wordBank.length)];
  return {
    ...randomWord,
    scrambled: shuffleWord(randomWord.word),
  };
}

function createMemoryDeck() {
  const deck = memorySymbols.map((symbol, index) => ({ id: `${symbol}-${index}`, symbol }));
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function MiniBrainGames() {
  const [openGame, setOpenGame] = useState(null);

  const [wordRound, setWordRound] = useState(() => createWordRound());
  const [wordGuess, setWordGuess] = useState('');
  const [wordSelectedIndices, setWordSelectedIndices] = useState([]);
  const [wordFeedback, setWordFeedback] = useState('Unscramble the word to score points.');
  const [wordScore, setWordScore] = useState(0);

  const [sudokuGrid, setSudokuGrid] = useState(() => sudokuPuzzle.map((row) => [...row]));
  const [sudokuFeedback, setSudokuFeedback] = useState('Fill all empty cells using numbers 1-4.');

  const [memoryDeck, setMemoryDeck] = useState(() => createMemoryDeck());
  const [memoryFlipped, setMemoryFlipped] = useState([]);
  const [memoryMatched, setMemoryMatched] = useState([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryScore, setMemoryScore] = useState(0);
  const [memoryFeedback, setMemoryFeedback] = useState('Flip two cards and match calming pairs.');

  const gameModes = [
    {
      id: 'word',
      title: 'Word Gamer',
      subtitle: 'Vocabulary Sprint',
      description: 'Unscramble words and sharpen recall speed.',
      hue: 'word',
      badge: 'ABC',
    },
    {
      id: 'sudoku',
      title: 'Sudoko',
      subtitle: 'Logic Matrix',
      description: 'Solve a compact 4x4 logic puzzle quickly.',
      hue: 'sudoku',
      badge: 'PUZ',
    },
    {
      id: 'memory',
      title: 'Zen Match',
      subtitle: 'Calm Recall',
      description: 'Match relaxing symbols and sharpen memory.',
      hue: 'memory',
      badge: 'ZEN',
    },
  ];

  const openSelectedGame = (gameId) => {
    setOpenGame(gameId);
  };

  const handleNewWord = () => {
    setWordRound(createWordRound());
    setWordGuess('');
    setWordSelectedIndices([]);
    setWordFeedback('New challenge loaded.');
  };

  const pickWordLetter = (letter, index) => {
    if (wordSelectedIndices.includes(index) || wordGuess.length >= wordRound.word.length) {
      return;
    }
    setWordGuess((prev) => `${prev}${letter}`);
    setWordSelectedIndices((prev) => [...prev, index]);
  };

  const clearWordGuess = () => {
    setWordGuess('');
    setWordSelectedIndices([]);
    setWordFeedback('Selection cleared. Try again.');
  };

  const checkWordGuess = () => {
    if (!wordGuess.trim()) {
      setWordFeedback('Tap letters first to build your guess.');
      return;
    }
    if (wordGuess.trim().toUpperCase() === wordRound.word) {
      setWordScore((prev) => prev + 1);
      setWordFeedback('Correct! Great focus.');
    } else {
      setWordFeedback(`Not quite. Hint: ${wordRound.hint}`);
    }
  };

  const handleSudokuChange = (rowIndex, colIndex, value) => {
    if (sudokuPuzzle[rowIndex][colIndex] !== '') {
      return;
    }
    const cleanValue = value.replace(/[^1-4]/g, '').slice(-1);
    setSudokuGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[rowIndex][colIndex] = cleanValue;
      return next;
    });
  };

  const validateSudoku = () => {
    const isComplete = sudokuGrid.every((row) => row.every((cell) => cell !== ''));
    if (!isComplete) {
      setSudokuFeedback('Complete all cells before checking.');
      return;
    }

    const isCorrect = sudokuGrid.every((row, r) => row.every((cell, c) => cell === sudokuSolution[r][c]));
    setSudokuFeedback(isCorrect ? 'Solved! Excellent pattern recognition.' : 'Some entries are off. Try again.');
  };

  const resetSudoku = () => {
    setSudokuGrid(sudokuPuzzle.map((row) => [...row]));
    setSudokuFeedback('Grid reset. Fill all empty cells using numbers 1-4.');
  };

  const resetMemoryGame = () => {
    setMemoryDeck(createMemoryDeck());
    setMemoryFlipped([]);
    setMemoryMatched([]);
    setMemoryMoves(0);
    setMemoryScore(0);
    setMemoryFeedback('New memory round started.');
  };

  const flipMemoryCard = (index) => {
    if (memoryFlipped.length === 2 || memoryFlipped.includes(index) || memoryMatched.includes(index)) {
      return;
    }

    const nextFlipped = [...memoryFlipped, index];
    setMemoryFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      const [firstIndex, secondIndex] = nextFlipped;
      setMemoryMoves((prev) => prev + 1);

      if (memoryDeck[firstIndex].symbol === memoryDeck[secondIndex].symbol) {
        setMemoryMatched((prev) => [...prev, firstIndex, secondIndex]);
        setMemoryFlipped([]);
        setMemoryScore((prev) => prev + 1);
        setMemoryFeedback('Great match. Stay calm and focused.');
      } else {
        setMemoryFeedback('Not a match. Breathe and try again.');
        window.setTimeout(() => {
          setMemoryFlipped([]);
        }, 700);
      }
    }
  };

  const completedPairs = memoryMatched.length / 2;
  const activeMode = gameModes.find((mode) => mode.id === openGame);
  const wordLetterPool = wordRound.word.split('');

  return (
    <div className="brain-games-panel holo-brain-zone">
      <div className="brain-games-headline-row">
        <p className="brain-games-tag">Mind Arena</p>
        <p className="brain-games-score">Total Score: {wordScore + memoryScore}</p>
      </div>
      <div className="brain-games-mascot-line">
        <span className="mascot-orb" aria-hidden="true">*</span>
        Pick a game, play, and collect calm focus stars.
      </div>

      <div className="brain-games-launcher" role="tablist" aria-label="Mini Brain Games">
        {gameModes.map((mode) => (
          <motion.button
            key={mode.id}
            type="button"
            className={`game-launch-card ${mode.hue} ${openGame === mode.id ? 'active' : ''}`}
            onClick={() => openSelectedGame(mode.id)}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="game-launch-emoji" aria-hidden="true">{mode.badge}</span>
            <span className="game-launch-title">{mode.title}</span>
            <span className="game-launch-subtitle">{mode.subtitle}</span>
            <span className="game-launch-desc">{mode.description}</span>
            <span className="game-launch-action">
              {openGame === mode.id ? 'Opened' : 'Open Game'}
            </span>
          </motion.button>
        ))}
      </div>

      <p className="brain-games-empty">Click any game card to open it in this module panel.</p>

      {openGame && (
        <motion.div
          className="brain-games-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpenGame(null)}
        >
          {openGame === 'word' && (
            <motion.section
              className="game-popout-shell word-popout modal-window"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              role="tabpanel"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="game-popout-topbar">
                <div>
                  <p className="brain-games-panel-kicker">Now Playing</p>
                  <h4 className="brain-games-panel-title">{activeMode.title}</h4>
                </div>
                <div className="game-popout-orbs" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <button type="button" className="game-popout-close" onClick={() => setOpenGame(null)}>Close</button>
              </div>

              <div className="word-popout-stage">
                <p className="brain-games-hint">Hint: {wordRound.hint}</p>

                <div className="word-tile-track" aria-label="Scrambled letters">
                  {wordRound.scrambled.split('').map((letter, index) => (
                    <div key={`${letter}-${index}`} className="word-tile">{letter}</div>
                  ))}
                </div>

                <div className="word-guess-track" aria-label="Your guess">
                  {Array.from({ length: wordRound.word.length }).map((_, index) => (
                    <div key={`guess-slot-${index}`} className="word-guess-cell">{wordGuess[index] || ''}</div>
                  ))}
                </div>

                <div className="word-orb-bank" aria-label="Letter orb selector">
                  {wordLetterPool.map((letter, index) => (
                    <button
                      key={`pool-${letter}-${index}`}
                      type="button"
                      className={`word-orb ${wordSelectedIndices.includes(index) ? 'used' : ''}`}
                      onClick={() => pickWordLetter(letter, index)}
                      disabled={wordSelectedIndices.includes(index)}
                    >
                      {letter}
                    </button>
                  ))}
                </div>

                <div className="brain-games-actions">
                  <button type="button" className="feature-item-btn active" onClick={checkWordGuess}>Check</button>
                  <button type="button" className="feature-item-btn" onClick={clearWordGuess}>Clear</button>
                  <button type="button" className="feature-item-btn" onClick={handleNewWord}>Next Word</button>
                  <button type="button" className="feature-item-btn" onClick={() => setOpenGame(null)}>Close</button>
                </div>

                <p className="brain-games-feedback">{wordFeedback}</p>
                <p className="brain-games-mini-score">Word Score: {wordScore}</p>
              </div>
            </motion.section>
          )}

          {openGame === 'sudoku' && (
            <motion.section
              className="game-popout-shell sudoku-popout modal-window"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              role="tabpanel"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="game-popout-topbar">
                <div>
                  <p className="brain-games-panel-kicker">Now Playing</p>
                  <h4 className="brain-games-panel-title">Sudoko</h4>
                </div>
                <div className="game-popout-orbs" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <button type="button" className="game-popout-close" onClick={() => setOpenGame(null)}>Close</button>
              </div>

              <div className="brain-games-content">
                <p className="brain-games-title">Mini Sudoku 4x4</p>
                <div className="sudoku-grid" role="grid" aria-label="Mini Sudoku Grid">
                  {sudokuGrid.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                      const isFixed = sudokuPuzzle[rowIndex][colIndex] !== '';
                      return (
                        <input
                          key={`${rowIndex}-${colIndex}`}
                          type="text"
                          className={`sudoku-cell ${isFixed ? 'fixed' : ''}`}
                          value={cell}
                          onChange={(event) => handleSudokuChange(rowIndex, colIndex, event.target.value)}
                          disabled={isFixed}
                          inputMode="numeric"
                          maxLength={1}
                          aria-label={`Sudoku cell ${rowIndex + 1}-${colIndex + 1}`}
                        />
                      );
                    })
                  )}
                </div>
                <div className="brain-games-actions">
                  <button type="button" className="feature-item-btn active" onClick={validateSudoku}>Check Sudoku</button>
                  <button type="button" className="feature-item-btn" onClick={resetSudoku}>Reset</button>
                  <button type="button" className="feature-item-btn" onClick={() => setOpenGame(null)}>Close</button>
                </div>
                <p className="brain-games-feedback">{sudokuFeedback}</p>
              </div>
            </motion.section>
          )}

          {openGame === 'memory' && (
            <motion.section
              className="game-popout-shell memory-popout modal-window"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              role="tabpanel"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="game-popout-topbar">
                <div>
                  <p className="brain-games-panel-kicker">Now Playing</p>
                  <h4 className="brain-games-panel-title">Zen Match</h4>
                </div>
                <div className="game-popout-orbs" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <button type="button" className="game-popout-close" onClick={() => setOpenGame(null)}>Close</button>
              </div>

              <div className="brain-games-content">
                <p className="brain-games-title">Memory Match</p>
                <p className="brain-games-hint">Moves: {memoryMoves} • Matched: {completedPairs}/4</p>
                <div className="memory-grid" aria-label="Memory Match Grid">
                  {memoryDeck.map((card, index) => {
                    const isOpen = memoryFlipped.includes(index) || memoryMatched.includes(index);
                    return (
                      <button
                        key={card.id}
                        type="button"
                        className={`memory-card ${isOpen ? 'is-open' : ''}`}
                        onClick={() => flipMemoryCard(index)}
                        disabled={memoryMatched.includes(index)}
                      >
                        {isOpen ? card.symbol : '•'}
                      </button>
                    );
                  })}
                </div>
                <div className="brain-games-actions">
                  <button type="button" className="feature-item-btn active" onClick={resetMemoryGame}>New Round</button>
                    <button
                      type="button"
                      className="feature-item-btn"
                    onClick={() => setOpenGame(null)}
                    >
                    Back to Games
                    </button>
                    <button
                      type="button"
                      className="feature-item-btn"
                      onClick={() => setOpenGame(null)}
                    >
                    Close
                    </button>
                </div>
                <p className="brain-games-feedback">{memoryFeedback}</p>
                <p className="brain-games-mini-score">Memory Score: {memoryScore}</p>
              </div>
            </motion.section>
          )}
        </motion.div>
      )}
    </div>
  );
}

function FunChallengesPanel() {
  const [selectedGame, setSelectedGame] = useState(null);

  const [snakePlayerPos, setSnakePlayerPos] = useState(1);
  const [snakeBotPos, setSnakeBotPos] = useState(1);
  const [snakeDice, setSnakeDice] = useState(0);
  const [snakeTurn, setSnakeTurn] = useState('player');
  const [snakeMessage, setSnakeMessage] = useState('Click Play and roll dice. First to 100 wins.');
  const [snakeLastMove, setSnakeLastMove] = useState(null);
  const [snakeMoveLog, setSnakeMoveLog] = useState([]);

  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaSelected, setTriviaSelected] = useState(null);
  const [triviaResult, setTriviaResult] = useState('Pick the best answer.');
  const [triviaDone, setTriviaDone] = useState(false);

  const [selectedCells, setSelectedCells] = useState([]);
  const [playerWords, setPlayerWords] = useState([]);
  const [botWords, setBotWords] = useState([]);
  const [playerCellKeys, setPlayerCellKeys] = useState([]);
  const [botCellKeys, setBotCellKeys] = useState([]);
  const [wordMessage, setWordMessage] = useState('Select letters and submit full word before bot does.');

  const snakeTransitions = {
    4: 14,
    9: 31,
    20: 38,
    28: 84,
    40: 59,
    51: 67,
    63: 81,
    17: 7,
    54: 34,
    62: 19,
    64: 60,
    87: 24,
    93: 73,
    95: 75,
    99: 78,
  };

  const snakeBoard = Array.from({ length: 10 }, (_, rowIndex) => {
    const base = 100 - rowIndex * 10;
    const row = Array.from({ length: 10 }, (_, col) => base - col);
    return rowIndex % 2 === 0 ? row : row.reverse();
  });

  const wordList = ['APPLE', 'MANGO', 'ORANGE', 'GRAPES'];
  const wordGrid = [
    'APPLEQRTYU',
    'MANGOBNMJK',
    'ZXORANGEPQ',
    'CVBGRAPESL',
    'PLMOKNIJHB',
    'YTGCRFVDSE',
    'QWERTYUIOP',
    'ASDFGHJKLZ',
    'XCVBNMQWER',
    'POIUYTREWA',
  ];

  const wordPlacements = {
    APPLE: ['0-0', '0-1', '0-2', '0-3', '0-4'],
    MANGO: ['1-0', '1-1', '1-2', '1-3', '1-4'],
    ORANGE: ['2-2', '2-3', '2-4', '2-5', '2-6', '2-7'],
    GRAPES: ['3-3', '3-4', '3-5', '3-6', '3-7', '3-8'],
  };

  const selectedWord = selectedCells.map(({ r, c }) => wordGrid[r][c]).join('');
  const snakeOver = snakePlayerPos >= 100 || snakeBotPos >= 100;
  const totalFoundWords = playerWords.length + botWords.length;
  const activeTrivia = triviaQuestions[triviaIndex] || triviaQuestions[0];

  const gameCards = [
    { id: 'snake', title: 'Snake & Ladder', subtitle: 'vs AI Bot' },
    { id: 'trivia', title: 'Trivia Challenge', subtitle: 'Quick quiz round' },
    { id: 'word', title: 'Word Matching', subtitle: 'Race with AI Bot' },
  ];

  useEffect(() => {
    if (selectedGame !== 'snake' || snakeTurn !== 'bot' || snakeOver) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const dice = Math.floor(Math.random() * 6) + 1;
      const from = snakeBotPos;
      const moved = Math.min(100, from + dice);
      const transitioned = snakeTransitions[moved] || moved;
      const hitType = transitioned > moved ? 'Ladder' : transitioned < moved ? 'Snake' : '';
      setSnakeDice(dice);
      setSnakeBotPos(transitioned);
      setSnakeLastMove({ actor: 'AI', from, to: transitioned, dice, hitType });
      setSnakeMoveLog((prev) => [`AI: ${from} + ${dice} -> ${transitioned}${hitType ? ` (${hitType})` : ''}`, ...prev].slice(0, 5));

      if (transitioned >= 100) {
        setSnakeMessage(`AI rolled ${dice}. ${from} -> ${transitioned}. AI wins.`);
      } else {
        setSnakeMessage(`AI rolled ${dice}. ${from} -> ${transitioned}${hitType ? ` via ${hitType}` : ''}. Your turn.`);
        setSnakeTurn('player');
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [selectedGame, snakeTurn, snakeOver, snakeBotPos]);

  useEffect(() => {
    if (selectedGame !== 'word' || totalFoundWords >= wordList.length) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const remaining = wordList.filter((word) => !playerWords.includes(word) && !botWords.includes(word));
      if (remaining.length === 0) {
        return;
      }
      const nextWord = remaining[Math.floor(Math.random() * remaining.length)];
      setBotWords((prev) => [...prev, nextWord]);
      setBotCellKeys((prev) => [...prev, ...wordPlacements[nextWord]]);
      setWordMessage(`AI found ${nextWord}. Find faster.`);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [selectedGame, totalFoundWords, playerWords, botWords]);

  const openGame = (gameId) => {
    setSelectedGame(gameId);
    setSelectedCells([]);
    if (gameId === 'trivia') {
      startTrivia();
    }
  };

  const closeGame = () => {
    setSelectedGame(null);
  };

  const startTrivia = () => {
    setTriviaIndex(0);
    setTriviaScore(0);
    setTriviaSelected(null);
    setTriviaResult('Pick the best answer.');
    setTriviaDone(false);
  };

  const rollSnake = () => {
    if (snakeTurn !== 'player') {
      return;
    }
    if (snakeOver) {
      setSnakeMessage('Round finished. Reset to play again.');
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    const from = snakePlayerPos;
    const moved = Math.min(100, from + dice);
    const transitioned = snakeTransitions[moved] || moved;
    const hitType = transitioned > moved ? 'Ladder' : transitioned < moved ? 'Snake' : '';
    setSnakeDice(dice);
    setSnakePlayerPos(transitioned);
    setSnakeLastMove({ actor: 'You', from, to: transitioned, dice, hitType });
    setSnakeMoveLog((prev) => [`You: ${from} + ${dice} -> ${transitioned}${hitType ? ` (${hitType})` : ''}`, ...prev].slice(0, 5));

    if (transitioned >= 100) {
      setSnakeMessage(`You rolled ${dice}. ${from} -> ${transitioned}. You win.`);
    } else {
      setSnakeMessage(`You rolled ${dice}. ${from} -> ${transitioned}${hitType ? ` via ${hitType}` : ''}. AI turn...`);
      setSnakeTurn('bot');
    }
  };

  const resetSnake = () => {
    setSnakePlayerPos(1);
    setSnakeBotPos(1);
    setSnakeTurn('player');
    setSnakeDice(0);
    setSnakeLastMove(null);
    setSnakeMoveLog([]);
    setSnakeMessage('Board reset. Roll dice and reach 100.');
  };

  const submitTriviaAnswer = (choice) => {
    if (triviaDone || triviaSelected) {
      return;
    }

    const isCorrect = choice === activeTrivia.answer;
    setTriviaSelected(choice);
    if (isCorrect) {
      setTriviaScore((prev) => prev + 1);
      setTriviaResult('Correct. Good focus.');
    } else {
      setTriviaResult(`Wrong. Correct answer: ${activeTrivia.answer}.`);
    }
  };

  const nextTriviaQuestion = () => {
    if (triviaDone) {
      return;
    }

    if (!triviaSelected) {
      setTriviaResult('Choose an answer first.');
      return;
    }

    const nextIndex = triviaIndex + 1;
    if (nextIndex >= triviaQuestions.length) {
      const finalScore = triviaScore + (triviaSelected === activeTrivia.answer ? 1 : 0);
      setTriviaDone(true);
      setTriviaResult(`Quiz complete. Score: ${finalScore}/${triviaQuestions.length}`);
      return;
    }

    setTriviaIndex(nextIndex);
    setTriviaSelected(null);
    setTriviaResult('Pick the best answer.');
  };

  const resetTrivia = () => {
    startTrivia();
  };

  const toggleWordCell = (r, c) => {
    const key = `${r}-${c}`;
    if (playerCellKeys.includes(key) || botCellKeys.includes(key)) {
      return;
    }
    const alreadySelected = selectedCells.some((cell) => cell.r === r && cell.c === c);
    if (alreadySelected) {
      setSelectedCells((prev) => prev.filter((cell) => !(cell.r === r && cell.c === c)));
      return;
    }
    setSelectedCells((prev) => [...prev, { r, c }]);
  };

  const clearWordSelection = () => {
    setSelectedCells([]);
  };

  const submitWordSelection = () => {
    if (!selectedWord) {
      setWordMessage('Select letters first.');
      return;
    }

    const candidate = selectedWord.toUpperCase();
    const reverseCandidate = candidate.split('').reverse().join('');
    const selectedKeys = selectedCells.map((cell) => `${cell.r}-${cell.c}`).sort();

    const remainingWords = wordList.filter((word) => !playerWords.includes(word) && !botWords.includes(word));
    const target = remainingWords.find((word) => {
      if (word !== candidate && word !== reverseCandidate) {
        return false;
      }
      const expected = [...wordPlacements[word]].sort();
      return expected.length === selectedKeys.length && expected.every((value, index) => value === selectedKeys[index]);
    });

    if (!target) {
      setWordMessage('Selection does not match a valid target word.');
      return;
    }

    setPlayerWords((prev) => [...prev, target]);
    setPlayerCellKeys((prev) => [...prev, ...wordPlacements[target]]);
    setWordMessage(`Great. You found ${target}.`);
    setSelectedCells([]);
  };

  const resetWordGame = () => {
    setSelectedCells([]);
    setPlayerWords([]);
    setBotWords([]);
    setPlayerCellKeys([]);
    setBotCellKeys([]);
    setWordMessage('Select letters and submit full word before bot does.');
  };

  return (
    <div className={`fun-challenge-panel ${selectedGame ? 'is-active' : ''}`}>
      <div className="fun-challenge-body">
        <div className="fun-challenge-head">
          <p className="fun-challenge-title">Holo Game Arena</p>
          <p className="fun-challenge-score">Tap Any To Play Here</p>
        </div>

        <div className="fun-launch-grid" role="tablist" aria-label="Fun Games">
          {gameCards.map((game) => (
            <button key={game.id} type="button" className="fun-launch-card" onClick={() => openGame(game.id)}>
              <span className="fun-launch-title">{game.title}</span>
              <span className="fun-launch-subtitle">{game.subtitle}</span>
              <span className="fun-launch-action">Play</span>
            </button>
          ))}
        </div>

        <p className="fun-challenge-feedback">All games open inside this module with AI bot opponent.</p>

        {selectedGame && (
          <div
            className="fun-modal-backdrop"
            onClick={closeGame}
          >
            <section
              className="fun-modal-window"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="fun-modal-topbar">
                <h3>{selectedGame === 'snake' ? 'Snake & Ladder vs AI' : selectedGame === 'trivia' ? 'Trivia Challenge' : 'Word Matching vs AI'}</h3>
                <button type="button" className="game-popout-close" onClick={closeGame}>Close</button>
              </div>

              {selectedGame === 'snake' && (
                <div className="fun-game-stage">
                  <div className="fun-challenge-meta">
                    <span className="fun-meta-chip">Dice: {snakeDice || '--'}</span>
                    <span className="fun-meta-chip">You: {snakePlayerPos}/100</span>
                    <span className="fun-meta-chip">AI: {snakeBotPos}/100</span>
                    <span className="fun-meta-chip">Turn: {snakeTurn === 'player' ? 'You' : 'AI'}</span>
                    <span className="fun-meta-chip">Last: {snakeLastMove ? `${snakeLastMove.actor} ${snakeLastMove.from} -> ${snakeLastMove.to}` : '--'}</span>
                  </div>
                  <div className="snake-board" aria-label="Snake and Ladder Board">
                    <div className="snake-overlay" aria-hidden="true">
                      <div className="ladder-path l1" />
                      <div className="ladder-path l2" />
                      <div className="ladder-path l3" />
                      <div className="ladder-path l4" />

                      <div className="snake-path s1" />
                      <div className="snake-path s2" />
                      <div className="snake-path s3" />
                      <div className="snake-path s4" />
                    </div>
                    {snakeBoard.map((row, rowIndex) =>
                      row.map((cell) => {
                        const isPlayerCell = snakePlayerPos === cell;
                        const isBotCell = snakeBotPos === cell;
                        return (
                          <div
                            key={cell}
                            className={`snake-cell row-${rowIndex} ${isPlayerCell ? 'player' : ''} ${isBotCell ? 'bot' : ''} ${snakeLastMove?.from === cell ? 'last-from' : ''} ${snakeLastMove?.to === cell ? 'last-to' : ''} ${[4, 9, 20, 28, 40, 51, 63].includes(cell) ? 'ladder' : ''} ${[17, 54, 62, 64, 87, 93, 95, 99].includes(cell) ? 'snake' : ''}`}
                          >
                            <span className="snake-cell-number">{cell}</span>
                            {(isPlayerCell || isBotCell) && (
                              <span className="snake-step-markers">
                                {isPlayerCell && <span className="snake-step-dot you">Y</span>}
                                {isBotCell && <span className="snake-step-dot bot">A</span>}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="brain-games-actions">
                    <button type="button" className="feature-item-btn active" onClick={rollSnake} disabled={snakeTurn !== 'player' || snakeOver}>Roll Dice</button>
                    <button type="button" className="feature-item-btn" onClick={resetSnake}>Reset</button>
                    <button type="button" className="feature-item-btn" onClick={closeGame}>Off</button>
                  </div>
                  <p className="fun-challenge-feedback">{snakeMessage}</p>
                  <ul className="fun-move-log" aria-label="Snake and ladder move log">
                    {(snakeMoveLog.length ? snakeMoveLog : ['No moves yet.']).map((entry, index) => (
                      <li key={`snake-log-${index}-${entry}`}>{entry}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedGame === 'trivia' && (
                <div className="fun-game-stage">
                  <div className="fun-challenge-meta">
                    <span className="fun-meta-chip">Question: {triviaIndex + 1}/{triviaQuestions.length}</span>
                    <span className="fun-meta-chip">Score: {triviaScore}</span>
                    <span className="fun-meta-chip">Status: {triviaDone ? 'Completed' : triviaSelected ? 'Answered' : 'Live'}</span>
                  </div>
                  <div className="trivia-card">
                    <p className="trivia-question">{activeTrivia.question}</p>
                    <p className="trivia-hint">Hint: {activeTrivia.hint}</p>
                    <div className="trivia-options" role="listbox" aria-label="Trivia options">
                      {activeTrivia.options.map((option) => {
                        const isSelected = triviaSelected === option;
                        const isCorrect = triviaDone || triviaSelected ? option === activeTrivia.answer : false;
                        const isWrong = triviaSelected === option && option !== activeTrivia.answer;

                        return (
                          <button
                            key={option}
                            type="button"
                            className={`trivia-option ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                            onClick={() => submitTriviaAnswer(option)}
                            disabled={triviaDone || Boolean(triviaSelected)}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="brain-games-actions">
                    <button type="button" className="feature-item-btn active" onClick={nextTriviaQuestion} disabled={triviaDone && triviaIndex >= triviaQuestions.length - 1}>Next</button>
                    <button type="button" className="feature-item-btn" onClick={resetTrivia}>Reset</button>
                    <button type="button" className="feature-item-btn" onClick={closeGame}>Off</button>
                  </div>
                  <p className="fun-challenge-feedback">{triviaResult}</p>
                </div>
              )}

              {selectedGame === 'word' && (
                <div className="fun-game-stage">
                  <div className="fun-challenge-meta">
                    <span className="fun-meta-chip">You: {playerWords.length}</span>
                    <span className="fun-meta-chip">AI: {botWords.length}</span>
                    <span className="fun-meta-chip">Selection: {selectedWord || '--'}</span>
                  </div>
                  <div className="word-list-ribbon">
                    {wordList.map((word) => (
                      <span
                        key={word}
                        className={`word-ribbon-chip ${playerWords.includes(word) ? 'found' : ''} ${botWords.includes(word) ? 'bot-found' : ''}`}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                  <div className="word-search-grid" aria-label="Word matching grid">
                    {wordGrid.map((row, r) =>
                      row.split('').map((letter, c) => {
                        const key = `${r}-${c}`;
                        const isSelected = selectedCells.some((cell) => cell.r === r && cell.c === c);
                        const isPlayerFound = playerCellKeys.includes(key);
                        const isBotFound = botCellKeys.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`word-grid-cell ${isSelected ? 'selected' : ''} ${isPlayerFound ? 'found' : ''} ${isBotFound ? 'bot-found' : ''}`}
                            onClick={() => toggleWordCell(r, c)}
                          >
                            {letter}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="brain-games-actions">
                    <button type="button" className="feature-item-btn active" onClick={submitWordSelection} disabled={totalFoundWords >= wordList.length}>Submit Word</button>
                    <button type="button" className="feature-item-btn" onClick={clearWordSelection}>Clear Selection</button>
                    <button type="button" className="feature-item-btn" onClick={resetWordGame}>Reset</button>
                    <button type="button" className="feature-item-btn" onClick={closeGame}>Off</button>
                  </div>
                  <p className="fun-challenge-feedback">{wordMessage}</p>
                </div>
              )}
            </section>
          </div>
        )}

      </div>
    </div>
  );
}

const breaks = [
  {
    name: 'Focus Music',
    note: 'Calm lo-fi and concentration playlists for productive sessions.',
    goal: 'Audio reset',
    duration: '5-15 min',
    icon: <IoHeadsetOutline />,
  },
  {
    name: 'Mini Brain Games',
    note: 'Quick puzzle bursts to refresh memory and sharpen focus.',
    goal: 'Brain warmup',
    duration: '3-8 min',
    icon: <IoGameControllerOutline />,
  },
  {
    name: 'Ambient Sound',
    note: 'Rain, cafe, and nature soundscapes for deep concentration.',
    goal: 'Calm focus',
    duration: '10-25 min',
    icon: <IoMusicalNotesOutline />,
  },
  {
    name: 'Fun Challenges',
    note: 'Short challenge tasks to re-energize your study momentum.',
    goal: 'Energy boost',
    duration: '4-10 min',
    icon: <IoRocketOutline />,
  },
];

export default function BreakZone() {
  const [activeAmbient, setActiveAmbient] = useState(ambientSoundscapes[0].id);
  const selectedAmbient = ambientSoundscapes.find((sound) => sound.id === activeAmbient) || ambientSoundscapes[0];
  const breakTips = [
    'Take a short break every 45-60 minutes',
    'Choose one reset mode only, avoid over-switching',
    'Return to study with one clear next task',
  ];

  return (
    <div className="module-page break-zone-page">
      <FloatingParticles />
      <GradientMesh colors={['#5a2a1a', '#9a4d2e', '#d18b61']} />
      
      <motion.div
        className="module-hero break-zone-hero"
        style={{ background: 'linear-gradient(135deg, rgba(90,42,26,0.7), rgba(154,77,46,0.5), rgba(209,139,97,0.4))' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="module-hero-content">
          <h1>Break Zone</h1>
          <p>Reset your energy with short mindful breaks between study sessions.</p>
          <div className="break-zone-hero-strip">
            <span>Smart Break System</span>
            <span>5 Activity Modes</span>
            <span>Focus Recovery</span>
          </div>
        </div>
      </motion.div>

      <div className="break-zone-tip-strip">
        {breakTips.map((tip) => (
          <div key={tip} className="break-zone-tip-chip">{tip}</div>
        ))}
      </div>

      <div className="feature-grid break-zone-grid">
        {breaks.map((item, idx) => (
          <motion.div
            key={item.name}
            className={`feature-card break-zone-card ${item.name === 'Mini Brain Games' ? 'brain-games-card' : ''} ${item.name === 'Fun Challenges' ? 'fun-challenge-card' : ''}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -10, scale: 1.015 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            <div className="module-card-illustration" style={{ opacity: 0.08, transform: idx % 2 === 0 ? 'rotate(-5deg)' : 'rotate(8deg)' }}>
              {item.icon}
            </div>
            <div className="feature-card-header">
              <div className="feature-card-icon" style={{ background: 'rgba(90,42,26,0.14)', color: '#5a2a1a' }}>
                {item.icon}
              </div>
              <div>
                <div className="feature-card-title">{item.name}</div>
                <div className="feature-card-subtitle">{item.goal}</div>
              </div>
              <span className="break-zone-time-pill">{item.duration}</span>
            </div>
            <div className="feature-card-body">
              <div className="feature-item">
                <div className="feature-item-icon" style={{ background: 'rgba(90,42,26,0.14)', color: '#5a2a1a' }}>
                  <IoCafeOutline />
                </div>
                {item.note}
              </div>
              {item.name === 'Focus Music' && (
                <div style={{ marginTop: '0.9rem' }}>
                  <iframe
                    data-testid="embed-iframe"
                    style={{ borderRadius: '12px' }}
                    src="https://open.spotify.com/embed/playlist/5ooiWnZqkbhF9bv8myDTma?utm_source=generator"
                    width="100%"
                    height="352"
                    frameBorder="0"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title="Focus Music Spotify Playlist"
                  />
                </div>
              )}
              {item.name === 'Ambient Sound' && (
                <div className="ambient-sound-panel">
                  <div className="ambient-sound-tabs" role="tablist" aria-label="Ambient Sound Options">
                    {ambientSoundscapes.map((sound) => (
                      <button
                        key={sound.id}
                        type="button"
                        className={`feature-item-btn ${activeAmbient === sound.id ? 'active' : ''}`}
                        onClick={() => setActiveAmbient(sound.id)}
                      >
                        {sound.title}
                      </button>
                    ))}
                  </div>

                  <p className="ambient-sound-note">{selectedAmbient.note}</p>

                  <div className="ambient-player-shell">
                    <iframe
                      src={selectedAmbient.embedUrl}
                      title={`${selectedAmbient.title} ambience`}
                      width="100%"
                      height="260"
                      style={{ border: 0, borderRadius: '12px' }}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
              {item.name === 'Fun Challenges' && <FunChallengesPanel />}
              {item.name === 'Mini Brain Games' && <MiniBrainGames />}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
