import { db as prisma } from "@/lib/db";
import * as hardcodedTemplates from "./templates";

export const templateService = {
  async getTemplateContent(code: string, data: Record<string, any>): Promise<{ subject: string; html: string; text: string }> {
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

    // Fallback to hardcoded templates
    const fallbackFn = (hardcodedTemplates as any)[this.toCamelCase(code)];
    if (fallbackFn) {
      return fallbackFn(data);
    }

    throw new Error(`Email template not found: ${code}`);
  },

  replacePlaceholders(text: string, data: Record<string, any>): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = key.trim().split('.').reduce((o: any, i: string) => (o ? o[i] : null), data);
      return value !== undefined && value !== null ? String(value) : match;
    });
  },

  toCamelCase(str: string): string {
    return str.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }
};
