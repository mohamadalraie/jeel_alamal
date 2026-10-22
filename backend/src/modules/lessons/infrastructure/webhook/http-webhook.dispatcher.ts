import { Injectable, Logger } from '@nestjs/common';
import type {
  LessonReportWebhookPayload,
  WebhookDispatchResult,
  WebhookDispatcherPort,
} from '../../domain/webhook-dispatcher.port';

@Injectable()
export class HttpWebhookDispatcher implements WebhookDispatcherPort {
  private readonly logger = new Logger(HttpWebhookDispatcher.name);

  async dispatchReport(
    payload: LessonReportWebhookPayload,
    url: string,
    secret?: string | null,
  ): Promise<WebhookDispatchResult> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'JeelAlamal-Webhook/1.0',
      };
      if (secret) {
        headers['X-Webhook-Secret'] = secret;
      }

      this.logger.log(`Dispatching webhook to: ${url} (event: ${payload.event}, institute: ${payload.instituteId})`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000), // 15-second timeout for n8n/WhatsApp processing
      });

      if (!response.ok) {
        const statusText = response.statusText || `${response.status}`;
        this.logger.warn(`Webhook to ${url} responded with status: ${response.status} (${statusText})`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${statusText}`,
        };
      }

      this.logger.log(`Webhook to ${url} delivered successfully`);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message ?? 'Unknown network error';
      this.logger.error(`Webhook dispatch error to ${url}: ${msg}`);
      return {
        success: false,
        error: msg,
      };
    }
  }
}
