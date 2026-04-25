export type QuestionType =
    | "single"
    | "multiple"
    | "match"
    | "order"
    | "open";

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