import { memo, useMemo } from 'react';
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
  const optionsArray = useMemo(() => {
    if (!question.options) return [];
    try {
      return typeof question.options === "string" ? JSON.parse(question.options) : question.options;
    } catch (e) {
      console.error("Помилка парсингу options:", e);
      return [];
    }
  }, [question.options]);
  
  console.log("Current question type from DB:", question.type);
  console.log("❌ ПОВНИЙ ОБ'ЄКТ ПИТАННЯ:", question);

  // let optionsArray: any[] = [];
  // if (question.options) {
  //   optionsArray = typeof question.options === "string" 
  //     ? JSON.parse(question.options) 
  //     : (Array.isArray(question.options) ? question.options : []);
  // }

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

      case 'matching': case 'match': {
        const data = Array.isArray(optionsArray) ? optionsArray : [];
        
        let leftSide: string[] = [];
        let rightSide: string[] = [];

        data.forEach((item: any) => {
          const fullText = item.text || String(item);
          
          if (fullText.includes('—')) {
            const [l, r] = fullText.split('—').map((s: string) => s.trim());
            leftSide.push(l.replace(/^\d+$/, ''));
            rightSide.push(r);
          } else {
            leftSide.push(fullText);
            rightSide.push("?");
          }
        });

        const currentMatches = savedAnswer || {};

        return (
          <div className="matching-question">
            <h3>{renderMath(question.content)}</h3>
            <div className="matching-container">
              <div className="left-side" style={{ width: '100%' }}>
                {leftSide.map((text, idx) => (
                  <div key={idx} className="matching-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px'}}>
                    <span style={{ marginRight: '10px', fontWeight: 'bold' }}>{idx + 1}.</span>
                    <span style={{ marginRight: '10px' }}>{renderMath(text)}</span>
                    
                    <select 
                      value={currentMatches[idx] || ''} 
                      onChange={(e) => onAnswer({ ...currentMatches, [idx]: e.target.value })} 
                      disabled={showResult}
                    >
                      <option value="">Оберіть...</option>
                      {rightSide.map((rText, rIdx) => (
                        <option key={rIdx} value={rText}>{rText}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

    case 'sequence':
    case 'order': {
        let flatOptions: string[] = [];

        if (question.options) {
            const optionsRaw = Array.isArray(question.options) 
                ? question.options 
                : typeof question.options === 'string' 
                    ? JSON.parse(question.options) 
                    : [];

            if (Array.isArray(optionsRaw) && typeof optionsRaw[0] === 'string') {
                flatOptions = optionsRaw;
            } 
            else if (Array.isArray(optionsRaw) && optionsRaw[0] && typeof optionsRaw[0] === 'object') {
                flatOptions = optionsRaw.map(opt => 
                    opt?.text || opt?.content || String(opt)
                );
            } 
            else if (Array.isArray(optionsRaw) && optionsRaw.every(o => ['0','1','2','3','4'].includes(String(o)))) {
                console.warn("⚠️ У питання sequence/order прийшли індекси замість тексту!", optionsRaw);
                flatOptions = optionsRaw.map(String);  
            }
        }

        if (flatOptions.length === 0) {
            flatOptions = ["Варіант 1", "Варіант 2", "Варіант 3", "Варіант 4"];
        }

        const currentOrder = Array.isArray(savedAnswer) && savedAnswer.length > 0 
            ? savedAnswer 
            : [...flatOptions]; 

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
                                    <button 
                                        disabled={idx === 0} 
                                        onClick={() => moveItem(idx, 'up')}
                                    >
                                        ↑
                                    </button>
                                    <button 
                                        disabled={idx === currentOrder.length - 1} 
                                        onClick={() => moveItem(idx, 'down')}
                                    >
                                        ↓
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {showResult && question.correct_answer && (
                    <div className="correct-sequence">
                        <strong>Правильна послідовність: </strong>
                        {(() => {
                            let correct = question.correct_answer;
                            if (typeof correct === 'string') {
                                try {
                                    correct = JSON.parse(correct);
                                } catch {}
                            }
                            return Array.isArray(correct) 
                                ? correct.join(' → ') 
                                : String(correct);
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