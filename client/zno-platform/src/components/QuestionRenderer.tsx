import { memo } from 'react';
import "./QuestionRenderer.scss";
import 'katex/dist/katex.min.css';
import katex from 'katex';

const renderMath = (text: any) => {
  if (text === null || text === undefined) return "";
  const stringText = String(text);
  if (!stringText.includes('$')) return stringText;

  const parts = stringText.split(/(\$.*?\$)/g);
  return parts.map((part, index) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const formula = part.slice(1, -1);
      try {
        const html = katex.renderToString(formula, {
          throwOnError: false,
          displayMode: false
        });
        return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
      } catch (e) {
        console.error("KaTeX error:", e);
        return <span key={index}>{part}</span>;
      }
    }
    return part;
  });
};

interface Props {
  question: any;
  onAnswer: (val: any) => void;
  savedAnswer: any;
  showResult: boolean;
}

const QuestionRenderer = memo(({ question, onAnswer, savedAnswer, showResult }: Props) => {
  console.log("Current question type from DB:", question.type);
  console.log("❌ ПОВНИЙ ОБ'ЄКТ ПИТАННЯ:", question);

  let optionsArray: any[] = [];
  if (question.options) {
    optionsArray = typeof question.options === "string" 
      ? JSON.parse(question.options) 
      : (Array.isArray(question.options) ? question.options : []);
  }

  const getOptionText = (opt: any): string => {
    if (!opt) return "";
    if (typeof opt === 'string') return opt;
    if (typeof opt === 'object') {
      return opt.text || opt.option || opt.value || (opt.content && typeof opt.content === 'string' ? opt.content : JSON.stringify(opt));
    }
    return String(opt);
  };

  const getOptionByLetter = (letter: string, options: any[]) => {
    const alphabet = ['А', 'Б', 'В', 'Г', 'Д'];
    const index = alphabet.indexOf(letter.toUpperCase());
    if (index !== -1 && options[index]) {
      return getOptionText(options[index]);
    }
    return letter;
  };

  switch (question.type) {
    case 'single':
    case 'choice':
      return (
        <div className="options-list">
          <h3>{renderMath(question.content)}</h3>
          {optionsArray.map((opt: any, index: number) => {
            const alphabet = ['А', 'Б', 'В', 'Г', 'Д'];
            
            const optionText = getOptionText(opt);
            
            let isCorrect = false;
            if (showResult) {
              if (Array.isArray(question.correct_answer)) {
                isCorrect = question.correct_answer.map((i: any) => String(i).trim()).includes(optionText.trim());
              } else {
                isCorrect = optionText.trim() === String(question.correct_answer).trim() || alphabet[index] === question.correct_answer;
              }
            }

            return (
              <label key={index} className={`opt-label ${isCorrect ? 'correct' : ''}`}>
                <input 
                  type="radio" 
                  checked={String(savedAnswer).trim() === optionText.trim()} 
                  onChange={() => onAnswer(optionText)} 
                  disabled={showResult} 
                />
                {renderMath(optionText)}
              </label>
            );
          })}

          {showResult && (
            <div className="correct-answer-info">
              <strong>Правильна відповідь: </strong>
              {(() => {
                if (Array.isArray(question.correct_answer)) {
                  return question.correct_answer.join(', ');
                }
                if (question.correct_answer?.length === 1) {
                  return `${question.correct_answer}) ${getOptionByLetter(question.correct_answer, optionsArray)}`;
                }
                return question.correct_answer;
              })()}
            </div>
          )}
        </div>
      );

    case 'multiple':
    case 'multiple_choice':
      return (
        <div className="options-list">
          <h3>{renderMath(question.content)} (Виберіть декілька)</h3>
          {optionsArray.map((opt: any, idx: number) => {
            const optionText = getOptionText(opt);
            const isChecked = Array.isArray(savedAnswer) && savedAnswer.includes(optionText);

            return (
              <label key={idx} className="opt-label">
                <input 
                  type="checkbox" 
                  checked={isChecked} 
                  disabled={showResult} 
                  onChange={() => {
                    const current = Array.isArray(savedAnswer) ? savedAnswer : [];
                    const next = isChecked ? current.filter(i => i !== optionText) : [...current, optionText];
                    onAnswer(next);
                  }} 
                />
                {renderMath(optionText)}
              </label>
            );
          })}
        </div>
      );

    case 'matching':
    case 'match': {
      const leftSide = question.options?.left || optionsArray.map((o: any) => {
        const txt = getOptionText(o);
        return txt.includes('—') ? txt.split('—')[0]?.trim() : txt;
      });
      
      const rightSide = question.options?.right || optionsArray.map((o: any) => {
        const txt = getOptionText(o);
        return txt.includes('—') ? txt.split('—')[1]?.trim() : null;
      }).filter(Boolean);

      const currentMatches = savedAnswer || {};

      return (
        <div className="matching-question">
          <h3>{renderMath(question.content)}</h3>
          <div className="matching-container">
            <div className="left-side">
              {leftSide.map((text: string, idx: number) => (
                <div key={idx} className="matching-row">
                  <strong>{idx + 1}.</strong> {renderMath(text)}
                  <select 
                    value={currentMatches[idx] || ''} 
                    onChange={(e) => onAnswer({ ...currentMatches, [idx]: e.target.value })}
                    disabled={showResult}
                  >
                    <option value="">?</option>
                    {rightSide.map((rText: string, rIdx: number) => (
                      <option key={rIdx} value={rText}>
                        {String(rText).replace(/\$/g, '')}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {question.options?.right && (
                <div className="right-side-legend" style={{ marginTop: '20px', borderTop: '1px solid #eee' }}>
                    <h4>Варіанти відповіді:</h4>
                    {rightSide.map((text: string, idx: number) => {
                    const letters = ['А', 'Б', 'В', 'Г', 'Д'];
                    return (
                        <div key={idx} style={{ marginBottom: '4px' }}>
                        <strong>{letters[idx]})</strong> {renderMath(text)}
                        </div>
                    );
                    })}
                </div>
            )}
          </div>
        </div>
      );
    }

    case 'sequence':
    case 'order': {
        let flatOptions: string[] = [];
  
        if (Array.isArray(optionsArray)) {
          if (optionsArray[0] && typeof optionsArray[0] === 'object' && optionsArray[0].text) {
            try {
              const parsed = JSON.parse(optionsArray[0].text);
              flatOptions = Array.isArray(parsed) ? parsed : optionsArray.map(o => getOptionText(o));
            } catch {
              flatOptions = optionsArray.map(o => getOptionText(o));
            }
          } else {
            flatOptions = optionsArray.map(getOptionText);
          }
        }
        
        const currentOrder = Array.isArray(savedAnswer) ? savedAnswer : flatOptions;

        const moveItem = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...currentOrder];
        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= newOrder.length) return;
        [newOrder[index], newOrder[nextIndex]] = [newOrder[nextIndex], newOrder[index]];
        onAnswer(newOrder);
      };

      return (
        <div className="sequence-answer">
          <h3>{renderMath(question.content)}</h3>
          <div className="sequence-list">
            {currentOrder.map((item: string, idx: number) => (
              <div key={idx} className="sequence-item">
                <span className="index">{idx + 1}.</span>
                <span className="text">{renderMath(item)}</span>
                {!showResult && (
                  <div className="controls">
                    <button disabled={idx === 0} onClick={() => moveItem(idx, 'up')}>↑</button>
                    <button disabled={idx === currentOrder.length - 1} onClick={() => moveItem(idx, 'down')}>↓</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {showResult && question.correct_answer && (
            <div className="correct-sequence">
                <strong>Правильна відповідь: </strong>
                {(() => {
                let parsedCorrect = question.correct_answer;
                if (typeof parsedCorrect === 'string') {
                    const trimmed = parsedCorrect.trim();
                    if (trimmed.startsWith('[')) {
                    try { parsedCorrect = JSON.parse(trimmed); } catch { /* ignore */ }
                    }
                }
                
                if (Array.isArray(parsedCorrect)) {
                    return parsedCorrect.join(' → ');
                }
                return String(parsedCorrect);
                })()}
            </div>
            )}
        </div>
      );
    }

    case 'short':
    case 'open':
      return (
        <div className="text-answer">
          <h3>{renderMath(question.content)}</h3>
          {question.type === 'open' ? (
            <textarea 
              value={savedAnswer || ''} 
              disabled={showResult} 
              onChange={(e) => onAnswer(e.target.value)} 
              placeholder="Ваша відповідь..." 
            />
          ) : (
            <input 
              type="text" 
              value={savedAnswer || ''} 
              disabled={showResult} 
              className='input-answer' 
              onChange={(e) => onAnswer(e.target.value)} 
              placeholder="Введіть відповідь..." 
            />
          )}
        </div>
      );

    default:
      return (
        <div className="error-placeholder">
          <h3>{renderMath(question.content)}</h3>
          <p>Тип питання <strong>"{question.type}"</strong> не розпізнано.</p>
        </div>
      );
  }
});

export default QuestionRenderer;