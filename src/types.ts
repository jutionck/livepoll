export type QuestionType = 'multiple_choice' | 'multiple_selection' | 'rating';

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  options: Record<string, string>;
  timer?: number | null;
  votes?: Record<string, any>;
  correct_answer?: string[] | null;
}

export interface Session {
  code: string;
  title: string;
  status: 'active' | 'closed';
  is_quiz?: boolean;
  host_name?: string | null;
  host_org?: string | null;
  active_question_id: string;
  active_question_activated_at?: number | null;
  questions: Record<string, Question>;
  active_question?: {
    id: string;
    type: QuestionType;
    title: string;
    options: Record<string, string>;
    timer?: number | null;
    has_answer?: boolean;
  } | null;
  version: number;
  expires_at?: number;
}
