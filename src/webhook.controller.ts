import { ReviewService } from './review.service';

const reviewService = new ReviewService();

export async function handleWebhook(event: string, payload: any) {
  if (event === 'pull_request') {
    const action = payload.action;
    if (action === 'opened' || action === 'synchronize') {
      await reviewService.reviewPR({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        prNumber: payload.pull_request.number,
        prTitle: payload.pull_request.title,
        prBody: payload.pull_request.body,
        baseBranch: payload.pull_request.base.ref,
        headBranch: payload.pull_request.head.ref,
        isDraft: payload.pull_request.draft,
        installationId: payload.installation.id,
      });
    }
  }

  // Interacción: alguien comenta "@mujica revisá esto"
  if (event === 'issue_comment') {
    const body = payload.comment.body;
    if (body.includes('@mujica') && payload.issue.pull_request) {
      await reviewService.respondToComment({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        prNumber: payload.issue.number,
        comment: body,
        installationId: payload.installation.id,
      });
    }
  }
}
