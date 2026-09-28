import { db } from '../db';
import { AuthorizationService } from './authorization';

export class CmsService {
  // ==========================================
  // PAGES
  // ==========================================
  
  static async getPages(actorUserId: string) {
    await AuthorizationService.require(actorUserId, 'CONTENT_VIEW');
    return db.websitePage.findMany({
      orderBy: { slug: 'asc' },
      include: { seoMetadata: true, updatedBy: { select: { name: true } } }
    });
  }

  static async getPageBySlug(slug: string, requirePublished: boolean = true) {
    const page = await db.websitePage.findUnique({
      where: { slug },
      include: { seoMetadata: true }
    });
    
    if (!page) return null;
    if (requirePublished && page.status !== 'PUBLISHED') return null;
    
    return page;
  }

  static async createPage(actorUserId: string, data: { slug: string; title: string; content?: any; status?: string; seo?: any }) {
    await AuthorizationService.require(actorUserId, 'CONTENT_MANAGE');
    
    const page = await db.websitePage.create({
      data: {
        slug: data.slug,
        title: data.title,
        content: data.content ?? null,
        status: data.status || 'DRAFT',
        updatedById: actorUserId,
        seoMetadata: data.seo ? { create: data.seo } : undefined,
      }
    });

    await db.auditLog.create({
      data: {
        actorUserId,
        action: 'WEBSITE_CONTENT_CREATED',
        entityType: 'WEBSITE_PAGE',
        entityId: page.id,
        metadata: { slug: page.slug }
      }
    });

    return page;
  }

  static async updatePage(actorUserId: string, id: string, data: { title: string; content?: any; status: string; seo?: any }) {
    await AuthorizationService.require(actorUserId, 'CONTENT_MANAGE');
    
    const page = await db.websitePage.findUnique({ where: { id } });
    if (!page) throw new Error("Page not found");

    const wasPublished = page.status === 'PUBLISHED';
    const isNowPublished = data.status === 'PUBLISHED';
    
    const publishedAt = (!wasPublished && isNowPublished) ? new Date() : page.publishedAt;

    const updated = await db.websitePage.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content ?? null,
        status: data.status,
        publishedAt,
        updatedById: actorUserId,
        seoMetadata: {
          upsert: data.seo ? {
            create: data.seo,
            update: data.seo
          } : undefined
        }
      }
    });

    let action = 'WEBSITE_CONTENT_UPDATED';
    if (!wasPublished && isNowPublished) action = 'WEBSITE_CONTENT_PUBLISHED';
    if (wasPublished && data.status === 'DRAFT') action = 'WEBSITE_CONTENT_UNPUBLISHED';
    if (data.status === 'ARCHIVED' && page.status !== 'ARCHIVED') action = 'WEBSITE_CONTENT_ARCHIVED';

    await db.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType: 'WEBSITE_PAGE',
        entityId: id,
        metadata: { status: data.status }
      }
    });

    return updated;
  }

  // ==========================================
  // FAQS
  // ==========================================
  
  static async getFaqs(actorUserId?: string) {
    if (actorUserId) {
      await AuthorizationService.require(actorUserId, 'CONTENT_VIEW');
      return db.faqEntry.findMany({ orderBy: { sortOrder: 'asc' } });
    } else {
      return db.faqEntry.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { sortOrder: 'asc' }
      });
    }
  }

  static async createFaq(actorUserId: string, data: { question: string; answer: string; status: string; sortOrder: number }) {
    await AuthorizationService.require(actorUserId, 'CONTENT_MANAGE');
    const faq = await db.faqEntry.create({
      data: {
        ...data,
        updatedById: actorUserId
      }
    });
    
    await db.auditLog.create({
      data: { actorUserId, action: 'FAQ_CREATED', entityType: 'FAQ', entityId: faq.id }
    });
    return faq;
  }

  static async updateFaq(actorUserId: string, id: string, data: { question: string; answer: string; status: string; sortOrder: number }) {
    await AuthorizationService.require(actorUserId, 'CONTENT_MANAGE');
    const old = await db.faqEntry.findUnique({ where: { id } });
    if (!old) throw new Error("FAQ not found");

    const faq = await db.faqEntry.update({
      where: { id },
      data: {
        ...data,
        updatedById: actorUserId
      }
    });

    let action = 'FAQ_UPDATED';
    if (old.status !== 'PUBLISHED' && data.status === 'PUBLISHED') action = 'FAQ_PUBLISHED';
    if (old.status !== 'ARCHIVED' && data.status === 'ARCHIVED') action = 'FAQ_ARCHIVED';

    await db.auditLog.create({
      data: { actorUserId, action, entityType: 'FAQ', entityId: faq.id }
    });
    return faq;
  }

  // ==========================================
  // TESTIMONIALS
  // ==========================================

  static async getTestimonials(actorUserId?: string) {
    if (actorUserId) {
      await AuthorizationService.require(actorUserId, 'CONTENT_VIEW');
      return db.testimonial.findMany({ orderBy: { sortOrder: 'asc' } });
    } else {
      return db.testimonial.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { sortOrder: 'asc' }
      });
    }
  }

  static async createTestimonial(actorUserId: string, data: { authorName: string; authorTitle?: string; quote: string; rating?: number; image?: string; status: string; sortOrder: number }) {
    await AuthorizationService.require(actorUserId, 'CONTENT_MANAGE');
    const testimonial = await db.testimonial.create({
      data: {
        ...data,
        updatedById: actorUserId
      }
    });
    
    await db.auditLog.create({
      data: { actorUserId, action: 'TESTIMONIAL_CREATED', entityType: 'TESTIMONIAL', entityId: testimonial.id }
    });
    return testimonial;
  }

  static async updateTestimonial(actorUserId: string, id: string, data: { authorName: string; authorTitle?: string; quote: string; rating?: number; image?: string; status: string; sortOrder: number }) {
    await AuthorizationService.require(actorUserId, 'CONTENT_MANAGE');
    const old = await db.testimonial.findUnique({ where: { id } });
    if (!old) throw new Error("Testimonial not found");

    const testimonial = await db.testimonial.update({
      where: { id },
      data: {
        ...data,
        updatedById: actorUserId
      }
    });

    let action = 'TESTIMONIAL_UPDATED';
    if (old.status !== 'PUBLISHED' && data.status === 'PUBLISHED') action = 'TESTIMONIAL_PUBLISHED';
    if (old.status !== 'ARCHIVED' && data.status === 'ARCHIVED') action = 'TESTIMONIAL_ARCHIVED';

    await db.auditLog.create({
      data: { actorUserId, action, entityType: 'TESTIMONIAL', entityId: testimonial.id }
    });
    return testimonial;
  }

  // ==========================================
  // WEBSITE SETTINGS
  // ==========================================

  static async getSettings(actorUserId?: string) {
    if (actorUserId) {
      await AuthorizationService.require(actorUserId, 'CONTENT_VIEW');
    }
    return db.websiteSetting.findMany({ orderBy: { key: 'asc' } });
  }

  static async getSettingsMap() {
    const settings = await db.websiteSetting.findMany();
    return settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);
  }

  static async upsertSetting(actorUserId: string, key: string, value: string, description?: string) {
    await AuthorizationService.require(actorUserId, 'CONTENT_MANAGE');
    
    const setting = await db.websiteSetting.upsert({
      where: { key },
      create: { key, value, description, updatedById: actorUserId },
      update: { value, description, updatedById: actorUserId }
    });

    await db.auditLog.create({
      data: { actorUserId, action: 'WEBSITE_SETTINGS_UPDATED', entityType: 'WEBSITE_SETTING', entityId: setting.id, metadata: { key } }
    });

    return setting;
  }

  // ==========================================
  // EMPLOYEE PUBLIC PROFILES
  // ==========================================

  static async getPublicEmployees() {
    return db.employee.findMany({
      where: { isPublic: true, status: 'ACTIVE' },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        designation: true,
        photoReference: true,
        publicBiography: true,
      }
    });
  }

  static async updateEmployeePublicProfile(actorUserId: string, employeeId: string, data: { isPublic: boolean; publicBiography?: string; displayOrder: number }) {
    await AuthorizationService.require(actorUserId, 'CONTENT_MANAGE');
    
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new Error("Employee not found");

    const updated = await db.employee.update({
      where: { id: employeeId },
      data: {
        isPublic: data.isPublic,
        publicBiography: data.publicBiography ?? null,
        displayOrder: data.displayOrder
      }
    });

    await db.auditLog.create({
      data: {
        actorUserId,
        action: 'EMPLOYEE_PUBLIC_PROFILE_UPDATED',
        entityType: 'EMPLOYEE',
        entityId: employeeId,
        metadata: { isPublic: data.isPublic }
      }
    });

    return updated;
  }
}
