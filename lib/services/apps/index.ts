import { db as prisma } from "@/lib/db";
import { ApkValidator, ApkInspectionResult } from "../apk-validator";

export interface CreateAppInput {
  slug: string;
  packageName: string;
  name: string;
  tagline?: string;
  description: string;
  iconUrl?: string;
  platform?: string;
  category?: string;
  isPublished?: boolean;
}

export interface UpdateAppInput {
  name?: string;
  tagline?: string;
  description?: string;
  iconUrl?: string;
  category?: string;
  isPublished?: boolean;
  isArchived?: boolean;
}

export interface CreateReleaseInput {
  appId: string;
  versionName: string;
  versionCode: number;
  apkUrl: string;
  apkFileName: string;
  fileSize: number;
  sha256: string;
  certificateFingerprint?: string;
  minAndroidVersion?: string;
  targetSdkVersion?: number;
  releaseNotes?: string;
  isMandatory?: boolean;
  isPublished?: boolean;
}

export class AppsService {
  /**
   * Returns all published applications with their latest published release for the public directory.
   */
  static async getPublishedApps() {
    const apps = await prisma.publishedApp.findMany({
      where: {
        isPublished: true,
        isArchived: false,
      },
      include: {
        versions: {
          where: { isPublished: true },
          orderBy: { versionCode: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return apps.map((app) => ({
      id: app.id,
      slug: app.slug,
      packageName: app.packageName,
      name: app.name,
      tagline: app.tagline,
      description: app.description,
      iconUrl: app.iconUrl,
      platform: app.platform,
      category: app.category,
      latestRelease: app.versions[0] || null,
      updatedAt: app.updatedAt,
    }));
  }

  /**
   * Returns a specific published application by slug or package name.
   */
  static async getPublishedAppBySlug(slugOrPkg: string) {
    const app = await prisma.publishedApp.findFirst({
      where: {
        OR: [{ slug: slugOrPkg }, { packageName: slugOrPkg }],
        isPublished: true,
        isArchived: false,
      },
      include: {
        versions: {
          where: { isPublished: true },
          orderBy: { versionCode: "desc" },
        },
      },
    });

    if (!app) return null;

    return {
      ...app,
      latestRelease: app.versions[0] || null,
      allReleases: app.versions,
    };
  }

  /**
   * Returns the update manifest for an application (used by Member App and automated updaters).
   */
  static async getUpdateManifest(identifier?: string) {
    if (identifier) {
      const app = await this.getPublishedAppBySlug(identifier);
      if (!app || !app.latestRelease) return null;

      const r = app.latestRelease;
      return {
        appId: app.slug,
        packageName: app.packageName,
        name: app.name,
        latestVersionName: r.versionName,
        latestVersionCode: r.versionCode,
        apkDownloadUrl: r.apkUrl.startsWith("http")
          ? r.apkUrl
          : `${process.env.NEXT_PUBLIC_APP_URL || "https://www.sunshineeldercare.in"}${r.apkUrl}`,
        sha256: r.sha256,
        fileSize: r.fileSize,
        minSupportedVersion: r.minAndroidVersion,
        releaseNotes: r.releaseNotes,
        isMandatory: r.isMandatory,
        releasedAt: r.releasedAt.toISOString(),
      };
    }

    // Return manifest catalog of all published applications
    const apps = await this.getPublishedApps();
    return apps
      .filter((a) => a.latestRelease !== null)
      .map((a) => {
        const r = a.latestRelease!;
        return {
          appId: a.slug,
          packageName: a.packageName,
          name: a.name,
          latestVersionName: r.versionName,
          latestVersionCode: r.versionCode,
          apkDownloadUrl: r.apkUrl.startsWith("http")
            ? r.apkUrl
            : `${process.env.NEXT_PUBLIC_APP_URL || "https://www.sunshineeldercare.in"}${r.apkUrl}`,
          sha256: r.sha256,
          fileSize: r.fileSize,
          minSupportedVersion: r.minAndroidVersion,
          releaseNotes: r.releaseNotes,
          isMandatory: r.isMandatory,
          releasedAt: r.releasedAt.toISOString(),
        };
      });
  }

  /**
   * ADMIN: Returns all applications with complete version history and statistics.
   */
  static async getAllAppsAdmin() {
    return prisma.publishedApp.findMany({
      include: {
        versions: {
          orderBy: { versionCode: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * ADMIN: Creates a new application entry.
   */
  static async createApp(input: CreateAppInput) {
    const slug = input.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, "-");
    const packageName = input.packageName.trim();

    // Check slug or packageName uniqueness
    const existing = await prisma.publishedApp.findFirst({
      where: {
        OR: [{ slug }, { packageName }],
      },
    });

    if (existing) {
      if (existing.slug === slug) {
        throw new Error(`An application with slug "${slug}" already exists.`);
      }
      throw new Error(`An application with package name "${packageName}" already exists.`);
    }

    return prisma.publishedApp.create({
      data: {
        slug,
        packageName,
        name: input.name.trim(),
        tagline: input.tagline?.trim() || null,
        description: input.description.trim(),
        iconUrl: input.iconUrl?.trim() || null,
        platform: input.platform || "ANDROID",
        category: input.category || "HEALTH_AND_FITNESS",
        isPublished: input.isPublished ?? true,
        isArchived: false,
      },
    });
  }

  /**
   * ADMIN: Updates application metadata.
   */
  static async updateApp(appId: string, input: UpdateAppInput) {
    const app = await prisma.publishedApp.findUnique({ where: { id: appId } });
    if (!app) throw new Error("Application not found.");

    return prisma.publishedApp.update({
      where: { id: appId },
      data: {
        name: input.name !== undefined ? input.name.trim() : undefined,
        tagline: input.tagline !== undefined ? input.tagline.trim() : undefined,
        description: input.description !== undefined ? input.description.trim() : undefined,
        iconUrl: input.iconUrl !== undefined ? input.iconUrl.trim() : undefined,
        category: input.category !== undefined ? input.category : undefined,
        isPublished: input.isPublished !== undefined ? input.isPublished : undefined,
        isArchived: input.isArchived !== undefined ? input.isArchived : undefined,
      },
    });
  }

  /**
   * ADMIN: Adds a new version release to an application.
   */
  static async createRelease(input: CreateReleaseInput) {
    const app = await prisma.publishedApp.findUnique({
      where: { id: input.appId },
      include: {
        versions: {
          orderBy: { versionCode: "desc" },
          take: 1,
        },
      },
    });

    if (!app) throw new Error("Application not found.");

    const latest = app.versions[0];
    const verification = ApkValidator.verifyApkUpdate(
      {
        packageName: app.packageName,
        latestCertFingerprint: latest?.certificateFingerprint || null,
        latestVersionCode: latest?.versionCode ?? null,
      },
      {
        isValid: true,
        fileSize: input.fileSize,
        sha256: input.sha256,
        versionCode: input.versionCode,
        versionName: input.versionName,
        certificateFingerprint: input.certificateFingerprint,
      }
    );

    if (!verification.valid) {
      throw new Error(verification.reason || "APK validation failed.");
    }

    return prisma.$transaction(async (tx) => {
      const release = await tx.appRelease.create({
        data: {
          appId: input.appId,
          versionName: input.versionName.trim(),
          versionCode: input.versionCode,
          apkUrl: input.apkUrl.trim(),
          apkFileName: input.apkFileName.trim(),
          fileSize: input.fileSize,
          sha256: input.sha256.trim(),
          certificateFingerprint: input.certificateFingerprint?.trim() || null,
          minAndroidVersion: input.minAndroidVersion?.trim() || "Android 10 (API 29)",
          targetSdkVersion: input.targetSdkVersion || 36,
          releaseNotes: input.releaseNotes?.trim() || null,
          isMandatory: input.isMandatory ?? false,
          isPublished: input.isPublished ?? true,
        },
      });

      if (release.isPublished) {
        await tx.publishedApp.update({
          where: { id: input.appId },
          data: { currentVersionId: release.id },
        });
      }

      return release;
    });
  }

  /**
   * ADMIN: Toggles publication status of a release.
   */
  static async togglePublishRelease(releaseId: string, isPublished: boolean) {
    const release = await prisma.appRelease.findUnique({
      where: { id: releaseId },
      include: { app: true },
    });
    if (!release) throw new Error("Release not found.");

    return prisma.$transaction(async (tx) => {
      const updated = await tx.appRelease.update({
        where: { id: releaseId },
        data: { isPublished },
      });

      // Recalculate latest published release for the app
      const latestPublished = await tx.appRelease.findFirst({
        where: {
          appId: release.appId,
          isPublished: true,
        },
        orderBy: { versionCode: "desc" },
      });

      await tx.publishedApp.update({
        where: { id: release.appId },
        data: { currentVersionId: latestPublished?.id || null },
      });

      return updated;
    });
  }

  /**
   * ADMIN: Deletes an unneeded release.
   */
  static async deleteRelease(releaseId: string) {
    const release = await prisma.appRelease.findUnique({
      where: { id: releaseId },
    });
    if (!release) throw new Error("Release not found.");

    return prisma.$transaction(async (tx) => {
      await tx.appRelease.delete({ where: { id: releaseId } });

      const latestPublished = await tx.appRelease.findFirst({
        where: {
          appId: release.appId,
          isPublished: true,
        },
        orderBy: { versionCode: "desc" },
      });

      await tx.publishedApp.update({
        where: { id: release.appId },
        data: { currentVersionId: latestPublished?.id || null },
      });
    });
  }

  /**
   * Records a completed APK download and increments the counter.
   */
  static async recordDownload(releaseId: string) {
    try {
      await prisma.appRelease.update({
        where: { id: releaseId },
        data: { downloadCount: { increment: 1 } },
      });
    } catch {
      // Non-blocking telemetry
    }
  }
}
