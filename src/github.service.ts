import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

export class GitHubService {
  private async getOctokit(installationId: number): Promise<Octokit> {
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GITHUB_APP_ID!,
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
        installationId,
      },
    });
  }

  async getPRDiff(installationId: number, owner: string, repo: string, prNumber: number) {
    const octokit = await this.getOctokit(installationId);
    const { data } = await octokit.pulls.get({
      owner, repo,
      pull_number: prNumber,
      mediaType: { format: 'diff' },
    });
    return data as unknown as string;
  }

  async getPRFiles(installationId: number, owner: string, repo: string, prNumber: number) {
    const octokit = await this.getOctokit(installationId);
    const { data } = await octokit.pulls.listFiles({
      owner, repo,
      pull_number: prNumber,
    });
    return data;
  }

  // Comentario inline en línea específica del diff
  async postInlineComment(
    installationId: number,
    owner: string, repo: string, prNumber: number,
    params: { path: string; line: number; body: string; commitId: string },
  ) {
    const octokit = await this.getOctokit(installationId);
    await octokit.pulls.createReviewComment({
      owner, repo,
      pull_number: prNumber,
      body: params.body,
      path: params.path,
      line: params.line,
      commit_id: params.commitId,
    });
  }

  // Review completa con múltiples comentarios inline
  async submitReview(
    installationId: number,
    owner: string, repo: string, prNumber: number,
    params: {
      body: string;
      event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES';
      comments: { path: string; line: number; body: string }[];
      commitId: string;
    },
  ) {
    const octokit = await this.getOctokit(installationId);
    await octokit.pulls.createReview({
      owner, repo,
      pull_number: prNumber,
      body: params.body,
      event: params.event,
      commit_id: params.commitId,
      comments: params.comments,
    });
  }

  // Comentario general en el PR
  async postComment(
    installationId: number,
    owner: string, repo: string, prNumber: number,
    body: string,
  ) {
    const octokit = await this.getOctokit(installationId);
    await octokit.issues.createComment({
      owner, repo,
      issue_number: prNumber,
      body,
    });
  }
}
