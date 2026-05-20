export interface GroupDTO {
    id: string;
    name: string;
    teacherId: string;
    createdAt: string;
}

export interface GroupAssignmentDTO {
    id: string;
    groupId: string;
    testId: string;
    dueDate?: string;
    createdAt: string;
}

export interface ReviewOpenAnswerDTO {
    answerId: string;
    isCorrect: boolean;
    points: number;
}