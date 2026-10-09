'use server';

import { auth } from "@/auth";
import { CmsService } from "@/lib/services/cms";
import { revalidatePath } from "next/cache";
import { RateLimitService } from '@/lib/services/rate-limit';

async function getActor() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await RateLimitService.checkLimit('ADMINISTRATIVE');
  return session.user.id;
}

export async function createPage(data: any) {
  const actor = await getActor();
  const res = await CmsService.createPage(actor, data);
  revalidatePath(`/${res.slug}`);
  revalidatePath('/admin/content');
  return res;
}

export async function updatePage(id: string, data: any) {
  const actor = await getActor();
  const res = await CmsService.updatePage(actor, id, data);
  revalidatePath(`/${res.slug}`);
  revalidatePath('/admin/content');
  return res;
}

export async function createFaq(data: any) {
  const actor = await getActor();
  const res = await CmsService.createFaq(actor, data);
  revalidatePath('/faqs');
  revalidatePath('/admin/content');
  return res;
}

export async function updateFaq(id: string, data: any) {
  const actor = await getActor();
  const res = await CmsService.updateFaq(actor, id, data);
  revalidatePath('/faqs');
  revalidatePath('/admin/content');
  return res;
}

export async function createTestimonial(data: any) {
  const actor = await getActor();
  const res = await CmsService.createTestimonial(actor, data);
  revalidatePath('/testimonials');
  revalidatePath('/admin/content');
  return res;
}

export async function updateTestimonial(id: string, data: any) {
  const actor = await getActor();
  const res = await CmsService.updateTestimonial(actor, id, data);
  revalidatePath('/testimonials');
  revalidatePath('/admin/content');
  return res;
}

export async function upsertSetting(key: string, value: string, description?: string) {
  const actor = await getActor();
  const res = await CmsService.upsertSetting(actor, key, value, description);
  // Revalidate globally or where settings are used
  revalidatePath('/', 'layout');
  return res;
}


