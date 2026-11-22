"use server";

import { auth } from "@/auth";
import { AuthorizationService } from "@/lib/services/authorization";
import {
  AppsService,
  CreateAppInput,
  UpdateAppInput,
  CreateReleaseInput,
} from "@/lib/services/apps";
import { ApkValidator, ApkInspectionResult } from "@/lib/services/apk-validator";
import { revalidatePath } from "next/cache";

/**
 * Enforces admin authorization server-side for any mutation.
 */
async function requireAdminUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please sign in");
  }

  const isOwner = session.user.email === "info.sunshineeldercare@gmail.com";
  const hasAccess =
    isOwner ||
    (await AuthorizationService.hasAdminPortalAccess(
      session.user.id,
      session.user.email
    ));

  if (!hasAccess) {
    throw new Error("Unauthorized: Administrator permissions required");
  }

  return session.user;
}

// ==========================================
// PUBLIC READ-ONLY ACTIONS
// ==========================================

export async function getPublishedAppsAction() {
  try {
    return await AppsService.getPublishedApps();
  } catch (error: any) {
    console.error("[getPublishedAppsAction] Error:", error);
    throw new Error(error?.message || "Failed to fetch published applications");
  }
}

export async function getPublishedAppBySlugAction(slug: string) {
  try {
    return await AppsService.getPublishedAppBySlug(slug);
  } catch (error: any) {
    console.error("[getPublishedAppBySlugAction] Error:", error);
    throw new Error(error?.message || "Failed to fetch application details");
  }
}

export async function getAppManifestAction(slug?: string) {
  try {
    return await AppsService.getUpdateManifest(slug);
  } catch (error: any) {
    console.error("[getAppManifestAction] Error:", error);
    throw new Error(error?.message || "Failed to fetch update manifest");
  }
}

// ==========================================
// ADMIN ACTIONS (AUTHENTICATED & AUTHORIZED)
// ==========================================

export async function getAllAppsAdminAction() {
  await requireAdminUser();
  try {
    return await AppsService.getAllAppsAdmin();
  } catch (error: any) {
    console.error("[getAllAppsAdminAction] Error:", error);
    throw new Error(error?.message || "Failed to fetch applications for administration");
  }
}

export async function createAppAction(input: CreateAppInput) {
  await requireAdminUser();
  try {
    const created = await AppsService.createApp(input);
    revalidatePath("/apps");
    revalidatePath("/admin/apps");
    return created;
  } catch (error: any) {
    console.error("[createAppAction] Error:", error);
    throw new Error(error?.message || "Failed to create application");
  }
}

export async function updateAppAction(id: string, input: UpdateAppInput) {
  await requireAdminUser();
  try {
    const updated = await AppsService.updateApp(id, input);
    revalidatePath("/apps");
    revalidatePath("/admin/apps");
    return updated;
  } catch (error: any) {
    console.error("[updateAppAction] Error:", error);
    throw new Error(error?.message || "Failed to update application");
  }
}

export async function createReleaseAction(input: CreateReleaseInput) {
  await requireAdminUser();
  try {
    const release = await AppsService.createRelease(input);
    revalidatePath("/apps");
    revalidatePath("/admin/apps");
    return release;
  } catch (error: any) {
    console.error("[createReleaseAction] Error:", error);
    throw new Error(error?.message || "Failed to publish release");
  }
}

export async function togglePublishReleaseAction(releaseId: string, isPublished: boolean) {
  await requireAdminUser();
  try {
    const updated = await AppsService.togglePublishRelease(releaseId, isPublished);
    revalidatePath("/apps");
    revalidatePath("/admin/apps");
    return updated;
  } catch (error: any) {
    console.error("[togglePublishReleaseAction] Error:", error);
    throw new Error(error?.message || "Failed to toggle release publication status");
  }
}

export async function deleteReleaseAction(releaseId: string) {
  await requireAdminUser();
  try {
    await AppsService.deleteRelease(releaseId);
    revalidatePath("/apps");
    revalidatePath("/admin/apps");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteReleaseAction] Error:", error);
    throw new Error(error?.message || "Failed to delete release");
  }
}

export async function inspectApkBufferAction(bufferBase64: string): Promise<ApkInspectionResult> {
  await requireAdminUser();
  try {
    const buf = Buffer.from(bufferBase64, "base64");
    return ApkValidator.inspectApk(buf);
  } catch (error: any) {
    console.error("[inspectApkBufferAction] Error:", error);
    return {
      isValid: false,
      fileSize: 0,
      sha256: "",
      error: error?.message || "Failed to inspect APK",
    };
  }
}
