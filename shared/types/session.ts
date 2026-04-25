export interface TestSessionDTO {
    id: string;
    userId: string;
    testId: string;
    score: number;
    startedAt: string;
    finishedAt?: string;
}