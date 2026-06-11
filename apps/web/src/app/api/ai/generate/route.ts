import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@liberscript/auth';
import { prisma } from '@liberscript/db';
import { AiProvider, OwnerType } from '@liberscript/core';
import { resolvePlanLimits } from '@/server/lib/plan';
import { decryptApiKey } from '@/server/lib/crypto';
import { streamAiText } from '@/server/lib/ai-client';

const bodySchema = z.object({
  projectId: z.string(),
  /** Specific chapter ID for context (used in continue/rewrite modes). */
  chapterId: z.string().optional(),
  /** Which provider to prefer. Falls back to any configured key. */
  provider: z.nativeEnum(AiProvider).optional(),
  /** Model override. */
  model: z.string().optional(),
  /**
   * continue  — keep writing from the end of the current chapter
   * chapter   — write a full chapter draft from a topic/instruction
   * outline   — produce a JSON book outline (title, chapters[])
   * rewrite   — rewrite the provided `selection` text
   * ai-critique — editorial analysis of the full manuscript
   */
  mode: z.enum(['continue', 'chapter', 'outline', 'rewrite', 'ai-critique']),
  /** User's instruction / topic description. */
  prompt: z.string().max(4000),
  /** Existing chapter text — provided in continue/rewrite/ai-critique modes. */
  context: z.string().max(32000).optional(),
  /** The portion of text to rewrite (rewrite mode). */
  selection: z.string().max(8000).optional(),
  /** Book-level metadata for better context. */
  bookTitle: z.string().optional(),
  bookGenre: z.string().optional(),
});

function buildSystemPrompt(
  mode: z.infer<typeof bodySchema>['mode'],
  bookTitle?: string,
  bookGenre?: string,
): string {
  const bookCtx = [bookTitle && `Book title: "${bookTitle}"`, bookGenre && `Genre: ${bookGenre}`]
    .filter(Boolean)
    .join('. ');

  const base = `You are a professional manuscript writing assistant helping an author write and refine their book.${bookCtx ? ` ${bookCtx}.` : ''} Write in a natural, engaging prose style appropriate for the genre. Do not add meta-commentary, author notes, or explanations — output only the manuscript content requested.`;

  switch (mode) {
    case 'continue':
      return `${base} Continue writing the chapter from where the author left off. Match the established voice, tense, and style. Write 300–600 words of natural continuation.`;
    case 'chapter':
      return `${base} Write a complete chapter draft based on the author's description. Include vivid scene-setting, character action, and dialogue as appropriate. Aim for 800–1500 words unless instructed otherwise.`;
    case 'outline':
      return `${base} Generate a structured book outline. Respond with ONLY valid JSON in this exact format, no markdown, no commentary:\n{"title":"string","tagline":"string","chapters":[{"number":1,"title":"string","summary":"string (1-2 sentences)"}]}\nGenerate 10–20 chapters appropriate for the genre and premise.`;
    case 'rewrite':
      return `${base} Rewrite the provided text according to the author's instructions. Preserve the meaning and key information while improving the prose. Output only the rewritten text.`;
    case 'ai-critique':
      return `You are an experienced developmental editor and literary critic. Analyze the provided manuscript and give structured editorial feedback. Respond with ONLY valid JSON in this format, no markdown:\n{"summary":"string","score":number (0-100),"findings":[{"category":"string","severity":"info"|"warn"|"high","label":"string","guidance":"string","examples":["string"]}]}\nCategories to analyse: plot_structure, character_development, pacing, voice_consistency, theme, dialogue, show_vs_tell, world_building (if applicable).`;
    default:
      return base;
  }
}

export async function POST(req: NextRequest) {
  // Auth
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return new Response(`Bad request: ${String(err)}`, { status: 400 });
  }

  const userId = session.user.id;
  const activeOrgId = session.session.activeOrganizationId ?? null;
  const ownerType = activeOrgId ? OwnerType.ORGANIZATION : OwnerType.USER;
  const ownerId = activeOrgId ?? userId;

  // Plan gate
  const limits = await resolvePlanLimits(prisma, ownerType, ownerId);
  if (!limits.aiEnabled) {
    return new Response('AI features require a Pro or Team plan.', { status: 403 });
  }

  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    select: { id: true, ownerType: true, ownerId: true, title: true },
  });
  if (!project || project.ownerType !== ownerType || project.ownerId !== ownerId) {
    return new Response('Project not found.', { status: 404 });
  }

  // Resolve API key
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      ownerType,
      ownerId,
      ...(body.provider ? { provider: body.provider } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!apiKey) {
    return new Response('No AI API key configured. Add one in Settings → AI Keys.', { status: 422 });
  }

  let decryptedKey: string;
  try {
    decryptedKey = decryptApiKey(apiKey.ciphertext, apiKey.iv, apiKey.authTag);
  } catch {
    return new Response('Failed to decrypt API key.', { status: 500 });
  }

  // Build prompts
  const systemPrompt = buildSystemPrompt(
    body.mode,
    body.bookTitle ?? project.title,
    body.bookGenre,
  );

  let userPrompt: string;
  switch (body.mode) {
    case 'continue':
      userPrompt = [
        body.context ? `Current chapter so far:\n\n${body.context}` : null,
        body.prompt ? `Author's note: ${body.prompt}` : null,
        'Continue writing from here.',
      ]
        .filter(Boolean)
        .join('\n\n');
      break;
    case 'chapter':
      userPrompt = body.prompt;
      break;
    case 'outline':
      userPrompt = body.prompt;
      break;
    case 'rewrite':
      userPrompt = [
        body.selection ? `Text to rewrite:\n\n${body.selection}` : null,
        `Instructions: ${body.prompt}`,
      ]
        .filter(Boolean)
        .join('\n\n');
      break;
    case 'ai-critique':
      userPrompt = [
        body.context ? `Manuscript:\n\n${body.context}` : null,
        body.prompt ? `Focus areas: ${body.prompt}` : null,
      ]
        .filter(Boolean)
        .join('\n\n');
      break;
    default:
      userPrompt = body.prompt;
  }

  // Stream response
  const textStream = streamAiText({
    provider: apiKey.provider as AiProvider,
    decryptedKey,
    model: body.model,
    systemPrompt,
    userPrompt,
  });

  // Encode text chunks as SSE events
  const encoder = new TextEncoder();
  const sseStream = new ReadableStream({
    async start(ctrl) {
      const reader = textStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            ctrl.enqueue(encoder.encode('data: [DONE]\n\n'));
            ctrl.close();
            break;
          }
          // Each chunk is a JSON-encoded SSE data line
          ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ text: value })}\n\n`));
        }
      } catch (err) {
        ctrl.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`),
        );
        ctrl.close();
      }
    },
  });

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
