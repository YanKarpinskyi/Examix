import { memo } from 'react';
import "./QuestionRenderer.scss";
import 'katex/dist/katex.min.css';
import katex from 'katex';

const renderMath = (text: any) => {
    if (text === null || text === undefined) return "";
    const stringText = String(text);

    if (!stringText.includes('$')) return stringText;

    // Розбиваємо текст на частини (текст і формули)
    const parts = stringText.split(/(\$.*?\$)/g);

    return parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
            const formula = part.slice(1, -1);
            try {
                // Генеруємо HTML рядок з формулою
                const html = katex.renderToString(formula, {
                    throwOnError: false,
                    displayMode: false // Inline режим
                });
                // Вставляємо як HTML
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

    // Витягуємо масив варіантів залежно від того, як прийшли дані
    const optionsArray = Array.isArray(question.options) 
        ? question.options 
        : (question.options?.options || question.options?.items || []);

    const getOptionByLetter = (letter: string, options: string[]) => {
        const alphabet = ['А', 'Б', 'В', 'Г', 'Д'];
        const index = alphabet.indexOf(letter.toUpperCase());
        return index !== -1 ? options[index] : letter; 
    };

    switch (question.type) {
        case 'single':
        case 'choice': 
            return (
                <div className="options-list">
                    <h3>{renderMath(question.content)}</h3>
                    {optionsArray.map((opt: string, index: number) => {
                        const alphabet = ['А', 'Б', 'В', 'Г', 'Д'];
                        // Перевіряємо відповідність і по тексту, і по букві
                        const isCorrect = showResult && (
                            opt === question.correct_answer || 
                            alphabet[index] === question.correct_answer
                        );
                        
                        return (
                            <label key={index} className={`opt-label ${isCorrect ? 'correct' : ''}`}>
                                <input 
                                    type="radio" 
                                    checked={savedAnswer === opt}
                                    onChange={() => onAnswer(opt)} 
                                    disabled={showResult}
                                />
                                {renderMath(opt)}
                            </label>
                        );
                    })}

                    {showResult && (
                        <div className="correct-answer-info">
                            <strong>Правильна відповідь: </strong> 
                            {/* Якщо в correct_answer одна буква, шукаємо її текст в масиві */}
                            {question.correct_answer?.length === 1 
                                ? `${question.correct_answer}) ${getOptionByLetter(question.correct_answer, optionsArray)}`
                                : question.correct_answer}
                        </div>
                    )}
                </div>
            );

        case 'multiple':
        case 'multiple_choice':
            return (
                <div className="options-list">
                    <h3>{renderMath(question.content)} (Виберіть декілька)</h3>
                    {optionsArray.map((opt: string) => {
                        const isChecked = Array.isArray(savedAnswer) && savedAnswer.includes(opt);
                        return (
                            <label key={opt} className="opt-label">
                                <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    disabled={showResult}
                                    onChange={() => {
                                        const current = Array.isArray(savedAnswer) ? savedAnswer : [];
                                        const next = isChecked 
                                            ? current.filter(i => i !== opt) 
                                            : [...current, opt];
                                        onAnswer(next);
                                    }} 
                                />
                                {renderMath(opt)}
                            </label>
                        );
                    })}
                </div>
            );

        case 'matching':
        case 'match': {
            const leftSide = question.options?.left || [];
            const rightSide = question.options?.right || [];
            const currentMatches = savedAnswer || {};

            return (
                <div className="matching-question">
                    <h3>{renderMath(question.content)}</h3>
                    <div className="matching-container">
                        {/* Ліві елементи з LaTeX */}
                        <div className="left-side">
                            {leftSide.map((text: string, idx: number) => (
                                <div key={idx} className="matching-row">
                                    <strong>{idx + 1}.</strong> {renderMath(text)}
                                    
                                    <select 
                                        value={currentMatches[idx] || ''} 
                                        onChange={(e) => onAnswer({ ...currentMatches, [idx]: e.target.value })}
                                    >
                                        <option value="">?</option>
                                        {rightSide.map((rText: string, rIdx: number) => (
                                            // У select виводимо текст без $, бо HTML там не відрендериться
                                            <option key={rIdx} value={rText}>
                                                {String(rText).replace(/\$/g, '')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        {/* ПРАВА СТОРОНА: Легенда варіантів з LaTeX */}
                        <div className="right-side-legend" style={{ marginTop: '20px', borderTop: '1px solid #eee', display: 'none' }}>
                            <h4>Варіанти відповіді:</h4>
                            {rightSide.map((text: string, idx: number) => {
                                const letters = ['А', 'Б', 'В', 'Г', 'Д'];
                                return (
                                    <div key={idx}>
                                        <strong>{letters[idx]})</strong> {renderMath(text)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        case 'sequence':
        case 'order':
            // Для послідовності savedAnswer має бути масивом
            const currentOrder = Array.isArray(savedAnswer) ? savedAnswer : optionsArray;
            
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
                            <div key={item} className="sequence-item">
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
                            <p>Правильна відповідь: {Array.isArray(question.correct_answer) ? question.correct_answer.join(' → ') : question.correct_answer}</p>
                        </div>
                    )}
                </div>
            );

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

export default QuestionRenderer
