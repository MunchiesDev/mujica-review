export interface PullRequestWebhookPayload {
  action: 'opened' | 'synchronize' | 'closed' | 'reopened';
  pull_request: {
    number: number;
    title: string;
    body: string;
    draft: boolean;
    base: { ref: string };
    head: { ref: string; sha: string };
  };
  repository: {
    owner: { login: string };
    name: string;
  };
  installation: { id: number };
}

export interface IssueCommentWebhookPayload {
  action: 'created' | 'edited' | 'deleted';
  comment: {
    body: string;
    user: { login: string };
  };
  issue: {
    number: number;
    pull_request?: { url: string };
  };
  repository: {
    owner: { login: string };
    name: string;
  };
  installation: { id: number };
}

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
  severity: 'critical' | 'warning' | 'suggestion';
}
