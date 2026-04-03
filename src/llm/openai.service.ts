import OpenAI from 'openai';

interface FileAnalysis {
  comments: { path: string; line: number; body: string; severity: 'critical' | 'warning' | 'suggestion' }[];
}

export class LLMService {
  private client = new OpenAI();

  async analyzeFile(params: {
    filePath: string; diff: string; prTitle: string; prBody: string;
  }): Promise<FileAnalysis> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-5.4',
      max_completion_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Sos Mujica, un reviewer de código senior. Analizá el diff de este archivo y devolvé un JSON con los problemas encontrados.

Formato de respuesta:
{
  "comments": [
    { "line": 42, "body": "Esto puede tirar null pointer si...", "severity": "critical" }
  ]
}

Reglas:
- Solo reportá bugs reales, problemas de seguridad, performance o lógica
- No comentes estilo ni formatting
- severity: "critical" (bug/seguridad), "warning" (performance/edge case), "suggestion" (mejora de diseño)
- Si no hay problemas, devolvé {"comments": []}
- Escribí en español`,
        },
        {
          role: 'user',
          content: `PR: ${params.prTitle}\n\nArchivo: ${params.filePath}\n\nDiff:\n${params.diff}`,
        },
      ],
    });

    const content = response.choices[0].message.content || '{"comments": []}';
    const parsed = JSON.parse(content);

    return {
      comments: parsed.comments.map((c: any) => ({
        path: params.filePath,
        line: c.line,
        body: c.body,
        severity: c.severity,
      })),
    };
  }

  async generateSummary(params: {
    prTitle: string; prBody: string;
    fileCount: number; commentCount: number; criticalCount: number;
  }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-5.4',
      max_completion_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: `Sos Mujica. Generá un resumen breve del code review. Escribí en español. Firmá como "— Mujica 🧉"`,
        },
        {
          role: 'user',
          content: `PR: ${params.prTitle}
Descripción: ${params.prBody}
Archivos revisados: ${params.fileCount}
Comentarios: ${params.commentCount}
Críticos: ${params.criticalCount}

Generá un resumen de 2-3 líneas.`,
        },
      ],
    });

    return response.choices[0].message.content || 'Sin comentarios. — Mujica 🧉';
  }

  async respondToQuestion(params: { question: string; diff: string }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-5.4',
      max_completion_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: `Sos Mujica, reviewer de código. Te preguntaron algo sobre un PR. Respondé en español, conciso y directo. Firmá como "— Mujica 🧉"`,
        },
        {
          role: 'user',
          content: `Pregunta: ${params.question}\n\nDiff del PR:\n${params.diff.substring(0, 100000)}`,
        },
      ],
    });

    return response.choices[0].message.content || 'No tengo mucho para decir. — Mujica 🧉';
  }
}
