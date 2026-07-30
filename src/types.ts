export type QuestionType = 'multiple_choice' | 'multiple_selection' | 'rating';

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  options: Record<string, string>;
  timer?: number | null; // timer in seconds (null = manual)
  votes?: Record<string, any>;
}

export interface Session {
  code: string;
  title: string;
  status: 'active' | 'closed';
  active_question_id: string;
  active_question_activated_at?: number | null; // server timestamp
  questions: Record<string, Question>;
  active_question?: {
    id: string;
    type: QuestionType;
    title: string;
    options: Record<string, string>;
    timer?: number | null;
  } | null;
  version: number;
  expires_at?: number;
}
