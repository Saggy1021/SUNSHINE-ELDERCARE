import { db as prisma } from "@/lib/db";
import * as hardcodedTemplates from "./templates";

export const templateService = {
  async getTemplateContent(code: string, data: Record<string, any>): Promise<{ subject: string; html: string; text: string }> {
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: { code },
      });

      if (template && template.isActive) {
        const replacedSubject = this.replacePlaceholders(template.subject, data);
        const replacedBody = this.replacePlaceholders(template.body, data);
        
        return {
          subject: replacedSubject,
          html: hardcodedTemplates.baseLayout(replacedBody),
          text: replacedBody.replace(/<[^>]+>/g, ''), // Very basic HTML to text fallback
        };
      }
    } catch (error) {
      // If DB is unreachable or table doesn't exist, fallback silently to hardcoded
      console.warn(`[TemplateService] DB lookup failed for ${code}, falling back to hardcoded template.`);
    }

    // Fallback to hardcoded templates
    const fallbackFn = (hardcodedTemplates as any)[this.toCamelCase(code)];
    if (fallbackFn) {
      const escapedData = this.deepEscape(data);
      return fallbackFn(escapedData);
    }

    throw new Error(`Email template not found: ${code}`);
  },

  replacePlaceholders(text: string, data: Record<string, any>): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = key.trim().split('.').reduce((o: any, i: string) => (o ? o[i] : null), data);
      if (value !== undefined && value !== null) {
        return this.escapeHtml(String(value));
      }
      return match;
    });
  },

  escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  deepEscape(data: any): any {
    if (typeof data === 'string') {
      return this.escapeHtml(data);
    }
    if (Array.isArray(data)) {
      return data.map(item => this.deepEscape(item));
    }
    if (data !== null && typeof data === 'object') {
      const escaped: any = {};
      for (const key of Object.keys(data)) {
        escaped[key] = this.deepEscape(data[key]);
      }
      return escaped;
    }
    return data;
  },

  toCamelCase(str: string): string {
    return str.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase()) + 'Email';
  }
};
