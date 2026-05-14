export type QuestionType =
    | "single"
    | "multiple"
    | "matching"
    | "order"
    | "sequense";

export interface AnswerOption {
    id: string;
    text: string;
    isCorrect?: boolean;
}

export interface QuestionDTO {
    id: string;
    text: string;
    type: QuestionType;
    options?: AnswerOption[];
    topicId: string;
}