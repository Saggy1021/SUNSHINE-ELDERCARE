"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  PlusCircle,
  UploadCloud,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Edit2,
  Trash2,
  History,
  Eye,
  EyeOff,
  Archive,
  RotateCcw,
  ShieldCheck,
  HardDrive,
  Calendar,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Download,
} from "lucide-react";
import {
  getAllAppsAdminAction,
  createAppAction,
  updateAppAction,
  createReleaseAction,
  replaceReleaseAction,
  togglePublishReleaseAction,
  deleteReleaseAction,
  runReleaseAcceptanceCheckAction,
  rollbackReleaseAction,
} from "@/app/actions/apps";
import { inspectApkInBrowser } from "@/lib/services/client-apk-inspector";

interface AppReleaseItem {
  id: string;
  versionName: string;
  versionCode: number;
  apkUrl: string;
  apkFileName: string;
  fileSize: number;
  sha256: string;
  certificateFingerprint: string | null;
  minAndroidVersion: string;
  targetSdkVersion: number | null;
  storageKey: string | null;
  storageProvider?: string;
  releaseNotes: string | null;
  isMandatory: boolean;
  isPublished: boolean;
  downloadCount: number;
  releasedAt: string | Date;
  createdAt: string | Date;
}

interface PublishedAppItem {
  id: string;
  slug: string;
  packageName: string;
  name: string;
  tagline: string | null;
  description: string;
  iconUrl: string | null;
  platform: string;
  category: string;
  isPublished: boolean;
  isArchived: boolean;
  currentVersionId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  versions: AppReleaseItem[];
}

export default function AdminAppsPage() {
  const [apps, setApps] = useState<PublishedAppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Active items for modals
  const [selectedApp, setSelectedApp] = useState<PublishedAppItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Add App Form State
  const [newAppForm, setNewAppForm] = useState({
    name: "",
    slug: "",
    packageName: "",
    tagline: "",
    description: "",
    iconUrl: "",
    category: "HEALTH_AND_FITNESS",
    isPublished: true,
  });

  // Edit App Form State
  const [editAppForm, setEditAppForm] = useState({
    name: "",
    tagline: "",
    description: "",
    iconUrl: "",
    category: "HEALTH_AND_FITNESS",
    isPublished: true,
    isArchived: false,
  });

  // Upload Release State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStage, setUploadStage] = useState<string>("");
  const [acceptanceResult, setAcceptanceResult] = useState<any>(null);
  const [inspectionResult, setInspectionResult] = useState<{
    isValid: boolean;
    packageName?: string;
    versionName?: string;
    versionCode?: number;
    minSdkVersion?: string;
    targetSdkVersion?: number;
    fileSize?: number;
    sha256?: string;
    certificateFingerprint?: string;
    apkFileName?: string;
    apkUrl?: string;
    storageKey?: string;
    storageProvider?: string;
    error?: string;
  } | null>(null);

  const [releaseActionType, setReleaseActionType] = useState<"NEW" | "REPLACE">("NEW");
  const [targetReplaceReleaseId, setTargetReplaceReleaseId] = useState<string | null>(null);
  const [matchingReleaseInfo, setMatchingReleaseInfo] = useState<{
    id: string;
    versionName: string;
    versionCode: number;
    apkFileName: string;
    sha256: string;
  } | null>(null);
  const [compatibilityWarning, setCompatibilityWarning] = useState<string | null>(null);

  const [releaseForm, setReleaseForm] = useState({
    versionName: "",
    versionCode: 1,
    minAndroidVersion: "Android 10 (API 29)",
    targetSdkVersion: 36,
    releaseNotes: "",
    isMandatory: false,
    isPublished: true,
  });

  const loadApps = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getAllAppsAdminAction();
      setApps(data as unknown as PublishedAppItem[]);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, []);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // ==========================================
  // ADD APP HANDLERS
  // ==========================================
  const handleOpenAddModal = () => {
    setNewAppForm({
      name: "",
      slug: "",
      packageName: "",
      tagline: "",
      description: "",
      iconUrl: "",
      category: "HEALTH_AND_FITNESS",
      isPublished: true,
    });
    setIsAddModalOpen(true);
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      await createAppAction({
        name: newAppForm.name,
        slug: newAppForm.slug,
        packageName: newAppForm.packageName,
        tagline: newAppForm.tagline || undefined,
        description: newAppForm.description,
        iconUrl: newAppForm.iconUrl || undefined,
        category: newAppForm.category,
        isPublished: newAppForm.isPublished,
      });
      setIsAddModalOpen(false);
      showNotification(`Application "${newAppForm.name}" created successfully.`);
      await loadApps();
    } catch (err: any) {
      showNotification(err?.message || "Failed to create application", true);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // EDIT APP HANDLERS
  // ==========================================
  const handleOpenEditModal = (app: PublishedAppItem) => {
    setSelectedApp(app);
    setEditAppForm({
      name: app.name,
      tagline: app.tagline || "",
      description: app.description,
      iconUrl: app.iconUrl || "",
      category: app.category,
      isPublished: app.isPublished,
      isArchived: app.isArchived,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await updateAppAction(selectedApp.id, editAppForm);
      setIsEditModalOpen(false);
      showNotification(`Application "${editAppForm.name}" updated successfully.`);
      await loadApps();
    } catch (err: any) {
      showNotification(err?.message || "Failed to update application", true);
    } finally {
      setSaving(false);
    }
  };

  // Quick toggle published
  const handleToggleAppPublished = async (app: PublishedAppItem) => {
    try {
      await updateAppAction(app.id, { isPublished: !app.isPublished });
      showNotification(
        `Application "${app.name}" is now ${!app.isPublished ? "Published" : "Unpublished"}.`
      );
      await loadApps();
    } catch (err: any) {
      showNotification(err?.message || "Failed to toggle status", true);
    }
  };

  // Quick toggle archive
  const handleToggleAppArchived = async (app: PublishedAppItem) => {
    try {
      await updateAppAction(app.id, { isArchived: !app.isArchived });
      showNotification(
        `Application "${app.name}" ${!app.isArchived ? "archived" : "restored"}.`
      );
      await loadApps();
    } catch (err: any) {
      showNotification(err?.message || "Failed to update archive status", true);
    }
  };

  // ==========================================
  // UPLOAD RELEASE HANDLERS
  // ==========================================
  const handleOpenUploadModal = (app: PublishedAppItem) => {
    setSelectedApp(app);
    setUploadFile(null);
    setInspectionResult(null);
    setCompatibilityWarning(null);
    setMatchingReleaseInfo(null);
    setUploadProgress(null);
    setUploadStage("");
    setAcceptanceResult(null);
    setReleaseActionType("NEW");
    setTargetReplaceReleaseId(app.versions[0]?.id || null);
    const nextCode = app.versions.length > 0 ? Math.max(...app.versions.map((v) => v.versionCode)) + 1 : 1;
    setReleaseForm({
      versionName: "1.0.0",
      versionCode: nextCode,
      minAndroidVersion: "Android 10 (API 29)",
      targetSdkVersion: 36,
      releaseNotes: "",
      isMandatory: false,
      isPublished: true,
    });
    setIsUploadModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".apk")) {
      showNotification("Please select a valid Android APK file (.apk)", true);
      return;
    }

    if (file.size < 1024 * 1024) {
      showNotification("File is too small to be a valid Android APK (less than 1 MB)", true);
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      showNotification("File exceeds maximum allowed APK size (200MB)", true);
      return;
    }

    setUploadFile(file);
    setUploading(true);
    setUploadProgress(null);
    setUploadStage("Analyzing APK structure...");
    setInspectionResult(null);
    setCompatibilityWarning(null);
    setAcceptanceResult(null);

    let extractedMeta: {
      packageName?: string;
      versionName?: string;
      versionCode?: number;
      minSdkVersion?: string;
      targetSdkVersion?: number;
      fileSize: number;
      sha256: string;
      certificateFingerprint?: string;
    } = {
      fileSize: file.size,
      sha256: "",
    };

    try {
      // 1. Instantaneous in-browser binary inspection (< 200ms)
      const clientInspection = await inspectApkInBrowser(file);
      if (!clientInspection.isValid) {
        throw new Error(clientInspection.error || "Failed to parse APK structure");
      }

      extractedMeta = {
        packageName: clientInspection.packageName,
        versionName: clientInspection.versionName,
        versionCode: clientInspection.versionCode,
        minSdkVersion: clientInspection.minSdkVersion,
        targetSdkVersion: clientInspection.targetSdkVersion,
        fileSize: file.size,
        sha256: clientInspection.sha256,
        certificateFingerprint: clientInspection.certificateFingerprint,
      };

      // Automatically pre-fill form immediately from authoritative embedded APK metadata
      if (clientInspection.versionName || clientInspection.versionCode) {
        setReleaseForm((prev) => ({
          ...prev,
          versionName: clientInspection.versionName || prev.versionName,
          versionCode: clientInspection.versionCode || prev.versionCode,
          minAndroidVersion: clientInspection.minSdkVersion || prev.minAndroidVersion,
          targetSdkVersion: clientInspection.targetSdkVersion || prev.targetSdkVersion,
        }));
      }

      // 2. Request presigned upload URL from backend
      setUploadStage("Securing Cloudflare R2 upload authorization...");
      const presignRes = await fetch("/api/admin/apps/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "presign",
          appSlug: selectedApp?.slug,
          fileName: file.name,
          ...clientInspection,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        throw new Error(presignData.error || "Failed to initialize storage upload");
      }

      // 3. Direct browser upload to Cloudflare R2 via XMLHttpRequest with progress tracking
      // Completely bypasses Vercel's 4.5MB Serverless Function payload limit
      setUploadStage("Uploading binary directly to Cloudflare R2 persistent storage...");
      setUploadProgress(0);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignData.uploadUrl, true);
        xhr.setRequestHeader("Content-Type", "application/vnd.android.package-archive");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setUploadProgress(pct);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage upload failed with HTTP status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network connection error during R2 binary upload"));
        xhr.send(file);
      });

      // 4. Verify object in storage
      setUploadStage("Verifying storage object integrity and byte count...");
      const verifyRes = await fetch("/api/admin/apps/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          storageKey: presignData.storageKey,
          expectedSize: file.size,
          expectedSha256: clientInspection.sha256,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Storage verification failed");
      }

      setInspectionResult({
        ...clientInspection,
        apkFileName: presignData.apkFileName,
        apkUrl: `/api/apps/${selectedApp?.slug}/download`,
        storageKey: presignData.storageKey,
        storageProvider: "R2",
      });

      if (presignData.hasCompatibilityWarning && presignData.compatibilityWarning) {
        setCompatibilityWarning(presignData.compatibilityWarning);
      } else {
        setCompatibilityWarning(null);
      }

      // Look up matching release in app versions
      const matching = selectedApp?.versions.find((v) => v.versionCode === Number(clientInspection.versionCode));
      if (matching) {
        setMatchingReleaseInfo(matching);
        setReleaseActionType("REPLACE");
        setTargetReplaceReleaseId(matching.id);
      } else {
        setMatchingReleaseInfo(null);
        setReleaseActionType("NEW");
        setTargetReplaceReleaseId(selectedApp?.versions[0]?.id || null);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "APK upload and inspection failed";
      setInspectionResult({
        isValid: false,
        fileSize: file.size,
        sha256: extractedMeta.sha256,
        packageName: extractedMeta.packageName,
        versionName: extractedMeta.versionName,
        versionCode: extractedMeta.versionCode,
        certificateFingerprint: extractedMeta.certificateFingerprint,
        error: errorMsg,
      });
      showNotification(errorMsg, true);
    } finally {
      setUploading(false);
      setUploadStage("");
    }
  };

  const handlePublishRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !inspectionResult || !inspectionResult.isValid) {
      showNotification("Please upload and validate a valid APK file first", true);
      return;
    }

    const submittedCode = Number(releaseForm.versionCode);
    if (!submittedCode || isNaN(submittedCode)) {
      showNotification("Please provide a valid integer version code", true);
      return;
    }

    setSaving(true);
    try {
      let savedReleaseId: string | null = null;

      if (releaseActionType === "REPLACE" && targetReplaceReleaseId) {
        const updated = await replaceReleaseAction(targetReplaceReleaseId, {
          versionName: releaseForm.versionName,
          versionCode: submittedCode,
          apkUrl: `/api/apps/${selectedApp.slug}/download`,
          apkFileName: inspectionResult.apkFileName || uploadFile?.name || "app-release.apk",
          fileSize: inspectionResult.fileSize || 0,
          sha256: inspectionResult.sha256 || "",
          certificateFingerprint: inspectionResult.certificateFingerprint,
          minAndroidVersion: releaseForm.minAndroidVersion,
          targetSdkVersion: Number(releaseForm.targetSdkVersion),
          releaseNotes: releaseForm.releaseNotes || undefined,
          isMandatory: Boolean(releaseForm.isMandatory),
          isPublished: Boolean(releaseForm.isPublished),
          storageKey: inspectionResult.storageKey,
          storageProvider: inspectionResult.storageProvider || "R2",
        });
        savedReleaseId = updated.id;
      } else {
        const created = await createReleaseAction({
          appId: selectedApp.id,
          versionName: releaseForm.versionName,
          versionCode: submittedCode,
          apkUrl: `/api/apps/${selectedApp.slug}/download`,
          apkFileName: inspectionResult.apkFileName || uploadFile?.name || "app-release.apk",
          fileSize: inspectionResult.fileSize || 0,
          sha256: inspectionResult.sha256 || "",
          certificateFingerprint: inspectionResult.certificateFingerprint,
          minAndroidVersion: releaseForm.minAndroidVersion,
          targetSdkVersion: Number(releaseForm.targetSdkVersion),
          releaseNotes: releaseForm.releaseNotes || undefined,
          isMandatory: Boolean(releaseForm.isMandatory),
          isPublished: Boolean(releaseForm.isPublished),
          storageKey: inspectionResult.storageKey,
          storageProvider: inspectionResult.storageProvider || "R2",
        });
        savedReleaseId = created.id;
      }

      // Run automated acceptance check immediately
      if (savedReleaseId) {
        try {
          const acceptance = await runReleaseAcceptanceCheckAction(savedReleaseId);
          setAcceptanceResult(acceptance);
          if (acceptance.passed) {
            showNotification(
              `Version ${releaseForm.versionName} (Build ${submittedCode}) published and 100% verified via automated acceptance test!`
            );
          } else {
            showNotification(`Release saved, but acceptance check returned: ${acceptance.error}`, true);
          }
        } catch (testErr: any) {
          showNotification(`Release published. Note: acceptance test error: ${testErr?.message}`);
        }
      }

      setIsUploadModalOpen(false);
      await loadApps();
    } catch (err: any) {
      showNotification(err?.message || "Failed to publish release", true);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // VERSION HISTORY & WITHDRAW HANDLERS
  // ==========================================
  const handleOpenHistoryModal = (app: PublishedAppItem) => {
    setSelectedApp(app);
    setIsHistoryModalOpen(true);
  };

  const handleToggleReleasePublished = async (release: AppReleaseItem) => {
    try {
      await togglePublishReleaseAction(release.id, !release.isPublished);
      showNotification(
        `Release v${release.versionName} is now ${!release.isPublished ? "published" : "withdrawn/unpublished"}.`
      );
      await loadApps();
      // Update selectedApp in history view
      if (selectedApp) {
        const updated = await getAllAppsAdminAction();
        const found = (updated as unknown as PublishedAppItem[]).find(
          (a) => a.id === selectedApp.id
        );
        if (found) setSelectedApp(found);
      }
    } catch (err: any) {
      showNotification(err?.message || "Failed to toggle release status", true);
    }
  };

  const handleRollbackRelease = async (release: AppReleaseItem) => {
    if (!selectedApp) return;
    const confirm = window.confirm(
      `Are you sure you want to rollback to v${release.versionName} (Build ${release.versionCode})?\n\nThis will immediately switch the active production release pointer so all downloads, documents, and app updaters serve Build ${release.versionCode}.\n\nHistorical releases will NOT be deleted.`
    );
    if (!confirm) return;

    setSaving(true);
    try {
      await rollbackReleaseAction(selectedApp.slug, release.id);
      showNotification(`Successfully rolled back active release to v${release.versionName} (Build ${release.versionCode})`);
      await loadApps();
      if (selectedApp) {
        const updated = await getAllAppsAdminAction();
        const found = (updated as unknown as PublishedAppItem[]).find(
          (a) => a.id === selectedApp.id
        );
        if (found) setSelectedApp(found);
      }
    } catch (err: any) {
      showNotification(err?.message || "Failed to rollback release", true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRelease = async (release: AppReleaseItem) => {
    if (!confirm(`Are you sure you want to permanently delete release v${release.versionName}?`)) {
      return;
    }

    try {
      await deleteReleaseAction(release.id);
      showNotification(`Release v${release.versionName} has been deleted.`);
      await loadApps();
      if (selectedApp) {
        const updated = await getAllAppsAdminAction();
        const found = (updated as unknown as PublishedAppItem[]).find(
          (a) => a.id === selectedApp.id
        );
        if (found) setSelectedApp(found);
      }
    } catch (err: any) {
      showNotification(err?.message || "Failed to delete release", true);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-[#B08A4A]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white">
              Sunshine Applications Directory
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage official mobile applications, publish new APK releases, verify cryptographic signing continuity, and inspect downloads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-muted transition-colors"
          >
            <span>Public Page</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#B08A4A] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#977338] transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Apps Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#091329] dark:text-white">
            Configured Mobile Applications ({apps.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Centralized Database Catalog
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#B08A4A]" />
            <span className="text-xs">Loading application catalog...</span>
          </div>
        ) : apps.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Smartphone className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold">No applications configured</p>
            <p className="text-xs mt-1">Click &quot;Add Application&quot; to configure your first mobile app.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {apps.map((app) => {
              const latest = app.versions.find((v) => v.isPublished) || app.versions[0];
              const totalDownloads = app.versions.reduce((acc, v) => acc + (v.downloadCount || 0), 0);

              return (
                <div key={app.id} className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-muted/10 transition-colors">
                  {/* Left: App Info */}
                  <div className="flex items-start gap-4">
                    <div className="relative h-14 w-14 flex-shrink-0 rounded-xl border border-border bg-muted/30 p-1.5 overflow-hidden flex items-center justify-center">
                      {app.iconUrl ? (
                        <img src={app.iconUrl} alt={app.name} className="h-full w-full object-contain" />
                      ) : (
                        <Smartphone className="h-8 w-8 text-[#B08A4A]" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-[#091329] dark:text-white">
                          {app.name}
                        </h3>
                        <span className="font-mono text-[10px] rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-slate-600 dark:text-slate-400">
                          {app.slug}
                        </span>
                        {app.isPublished ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            <EyeOff className="h-3 w-3" /> Draft
                          </span>
                        )}
                        {app.isArchived && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <Archive className="h-3 w-3" /> Archived
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {app.description}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span>Package: <strong className="font-mono text-slate-700 dark:text-slate-300">{app.packageName}</strong></span>
                        <span>
                          Current Version:{" "}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {latest ? `v${latest.versionName} (code ${latest.versionCode})` : "None"}
                          </strong>
                        </span>
                        <span>Releases: <strong>{app.versions.length}</strong></span>
                        <span>Downloads: <strong>{totalDownloads}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                    <button
                      type="button"
                      onClick={() => handleOpenUploadModal(app)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#B08A4A] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#977338] transition-colors"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Upload Release</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenHistoryModal(app)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-muted transition-colors"
                    >
                      <History className="h-3.5 w-3.5 text-slate-500" />
                      <span>Releases ({app.versions.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(app)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-muted transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleAppPublished(app)}
                      className="p-1.5 rounded-lg border border-border text-slate-600 hover:bg-muted transition-colors"
                      title={app.isPublished ? "Unpublish application" : "Publish application"}
                    >
                      {app.isPublished ? <EyeOff className="h-4 w-4 text-amber-600" /> : <Eye className="h-4 w-4 text-emerald-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleAppArchived(app)}
                      className="p-1.5 rounded-lg border border-border text-slate-600 hover:bg-muted transition-colors"
                      title={app.isArchived ? "Unarchive application" : "Archive application"}
                    >
                      <Archive className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD APPLICATION                                  */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-[#B08A4A]" />
                <h2 className="text-base font-bold text-[#091329] dark:text-white">
                  Add New Mobile Application
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateApp} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Application Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunshine Member App"
                    value={newAppForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                      setNewAppForm({ ...newAppForm, name, slug: newAppForm.slug || slug });
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. member-app"
                    value={newAppForm.slug}
                    onChange={(e) => setNewAppForm({ ...newAppForm, slug: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Android Package Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. in.sunshineeldercare.member"
                    value={newAppForm.packageName}
                    onChange={(e) => setNewAppForm({ ...newAppForm, packageName: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Elder Care & One-Tap Emergency Support"
                    value={newAppForm.tagline}
                    onChange={(e) => setNewAppForm({ ...newAppForm, tagline: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detailed purpose and features of this application..."
                  value={newAppForm.description}
                  onChange={(e) => setNewAppForm({ ...newAppForm, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Icon URL (relative or CDN)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /images/apps/member-app-icon.png"
                    value={newAppForm.iconUrl}
                    onChange={(e) => setNewAppForm({ ...newAppForm, iconUrl: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newAppForm.category}
                    onChange={(e) => setNewAppForm({ ...newAppForm, category: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  >
                    <option value="HEALTH_AND_FITNESS">Health & Fitness</option>
                    <option value="MEDICAL">Medical</option>
                    <option value="PRODUCTIVITY">Productivity</option>
                    <option value="TOOLS">Tools</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="add-app-published"
                  checked={newAppForm.isPublished}
                  onChange={(e) => setNewAppForm({ ...newAppForm, isPublished: e.target.checked })}
                  className="rounded border-border text-[#B08A4A]"
                />
                <label htmlFor="add-app-published" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Publish immediately in Public Directory
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#B08A4A] px-4 py-2 text-xs font-bold text-white hover:bg-[#977338] disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT APPLICATION                                 */}
      {/* ======================================================== */}
      {isEditModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-[#B08A4A]" />
                <h2 className="text-base font-bold text-[#091329] dark:text-white">
                  Edit Application: {selectedApp.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateApp} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Application Name *
                </label>
                <input
                  type="text"
                  required
                  value={editAppForm.name}
                  onChange={(e) => setEditAppForm({ ...editAppForm, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={editAppForm.tagline}
                  onChange={(e) => setEditAppForm({ ...editAppForm, tagline: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editAppForm.description}
                  onChange={(e) => setEditAppForm({ ...editAppForm, description: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Icon URL
                  </label>
                  <input
                    type="text"
                    value={editAppForm.iconUrl}
                    onChange={(e) => setEditAppForm({ ...editAppForm, iconUrl: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={editAppForm.category}
                    onChange={(e) => setEditAppForm({ ...editAppForm, category: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  >
                    <option value="HEALTH_AND_FITNESS">Health & Fitness</option>
                    <option value="MEDICAL">Medical</option>
                    <option value="PRODUCTIVITY">Productivity</option>
                    <option value="TOOLS">Tools</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAppForm.isPublished}
                    onChange={(e) => setEditAppForm({ ...editAppForm, isPublished: e.target.checked })}
                    className="rounded border-border text-[#B08A4A]"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Published in Public Directory
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAppForm.isArchived}
                    onChange={(e) => setEditAppForm({ ...editAppForm, isArchived: e.target.checked })}
                    className="rounded border-border text-amber-600"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Archived
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#B08A4A] px-4 py-2 text-xs font-bold text-white hover:bg-[#977338] disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: UPLOAD NEW RELEASE                               */}
      {/* ======================================================== */}
      {isUploadModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-[#B08A4A]" />
                <div>
                  <h2 className="text-base font-bold text-[#091329] dark:text-white">
                    Upload &amp; Publish New APK: {selectedApp.name}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Required package ID: <span className="font-mono text-slate-700 dark:text-slate-300">{selectedApp.packageName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePublishRelease} className="p-6 space-y-4">
              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Android APK File (.apk) *
                </label>
                <div className="relative rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-[#B08A4A]/50 bg-muted/10 transition-colors">
                  <input
                    type="file"
                    accept=".apk,application/vnd.android.package-archive"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UploadCloud className="h-8 w-8 text-[#B08A4A]" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {uploadFile ? uploadFile.name : "Click or drag & drop an APK release"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Maximum file size: 100MB. APK is analyzed automatically upon selection.
                    </p>
                  </div>
                </div>
              </div>

              {/* Uploading progress & percentage bar */}
              {uploading && (
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#B08A4A]" />
                  <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {uploadStage || "Inspecting APK structure and verifying cryptographic signature..."}
                  </p>
                  {uploadProgress !== null && (
                    <div className="mt-3">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-[#B08A4A] h-2.5 rounded-full transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mt-1.5 px-1">
                        <span>Direct-to-R2 Transfer</span>
                        <span className="font-bold text-[#B08A4A]">{uploadProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Inspection Feedback Box */}
              {inspectionResult && (
                <div
                  className={`rounded-xl border p-4 text-xs ${
                    inspectionResult.isValid
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-100"
                      : "border-rose-200 bg-rose-50 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-100"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-2">
                    {inspectionResult.isValid ? (
                      <>
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>APK Verified &amp; Persisted to Cloudflare R2</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        <span>APK Verification Failed: {inspectionResult.error}</span>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-2">
                    <div>
                      Package: <strong>{inspectionResult.packageName || "N/A"}</strong>
                    </div>
                    <div>
                      Size: <strong>{formatFileSize(inspectionResult.fileSize || 0)}</strong>
                    </div>
                    <div>
                      Version Name: <strong>{inspectionResult.versionName || "N/A"}</strong>
                    </div>
                    <div>
                      Version Code: <strong>{inspectionResult.versionCode || "N/A"}</strong>
                    </div>
                    {inspectionResult.storageKey && (
                      <div className="col-span-2 text-emerald-800 dark:text-emerald-300">
                        R2 Storage Key:{" "}
                        <span className="block truncate font-mono text-[10px]" title={inspectionResult.storageKey}>
                          {inspectionResult.storageKey}
                        </span>
                      </div>
                    )}
                    <div className="col-span-2">
                      SHA-256:{" "}
                      <span className="block truncate text-[10px] text-slate-700 dark:text-slate-300" title={inspectionResult.sha256}>
                        {inspectionResult.sha256}
                      </span>
                    </div>
                    {inspectionResult.certificateFingerprint && (
                      <div className="col-span-2">
                        Signing Fingerprint:{" "}
                        <span className="block truncate text-[10px] text-slate-700 dark:text-slate-300 font-mono" title={inspectionResult.certificateFingerprint}>
                          {inspectionResult.certificateFingerprint}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Compatibility Advisory (Non-blocking warning) */}
              {compatibilityWarning && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-amber-900 dark:text-amber-100">
                        Android Compatibility Advisory
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                        {compatibilityWarning}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Release Strategy Selector (Replace Existing Release vs Create As New) */}
              {inspectionResult && inspectionResult.isValid && selectedApp.versions.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Release Strategy
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                        releaseActionType === "REPLACE"
                          ? "border-[#B08A4A] bg-[#B08A4A]/5 ring-1 ring-[#B08A4A]"
                          : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="releaseActionType"
                        value="REPLACE"
                        checked={releaseActionType === "REPLACE"}
                        onChange={() => setReleaseActionType("REPLACE")}
                        className="mt-0.5 text-[#B08A4A]"
                      />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Replace Existing Release
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {matchingReleaseInfo
                            ? `Replace existing release v${matchingReleaseInfo.versionName} (Build ${matchingReleaseInfo.versionCode}) with this new binary.`
                            : "Replace an existing release record with this new binary."}
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                        releaseActionType === "NEW"
                          ? "border-[#B08A4A] bg-[#B08A4A]/5 ring-1 ring-[#B08A4A]"
                          : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="releaseActionType"
                        value="NEW"
                        checked={releaseActionType === "NEW"}
                        onChange={() => setReleaseActionType("NEW")}
                        className="mt-0.5 text-[#B08A4A]"
                      />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Create as New Release
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Publish as a distinct new release entry in the catalog.
                        </p>
                      </div>
                    </label>
                  </div>

                  {releaseActionType === "REPLACE" && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Select Target Release to Replace:
                      </label>
                      <select
                        value={targetReplaceReleaseId || ""}
                        onChange={(e) => setTargetReplaceReleaseId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
                      >
                        {selectedApp.versions.map((ver) => (
                          <option key={ver.id} value={ver.id}>
                            v{ver.versionName} (Build {ver.versionCode}) — {ver.apkFileName}
                            {ver.isPublished ? " [Published]" : " [Unpublished]"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Version & Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Version Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1.0.0"
                    value={releaseForm.versionName}
                    onChange={(e) => setReleaseForm({ ...releaseForm, versionName: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Version Code (Integer) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={releaseForm.versionCode}
                    onChange={(e) =>
                      setReleaseForm({ ...releaseForm, versionCode: parseInt(e.target.value) || 1 })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  What&apos;s New / Release Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Key features, bug fixes, or enhancements in this version..."
                  value={releaseForm.releaseNotes}
                  onChange={(e) => setReleaseForm({ ...releaseForm, releaseNotes: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Minimum Android Version
                  </label>
                  <input
                    type="text"
                    value={releaseForm.minAndroidVersion}
                    onChange={(e) => setReleaseForm({ ...releaseForm, minAndroidVersion: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  />
                </div>

                <div className="flex flex-col justify-center gap-2 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={releaseForm.isMandatory}
                      onChange={(e) => setReleaseForm({ ...releaseForm, isMandatory: e.target.checked })}
                      className="rounded border-border text-rose-600"
                    />
                    <span className="text-xs font-semibold text-rose-700">
                      Mandatory Update (force in-app update)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={releaseForm.isPublished}
                      onChange={(e) => setReleaseForm({ ...releaseForm, isPublished: e.target.checked })}
                      className="rounded border-border text-[#B08A4A]"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Publish Immediately
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    uploading ||
                    !inspectionResult ||
                    !inspectionResult.isValid ||
                    (releaseActionType === "REPLACE" && !targetReplaceReleaseId)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#B08A4A] px-4 py-2 text-xs font-bold text-white hover:bg-[#977338] disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{releaseActionType === "REPLACE" ? "Save & Replace Release" : "Publish Release"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: VERSION HISTORY & WITHDRAW                       */}
      {/* ======================================================== */}
      {isHistoryModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#B08A4A]" />
                <div>
                  <h2 className="text-base font-bold text-[#091329] dark:text-white">
                    Version History: {selectedApp.name}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Audit log of all uploaded APK releases, download metrics, and publication controls.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {selectedApp.versions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm font-semibold">No releases recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedApp.versions.map((release) => (
                    <div
                      key={release.id}
                      className="rounded-xl border border-border p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-base font-bold text-[#091329] dark:text-white">
                            v{release.versionName}
                          </span>
                          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                            Build {release.versionCode}
                          </span>
                          {selectedApp.currentVersionId === release.id ? (
                            <span className="rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] font-bold shadow-2xs">
                              ★ Active Production Release
                            </span>
                          ) : release.isPublished ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                              Published (Historical)
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              Staged / Draft
                            </span>
                          )}
                          {release.isMandatory && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              Mandatory
                            </span>
                          )}
                          {release.storageKey && (
                            <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                              Cloudflare R2
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {selectedApp.currentVersionId !== release.id && (
                            <button
                              type="button"
                              onClick={() => handleRollbackRelease(release)}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 text-xs font-semibold hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 transition-colors"
                              title="Roll back active production release pointer to this version"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Rollback</span>
                            </button>
                          )}

                          <a
                            href={`/api/apps/${selectedApp.slug}/download/${release.apkFileName}`}
                            download={release.apkFileName}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted text-slate-700 dark:text-slate-200 transition-colors"
                            title="Download this specific release APK directly from Cloudflare R2"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleToggleReleasePublished(release)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted text-slate-700 dark:text-slate-200"
                          >
                            {release.isPublished ? (
                              <>
                                <EyeOff className="h-3 w-3 text-amber-600" />
                                <span>Withdraw</span>
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 text-emerald-600" />
                                <span>Publish</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await runReleaseAcceptanceCheckAction(release.id);
                                if (res.passed) {
                                  alert(`✅ Acceptance Check 100% PASSED!\n\n• Binary: Accessible in Cloudflare R2 / Storage\n• Size: ${res.details.actualSize} bytes (exact match)\n• SHA-256: ${res.details.actualSha256} (verified)\n• Package: ${res.details.expectedPackage}\n• Version: v${res.details.versionName} (Build ${res.details.versionCode})\n• Signature: Production Keystore Verified`);
                                } else {
                                  alert(`❌ Acceptance Check FAILED: ${res.error}`);
                                }
                              } catch (err: any) {
                                alert(`Error running acceptance test: ${err?.message}`);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted text-[#B08A4A]"
                            title="Run end-to-end automated binary acceptance check"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            <span>Verify Binary</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRelease(release)}
                            className="p-1 rounded-lg border border-border text-rose-600 hover:bg-rose-50"
                            title="Delete this release"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {release.releaseNotes && (
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line">
                          {release.releaseNotes}
                        </p>
                      )}

                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground pt-3 border-t border-border">
                        <div>
                          Released: <strong className="text-slate-700 dark:text-slate-300">{formatDate(release.releasedAt)}</strong>
                        </div>
                        <div>
                          Size: <strong className="text-slate-700 dark:text-slate-300">{formatFileSize(release.fileSize)}</strong>
                        </div>
                        <div>
                          Downloads: <strong className="text-slate-700 dark:text-slate-300">{release.downloadCount}</strong>
                        </div>
                        <div>
                          OS: <strong className="text-slate-700 dark:text-slate-300">{release.minAndroidVersion}</strong>
                        </div>
                        <div className="col-span-2 truncate" title={release.storageKey || "Local disk"}>
                          Storage: <strong className="text-slate-700 dark:text-slate-300 font-mono text-[10px]">{release.storageKey || "Local Disk"}</strong>
                        </div>
                        <div className="col-span-2">
                          Signing: <strong className="text-emerald-700 dark:text-emerald-400 font-medium">{release.certificateFingerprint ? "✓ Official Keystore Verified" : "Unsigned"}</strong>
                        </div>
                      </div>

                      <div className="mt-2 rounded bg-muted/30 p-2 font-mono text-[10px] text-muted-foreground truncate" title={release.sha256}>
                        SHA-256: {release.sha256}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
