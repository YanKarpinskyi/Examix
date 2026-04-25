import { UserDTO } from "./user";
import { TestDTO } from "./test";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: UserDTO;
}

export interface GetTestsResponse {
    tests: TestDTO[];
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  token: string;
  user: UserDTO;
}

export interface GetMeResponse {
  user: UserDTO;
}

export interface GetTestByIdResponse {
  test: TestDTO;
}

export interface SubmitTestRequest {
  answers: {
    questionId: string;
    answer: string | string[];
  }[];
}

export interface SubmitTestResponse {
  score: number;
  correctAnswers: number;
}