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
    content: string;
    type: QuestionType;
    options?: any[];
    correct_answer?: any;
    points?: number;
    topic_id?: string;
    image_url?: string | null; 
    created_at?: string;
}