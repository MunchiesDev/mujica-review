import { GitHubService } from './github.service';
import { LLMService } from './llm/openai.service';
import { parseDiff } from './analysis/diff-parser';

interface ReviewRequest {
  owner: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  prBody: string;
  baseBranch: string;
  headBranch: string;
  isDraft: boolean;
  installationId: number;
}

interface InlineComment {
  path: string;
  line: number;
  body: string;
  severity: 'critical' | 'warning' | 'suggestion';
}

export class ReviewService {
  private github = new GitHubService();
  private llm = new LLMService();

  async reviewPR(request: ReviewRequest) {
    if (request.isDraft) return;

    const diff = await this.github.getPRDiff(
      request.installationId, request.owner, request.repo, request.prNumber,
    );
    const files = await this.github.getPRFiles(
      request.installationId, request.owner, request.repo, request.prNumber,
    );

    // Filtrar archivos que no queremos revisar
    const relevantFiles = files.filter(f =>
      !f.filename.includes('migrations/') &&
      !f.filename.includes('package-lock') &&
      !f.filename.endsWith('.json') &&
      f.status !== 'removed'
    );

    if (!relevantFiles.length) {
      await this.github.postComment(
        request.installationId, request.owner, request.repo, request.prNumber,
        '## 🧉 Mujica\n\nNo hay nada que revisar acá. Todo bien.',
      );
      return;
    }

    // Parsear diff en chunks por archivo
    const diffFiles = parseDiff(diff);

    // Analizar cada archivo con el LLM
    const allComments: InlineComment[] = [];

    for (const file of diffFiles) {
      if (!relevantFiles.find(f => f.filename === file.path)) continue;

      const analysis = await this.llm.analyzeFile({
        filePath: file.path,
        diff: file.content,
        prTitle: request.prTitle,
        prBody: request.prBody,
      });

      allComments.push(...analysis.comments);
    }

    // Generar resumen general
    const overallSummary = await this.llm.generateSummary({
      prTitle: request.prTitle,
      prBody: request.prBody,
      fileCount: relevantFiles.length,
      commentCount: allComments.length,
      criticalCount: allComments.filter(c => c.severity === 'critical').length,
    });

    // Decidir tipo de review
    const hasCritical = allComments.some(c => c.severity === 'critical');
    const event = hasCritical ? 'REQUEST_CHANGES' : 'COMMENT';
    const commitId = files[0]?.sha || '';

    if (allComments.length > 0) {
      // Submit review con comentarios inline
      await this.github.submitReview(
        request.installationId, request.owner, request.repo, request.prNumber,
        {
          body: `## 🧉 Mujica\n\n${overallSummary}`,
          event,
          commitId,
          comments: allComments.map(c => ({
            path: c.path,
            line: c.line,
            body: `${c.severity === 'critical' ? '🔴' : c.severity === 'warning' ? '⚠️' : '💡'} ${c.body}`,
          })),
        },
      );
    } else {
      await this.github.postComment(
        request.installationId, request.owner, request.repo, request.prNumber,
        `## 🧉 Mujica\n\n${overallSummary}`,
      );
    }
  }

  async respondToComment(params: {
    owner: string; repo: string; prNumber: number;
    comment: string; installationId: number;
  }) {
    const diff = await this.github.getPRDiff(
      params.installationId, params.owner, params.repo, params.prNumber,
    );

    const response = await this.llm.respondToQuestion({
      question: params.comment,
      diff,
    });

    await this.github.postComment(
      params.installationId, params.owner, params.repo, params.prNumber,
      `## 🧉 Mujica\n\n${response}`,
    );
  }
}
