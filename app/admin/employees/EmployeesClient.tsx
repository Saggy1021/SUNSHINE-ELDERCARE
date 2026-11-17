"use client";

import { useState, useMemo } from "react";
import { 
  Plus, Edit2, Shield, Lock, Activity, UserX, Search, Users, 
  CheckCircle, XCircle, Phone, Mail, Calendar, AlertCircle, 
  Briefcase, Check, Sparkles, Building, UserCheck, Trash2, KeyRound, RefreshCw, ArrowLeft
} from "lucide-react";
import { 
  inviteAdminUserAction, 
  updateAdminUserAction, 
  toggleAdminStatusAction, 
  resetAdminPasswordAction, 
  revokeAdminInvitationAction,
  requestAdminCreationOtpAction,
  confirmAndCreateAdminAction
} from "@/app/actions/admin-users";
import { 
  createEmployee, 
  updateEmployee, 
  toggleEmployeeStatus,
  deleteEmployee
} from "@/app/actions/employee";
import { useRouter } from "next/navigation";

interface EmployeesClientProps {
  initialUsers?: any[];
  initialInvitations?: any[];
  invitationError?: boolean;
  roles?: any[];
  initialEmployees?: any[];
  employees?: any[];
  permissions?: {
    isOwner?: boolean;
    canManageAdmins?: boolean;
    canViewAdmins?: boolean;
    canViewEmployees?: boolean;
    canCreateEmployee?: boolean;
    canEditEmployee?: boolean;
    canDeactivateEmployee?: boolean;
  };
}

function formatDate(dateInput: any): string {
  if (!dateInput) return "-";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return "-";
  }
}

export function EmployeesClient({
  initialUsers = [],
  initialInvitations = [],
  invitationError = false,
  roles = [],
  initialEmployees,
  employees: legacyEmployees,
  permissions = {},
}: EmployeesClientProps) {
  const router = useRouter();

  // Determine initial tab based on permissions
  const canViewEmployees = permissions.canViewEmployees ?? true;
  const canViewAdmins = permissions.canViewAdmins ?? true;
  const canCreateEmployee = permissions.canCreateEmployee ?? true;
  const canEditEmployee = permissions.canEditEmployee ?? true;
  const canDeactivateEmployee = permissions.canDeactivateEmployee ?? true;
  const canManageAdmins = permissions.canManageAdmins ?? true;

  const [activeTab, setActiveTab] = useState<"employees" | "admins">(
    canViewEmployees ? "employees" : "admins"
  );

  // --- Employee State ---
  const [employeeList, setEmployeeList] = useState<any[]>(initialEmployees || legacyEmployees || []);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<string>("ALL");
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeeSuccessMsg, setEmployeeSuccessMsg] = useState<string | null>(null);

  // --- Employee Deletion State ---
  const [deletingEmployee, setDeletingEmployee] = useState<any | null>(null);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // --- Admin State (Preserved & OTP Protected) ---
  const invitations = initialInvitations || [];
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminStep, setAdminStep] = useState<"DETAILS" | "OTP">("DETAILS");
  const [adminOtp, setAdminOtp] = useState("");
  const [adminFormPayload, setAdminFormPayload] = useState<{
    name: string;
    email: string;
    employeeId: string;
    roleIds: string[];
    password?: string;
  }>({ name: "", email: "", employeeId: "", roleIds: [] });
  const [adminOtpError, setAdminOtpError] = useState<string | null>(null);
  const [adminOtpSuccessMsg, setAdminOtpSuccessMsg] = useState<string | null>(null);
  const [adminOtpResending, setAdminOtpResending] = useState(false);

  const [editingUser, setEditingUser] = useState<any>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<any>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [adminRoleFilter, setAdminRoleFilter] = useState("");

  // Sync employee list when props change
  useMemo(() => {
    if (initialEmployees) {
      setEmployeeList(initialEmployees);
    } else if (legacyEmployees) {
      setEmployeeList(legacyEmployees);
    }
  }, [initialEmployees, legacyEmployees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employeeList.filter((emp) => {
      const q = employeeSearch.toLowerCase().trim();
      const qNorm = q.replace(/[\/\s-]/g, "");
      const matchesSearch =
        !q ||
        (emp.firstName && emp.firstName.toLowerCase().includes(q)) ||
        (emp.lastName && emp.lastName.toLowerCase().includes(q)) ||
        (emp.employeeId && (emp.employeeId.toLowerCase().includes(q) || (qNorm && emp.employeeId.toLowerCase().includes(qNorm)))) ||
        (emp.designation && emp.designation.toLowerCase().includes(q)) ||
        (emp.contactNumber && emp.contactNumber.toLowerCase().includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q));

      const matchesStatus =
        employeeStatusFilter === "ALL" || emp.status === employeeStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employeeList, employeeSearch, employeeStatusFilter]);

  // Filtered admin users
  const filteredUsers = useMemo(() => {
    return initialUsers
      .filter((user: any) => {
        const matchesSearch =
          !adminSearchQuery ||
          user.name?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(adminSearchQuery.toLowerCase());

        const matchesRole =
          !adminRoleFilter ||
          user.userRoles?.some((ur: any) => ur.roleId === adminRoleFilter);

        return matchesSearch && matchesRole;
      })
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
  }, [initialUsers, adminSearchQuery, adminRoleFilter]);

  // Counts
  const activeEmployeeCount = useMemo(() => {
    return employeeList.filter((e) => e.status === "ACTIVE").length;
  }, [employeeList]);

  // --- Employee Handlers ---
  async function handleCreateEmployeeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmployeeSubmitting(true);
    setEmployeeError(null);

    const formData = new FormData(e.currentTarget);
    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const designation = (formData.get("designation") as string)?.trim();
    const employeeId = (formData.get("employeeId") as string)?.trim() || undefined;
    const contactNumber = (formData.get("contactNumber") as string)?.trim() || undefined;
    const email = (formData.get("email") as string)?.trim() || undefined;
    const status = (formData.get("status") as "ACTIVE" | "INACTIVE") || "ACTIVE";
    const publicBiography = (formData.get("publicBiography") as string)?.trim() || undefined;

    try {
      const res = await createEmployee({
        firstName,
        lastName,
        designation,
        employeeId,
        contactNumber,
        email,
        status,
        publicBiography,
      });

      if (!res.success) {
        setEmployeeError(res.error || "Failed to create employee.");
        setEmployeeSubmitting(false);
        return;
      }

      setEmployeeSuccessMsg(`Employee ${firstName} ${lastName} created successfully! (ID: ${res.employee.employeeId})`);
      setIsCreatingEmployee(false);
      if (res.employee) {
        setEmployeeList((prev) => [res.employee, ...prev]);
      }
      router.refresh();
      setTimeout(() => setEmployeeSuccessMsg(null), 4000);
    } catch (err: any) {
      setEmployeeError(err?.message || "An unexpected error occurred.");
    } finally {
      setEmployeeSubmitting(false);
    }
  }

  async function handleEditEmployeeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingEmployee) return;

    setEmployeeSubmitting(true);
    setEmployeeError(null);

    const formData = new FormData(e.currentTarget);
    const firstName = (formData.get("firstName") as string)?.trim();
    const lastName = (formData.get("lastName") as string)?.trim();
    const designation = (formData.get("designation") as string)?.trim();
    const employeeId = (formData.get("employeeId") as string)?.trim();
    const contactNumber = (formData.get("contactNumber") as string)?.trim() || undefined;
    const email = (formData.get("email") as string)?.trim() || undefined;
    const status = (formData.get("status") as "ACTIVE" | "INACTIVE") || "ACTIVE";
    const publicBiography = (formData.get("publicBiography") as string)?.trim() || undefined;

    try {
      const res = await updateEmployee(editingEmployee.id, {
        firstName,
        lastName,
        designation,
        employeeId,
        contactNumber,
        email,
        status,
        publicBiography,
      });

      if (!res.success) {
        setEmployeeError(res.error || "Failed to update employee.");
        setEmployeeSubmitting(false);
        return;
      }

      setEmployeeSuccessMsg(`Employee ${firstName} ${lastName} updated successfully.`);
      setEditingEmployee(null);
      if (res.employee) {
        setEmployeeList((prev) =>
          prev.map((emp) => (emp.id === res.employee.id ? res.employee : emp))
        );
      }
      router.refresh();
      setTimeout(() => setEmployeeSuccessMsg(null), 4000);
    } catch (err: any) {
      setEmployeeError(err?.message || "An unexpected error occurred.");
    } finally {
      setEmployeeSubmitting(false);
    }
  }

  async function handleToggleEmployeeStatus(employee: any) {
    const isActivating = employee.status !== "ACTIVE";
    const confirmMsg = isActivating
      ? `Activate employee ${employee.firstName} ${employee.lastName}? They will be available for visit assignments.`
      : `Deactivate employee ${employee.firstName} ${employee.lastName}? They will no longer appear in new visit scheduling dropdowns. Historical visits remain intact.`;

    if (!confirm(confirmMsg)) return;

    setEmployeeSubmitting(true);
    try {
      console.log("[handleToggleEmployeeStatus] Calling toggleEmployeeStatus with id:", employee.id);
      const res = await toggleEmployeeStatus(employee.id);
      console.log("[handleToggleEmployeeStatus] Received response:", res);
      if (!res.success) {
        alert(res.error || "Failed to update employee status.");
        return;
      }

      setEmployeeList((prev) =>
        prev.map((emp) => (emp.id === employee.id ? res.employee : emp))
      );
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Error updating status.");
    } finally {
      setEmployeeSubmitting(false);
    }
  }

  // --- Employee Deletion Handler ---
  async function handleConfirmDeleteEmployee() {
    if (!deletingEmployee) return;
    setIsDeletingEmployee(true);
    setDeleteError(null);
    try {
      const res = await deleteEmployee(deletingEmployee.id);
      if (!res.success) {
        setDeleteError(res.error || "Failed to delete employee.");
        setIsDeletingEmployee(false);
        return;
      }
      setEmployeeList((prev) => prev.filter((e) => e.id !== deletingEmployee.id));
      setEmployeeSuccessMsg(
        res.message ||
          `Employee ${deletingEmployee.firstName} ${deletingEmployee.lastName} (${deletingEmployee.employeeId}) has been permanently deleted.`
      );
      setDeletingEmployee(null);
      router.refresh();
    } catch (err: any) {
      setDeleteError(err?.message || "An unexpected error occurred while deleting the employee.");
    } finally {
      setIsDeletingEmployee(false);
    }
  }

  // --- Admin OTP Handlers ---
  async function handleRequestAdminOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdminOtpError(null);
    setAdminLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("name") as string || "").trim();
    const email = (formData.get("email") as string || "").trim();
    const employeeId = (formData.get("employeeId") as string || "").trim();
    const roleIds = formData.getAll("roleIds") as string[];
    const password = (formData.get("password") as string || "").trim();

    if (!name || !email) {
      setAdminOtpError("Name and Email are required.");
      setAdminLoading(false);
      return;
    }
    if (roleIds.length === 0) {
      setAdminOtpError("Please select at least one role.");
      setAdminLoading(false);
      return;
    }

    setAdminFormPayload({ name, email, employeeId, roleIds, password });

    try {
      const res = await requestAdminCreationOtpAction({
        name,
        email,
        roleIds,
        employeeId: employeeId || null,
      });

      if (!res.success) {
        setAdminOtpError(res.error || "Failed to request verification code.");
        setAdminLoading(false);
        return;
      }

      setAdminOtpSuccessMsg(res.message || "A 6-digit verification code has been dispatched.");
      setAdminStep("OTP");
    } catch (err: any) {
      setAdminOtpError(err?.message || "Failed to dispatch verification code.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleConfirmCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminOtp || adminOtp.trim().length !== 6) {
      setAdminOtpError("Please enter the 6-digit verification code.");
      return;
    }
    setAdminOtpError(null);
    setAdminLoading(true);

    try {
      const res = await confirmAndCreateAdminAction({
        email: adminFormPayload.email,
        name: adminFormPayload.name,
        otp: adminOtp.trim(),
        roleIds: adminFormPayload.roleIds,
        employeeId: adminFormPayload.employeeId || null,
        password: adminFormPayload.password || undefined,
      });

      if (!res.success) {
        setAdminOtpError(res.error || "Failed to verify code.");
        setAdminLoading(false);
        return;
      }

      setIsCreatingAdmin(false);
      setAdminStep("DETAILS");
      setAdminOtp("");
      setAdminOtpSuccessMsg(null);
      setAdminOtpError(null);
      setEmployeeSuccessMsg(
        `Administrator account for ${adminFormPayload.name} (${adminFormPayload.email}) has been successfully created.`
      );
      router.refresh();
    } catch (err: any) {
      setAdminOtpError(err?.message || "Failed to create administrator account.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleResendAdminOtp() {
    if (adminOtpResending) return;
    setAdminOtpResending(true);
    setAdminOtpError(null);
    try {
      const res = await requestAdminCreationOtpAction({
        name: adminFormPayload.name,
        email: adminFormPayload.email,
        roleIds: adminFormPayload.roleIds,
        employeeId: adminFormPayload.employeeId || null,
      });
      if (!res.success) {
        setAdminOtpError(res.error || "Failed to resend code.");
      } else {
        setAdminOtpSuccessMsg("A new 6-digit verification code has been dispatched.");
      }
    } catch (err: any) {
      setAdminOtpError(err?.message || "Failed to resend code.");
    } finally {
      setAdminOtpResending(false);
    }
  }

  // --- Admin Handlers (Preserved) ---
  async function handleCreateAdmin(e: React.FormEvent<HTMLFormElement>) {
    await handleRequestAdminOtp(e);
  }

  async function handleRevokeAdmin(invId: string) {
    if (!confirm("Revoke this invitation?")) return;
    setAdminLoading(true);
    try {
      await revokeAdminInvitationAction(invId);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
    setAdminLoading(false);
  }

  async function handleUpdateAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingUser) return;
    setAdminLoading(true);
    try {
      await updateAdminUserAction(editingUser.id, new FormData(e.currentTarget));
      setEditingUser(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
    setAdminLoading(false);
  }

  async function handleToggleAdminStatus(user: any) {
    if (
      !confirm(
        `Are you sure you want to ${
          user.status === "ACTIVE" ? "deactivate" : "activate"
        } this admin?`
      )
    )
      return;
    setAdminLoading(true);
    try {
      await toggleAdminStatusAction(user.id, user.status);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
    setAdminLoading(false);
  }

  async function handlePasswordReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passwordResetUser) return;
    setAdminLoading(true);
    try {
      await resetAdminPasswordAction(
        passwordResetUser.id,
        new FormData(e.currentTarget)
      );
      setPasswordResetUser(null);
      alert("Password reset successfully.");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
    setAdminLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {employeeSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{employeeSuccessMsg}</span>
          </div>
          <button
            onClick={() => setEmployeeSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Tabs: Clearly separates Employees and Administrative Accounts */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
        <div className="flex items-center gap-2 -mb-px">
          {canViewEmployees && (
            <button
              onClick={() => setActiveTab("employees")}
              className={`flex items-center gap-2.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "employees"
                  ? "border-[#1A365D] text-[#1A365D]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Employees</span>
              <span
                className={`ml-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                  activeTab === "employees"
                    ? "bg-blue-100 text-[#1A365D]"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {employeeList.length}
              </span>
            </button>
          )}

          {canViewAdmins && (
            <button
              onClick={() => setActiveTab("admins")}
              className={`flex items-center gap-2.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "admins"
                  ? "border-amber-600 text-amber-900"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Shield className="h-4 w-4 text-amber-600" />
              <span>Administrative Accounts</span>
              <span
                className={`ml-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                  activeTab === "admins"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {initialUsers.length}
              </span>
            </button>
          )}
        </div>

        {/* Header Action Button according to active tab */}
        <div className="pb-2">
          {activeTab === "employees" && canCreateEmployee && (
            <button
              onClick={() => {
                setEmployeeError(null);
                setIsCreatingEmployee(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A365D] text-white text-sm font-medium rounded-lg hover:bg-[#152C4F] transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> New Employee
            </button>
          )}

          {activeTab === "admins" && canManageAdmins && (
            <button
              onClick={() => {
                setAdminStep("DETAILS");
                setAdminOtp("");
                setAdminOtpError(null);
                setAdminOtpSuccessMsg(null);
                setIsCreatingAdmin(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> New Admin
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EMPLOYEES (Care Staff & Field Personnel)                            */}
      {/* ========================================================================= */}
      {activeTab === "employees" && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Staff</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{employeeList.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Staff</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{activeEmployeeCount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inactive Staff</p>
                <p className="text-2xl font-bold text-slate-500 mt-1">{employeeList.length - activeEmployeeCount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                <UserX className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Search, Filter & Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-4 w-full md:w-auto flex-1">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, designation, phone, email..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]"
                  />
                </div>
                <select
                  value={employeeStatusFilter}
                  onChange={(e) => setEmployeeStatusFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D] bg-white text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                </select>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Showing {filteredEmployees.length} of {employeeList.length} employee{employeeList.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Employee Name</th>
                    <th className="px-6 py-3.5">Employee ID</th>
                    <th className="px-6 py-3.5">Designation</th>
                    <th className="px-6 py-3.5">Contact Details</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Joining Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-medium text-slate-700">No employees found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {employeeSearch || employeeStatusFilter !== "ALL"
                            ? "Try adjusting your search query or status filter."
                            : "Click 'New Employee' above to register your first care staff member."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const initials = `${(emp.firstName?.[0] || "").toUpperCase()}${(emp.lastName?.[0] || "").toUpperCase()}` || "SE";
                      const isActive = emp.status === "ACTIVE";

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Name & Avatar */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-slate-100 text-[#1A365D] font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                                {initials}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                  <span>{emp.firstName} {emp.lastName}</span>
                                  {emp.userId && (
                                    <span title="Linked to Admin Account" className="inline-flex items-center px-1.5 py-0.2 bg-amber-50 text-amber-700 text-[10px] font-medium rounded border border-amber-200">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                {emp.publicBiography && (
                                  <p className="text-xs text-slate-400 truncate max-w-xs" title={emp.publicBiography}>
                                    {emp.publicBiography}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-medium">
                              {emp.employeeId || "—"}
                            </span>
                          </td>

                          {/* Designation */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              <Briefcase className="h-3 w-3 shrink-0" />
                              {emp.designation || "Staff"}
                            </span>
                          </td>

                          {/* Contact Details */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {emp.contactNumber ? (
                                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                  <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span>{emp.contactNumber}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No phone</span>
                              )}
                              {emp.email && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="truncate max-w-[180px]">{emp.email}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isActive ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              />
                              {emp.status}
                            </span>
                          </td>

                          {/* Joining Date */}
                          <td className="px-6 py-4 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                              <span suppressHydrationWarning>{formatDate(emp.createdAt)}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right space-x-2">
                            {canEditEmployee && (
                              <button
                                onClick={() => {
                                  setEmployeeError(null);
                                  setEditingEmployee(emp);
                                }}
                                title="Edit Employee"
                                className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-[#1A365D] hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}

                            {canDeactivateEmployee && (
                              <button
                                onClick={() => handleToggleEmployeeStatus(emp)}
                                title={isActive ? "Deactivate Employee" : "Activate Employee"}
                                disabled={employeeSubmitting || isDeletingEmployee}
                                className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors ${
                                  isActive
                                    ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                    : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                }`}
                              >
                                {isActive ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <Activity className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            {canDeactivateEmployee && (
                              <button
                                onClick={() => {
                                  setEmployeeError(null);
                                  setDeleteError(null);
                                  setDeletingEmployee(emp);
                                }}
                                title="Delete Employee"
                                disabled={employeeSubmitting || isDeletingEmployee}
                                className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ADMINISTRATIVE ACCOUNTS (Preserved Original Implementation)        */}
      {/* ========================================================================= */}
      {activeTab === "admins" && (
        <div className="space-y-6">
          <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">Administrative Dashboard Credentials</h3>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Accounts listed here possess system credentials to access the Sunshine Admin Dashboard with specific role-based permissions. They are strictly separate from operational care staff.
              </p>
            </div>
          </div>

          {invitationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
              <p className="text-sm font-medium">Pending invitations cannot be displayed.</p>
              <p className="text-sm">
                The system is currently undergoing a database upgrade. This section will be restored shortly.
              </p>
            </div>
          )}

          {!invitationError && invitations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <table className="w-full text-sm text-left">
                <thead className="bg-amber-50 text-amber-700 font-medium border-b border-amber-200">
                  <tr>
                    <th className="px-6 py-4">Invited Name & Email</th>
                    <th className="px-6 py-4">Roles</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((inv: any) => {
                    const roleIds = JSON.parse(inv.roleIds || "[]");
                    const roleNames = roles
                      .filter((r: any) => roleIds.includes(r.id))
                      .map((r: any) => r.name);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{inv.name}</div>
                          <div className="text-slate-500 text-xs">{inv.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {roleNames.map((name: string) => (
                              <span
                                key={name}
                                className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-100"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {inv.status === "PENDING" && (
                            <button
                              onClick={() => handleRevokeAdmin(inv.id)}
                              className="text-xs font-medium text-rose-600 hover:text-rose-800"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Search and Filters */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search admins by name/email..."
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={adminRoleFilter}
                  onChange={(e) => setAdminRoleFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All Roles</option>
                  {roles.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-slate-500">
                {filteredUsers.length} admin{filteredUsers.length !== 1 ? "s" : ""}
              </div>
            </div>

            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Admin Name</th>
                  <th className="px-6 py-4">Roles</th>
                  <th className="px-6 py-4">Employee Link</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No administrative users match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user: any) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{user.name}</div>
                        <div className="text-slate-500 text-xs">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.userRoles?.map((ur: any) => (
                            <span
                              key={ur.roleId}
                              className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-100"
                            >
                              {ur.role.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.employee ? (
                          <span className="text-slate-700 font-medium">
                            {user.employee.firstName} {user.employee.lastName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {canManageAdmins && (
                          <>
                            <button
                              onClick={() => setEditingUser(user)}
                              className="text-slate-400 hover:text-indigo-600"
                              title="Edit Admin Roles"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setPasswordResetUser(user)}
                              className="text-slate-400 hover:text-amber-600"
                              title="Reset Password"
                            >
                              <Lock className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleAdminStatus(user)}
                              className="text-slate-400 hover:text-rose-600"
                              title="Toggle Active Status"
                            >
                              {user.status === "ACTIVE" ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <Activity className="h-4 w-4" />
                              )}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Register New Employee                                              */}
      {/* ========================================================================= */}
      {isCreatingEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#1A365D]" /> Register New Employee
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operational care personnel for home visits and assignments.
                </p>
              </div>
            </div>

            {/* Explanatory Notice */}
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 mb-4 text-xs text-blue-900 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Care Personnel Only:</span> Creating an employee records operational staff. It does <strong className="underline">not</strong> grant dashboard login credentials.
              </div>
            </div>

            {employeeError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl mb-4 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{employeeError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEmployeeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="firstName"
                    required
                    placeholder="e.g. Ananya"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="lastName"
                    required
                    placeholder="e.g. Roy"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation / Role <span className="text-rose-500">*</span>
                </label>
                <input
                  name="designation"
                  required
                  placeholder="e.g. Care Coordinator, Nurse, Attendant, Physiotherapist"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employee ID <span className="text-slate-400 font-normal">(Auto-generated)</span>
                </label>
                <input
                  name="employeeId"
                  disabled
                  placeholder="Auto-assigned (e.g. SEC186TAAM)"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg text-sm font-mono cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Sequential Employee ID without slashes is automatically generated using First 2 + Last 2 name rule.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact / Mobile <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    name="contactNumber"
                    placeholder="e.g. +91 98301 23456"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="e.g. staff@sunshineeldercare.in"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operational Status <span className="text-rose-500">*</span>
                </label>
                <select
                  name="status"
                  defaultValue="ACTIVE"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none bg-white"
                >
                  <option value="ACTIVE">ACTIVE (Available for visit assignments)</option>
                  <option value="INACTIVE">INACTIVE (Excluded from scheduling)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Public Biography / Operational Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  name="publicBiography"
                  rows={2}
                  placeholder="Specialities, certifications, or operational instructions..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingEmployee(false)}
                  disabled={employeeSubmitting}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={employeeSubmitting}
                  className="px-5 py-2 bg-[#1A365D] text-white text-sm font-semibold rounded-lg hover:bg-[#152C4F] transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
                >
                  {employeeSubmitting ? "Creating..." : "Register Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Edit Existing Employee                                             */}
      {/* ========================================================================= */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit2 className="h-5 w-5 text-[#1A365D]" /> Edit Employee
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Updating operational record for {editingEmployee.firstName} {editingEmployee.lastName}
                </p>
              </div>
            </div>

            {employeeError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl mb-4 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{employeeError}</span>
              </div>
            )}

            <form onSubmit={handleEditEmployeeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="firstName"
                    defaultValue={editingEmployee.firstName}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="lastName"
                    defaultValue={editingEmployee.lastName}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation / Role <span className="text-rose-500">*</span>
                </label>
                <input
                  name="designation"
                  defaultValue={editingEmployee.designation}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employee ID <span className="text-rose-500">*</span>
                </label>
                <input
                  name="employeeId"
                  defaultValue={editingEmployee.employeeId}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#1A365D] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact / Mobile
                  </label>
                  <input
                    type="tel"
                    name="contactNumber"
                    defaultValue={editingEmployee.contactNumber || ""}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingEmployee.email || ""}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operational Status <span className="text-rose-500">*</span>
                </label>
                <select
                  name="status"
                  defaultValue={editingEmployee.status}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none bg-white"
                >
                  <option value="ACTIVE">ACTIVE (Available for visit assignments)</option>
                  <option value="INACTIVE">INACTIVE (Excluded from scheduling)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Public Biography / Operational Notes
                </label>
                <textarea
                  name="publicBiography"
                  defaultValue={editingEmployee.publicBiography || ""}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1A365D] outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  disabled={employeeSubmitting}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={employeeSubmitting}
                  className="px-5 py-2 bg-[#1A365D] text-white text-sm font-semibold rounded-lg hover:bg-[#152C4F] transition-colors disabled:opacity-50 shadow-sm"
                >
                  {employeeSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Delete Employee Confirmation Modal                                  */}
      {/* ========================================================================= */}
      {deletingEmployee && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-50 rounded-lg">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Permanently Delete Employee</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete employee{" "}
              <strong className="text-slate-900 font-semibold">
                {deletingEmployee.firstName} {deletingEmployee.lastName}
              </strong>{" "}
              (Employee ID:{" "}
              <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                {deletingEmployee.employeeId || "UNASSIGNED"}
              </span>
              )?
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <div className="leading-relaxed">{deleteError}</div>
              </div>
            )}

            <div className="text-xs text-slate-600 mb-5 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="font-medium text-slate-800">What will happen:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Employee profile and Employee ID will be permanently deleted.</li>
                <li>Historical care visit records are preserved with caregiver history archived.</li>
                <li>Care tasks will be unassigned and preserved for continuity.</li>
                <li>Any associated administrative credentials will be automatically revoked.</li>
              </ul>
              <div className="text-[11px] text-rose-600 font-medium pt-1">This action cannot be undone.</div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingEmployee(null);
                  setDeleteError(null);
                }}
                disabled={isDeletingEmployee}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEmployee}
                disabled={isDeletingEmployee}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                {isDeletingEmployee ? "Deleting..." : "Permanently Delete Employee"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Creation Modal (Admin User - Primary Owner OTP Protected)            */}
      {/* ========================================================================= */}
      {isCreatingAdmin && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            {adminStep === "DETAILS" ? (
              <>
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">New Administrator Account</h3>
                    <p className="text-xs text-slate-500">
                      Requires Primary Owner OTP authorization.
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 my-3 text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                  <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    A 6-digit verification code will be dispatched exclusively to the Primary Owner email (<span className="font-medium text-amber-900">info.sunshineeldercare@gmail.com</span>) to authorize creation.
                  </div>
                </div>

                {adminOtpError && (
                  <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                    <div>{adminOtpError}</div>
                  </div>
                )}

                <form onSubmit={handleRequestAdminOtp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      name="name"
                      required
                      defaultValue={adminFormPayload.name}
                      placeholder="e.g. Ananya Sen"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Admin Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      defaultValue={adminFormPayload.email}
                      placeholder="e.g. ananya.sen@sunshineeldercare.in"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Employee Link (Optional)
                    </label>
                    <select
                      name="employeeId"
                      defaultValue={adminFormPayload.employeeId}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-700"
                    >
                      <option value="">-- No Link --</option>
                      {employeeList.map((e: any) => (
                        <option key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} ({e.employeeId || e.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Assigned Roles *
                    </label>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto p-2.5 border border-slate-200 rounded-lg bg-slate-50">
                      {roles.map((r: any) => (
                        <label key={r.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition-colors">
                          <input
                            type="checkbox"
                            name="roleIds"
                            value={r.id}
                            defaultChecked={adminFormPayload.roleIds.includes(r.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-medium text-slate-700">{r.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Initial Password (Optional)
                    </label>
                    <input
                      type="password"
                      name="password"
                      defaultValue={adminFormPayload.password}
                      placeholder="Minimum 8 characters (or leave blank to send invite)"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingAdmin(false);
                        setAdminOtpError(null);
                      }}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={adminLoading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
                    >
                      {adminLoading ? "Sending Code..." : "Send Verification Code"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Authorize Admin Creation</h3>
                    <p className="text-xs text-slate-500">
                      Enter the 6-digit verification code to complete creation.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 my-3 text-xs text-slate-700 space-y-1">
                  <div>
                    <span className="text-slate-500">Target Admin:</span>{" "}
                    <strong className="text-slate-900 font-semibold">{adminFormPayload.name}</strong>{" "}
                    ({adminFormPayload.email})
                  </div>
                  <div>
                    <span className="text-slate-500">Roles:</span>{" "}
                    <span className="font-medium text-indigo-700">
                      {roles
                        .filter((r: any) => adminFormPayload.roleIds.includes(r.id))
                        .map((r: any) => r.name)
                        .join(", ") || "Selected roles"}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 mb-3 text-xs flex items-start gap-2 leading-relaxed">
                  <Mail className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    A 6-digit code has been dispatched exclusively to <strong className="text-blue-900">info.sunshineeldercare@gmail.com</strong>. The proposed admin will never receive this authorization code.
                  </div>
                </div>

                {adminOtpSuccessMsg && (
                  <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                    <div>{adminOtpSuccessMsg}</div>
                  </div>
                )}

                {adminOtpError && (
                  <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                    <div>{adminOtpError}</div>
                  </div>
                )}

                <form onSubmit={handleConfirmCreateAdmin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 text-center">
                      6-Digit Security Code
                    </label>
                    <input
                      type="text"
                      autoFocus
                      maxLength={6}
                      value={adminOtp}
                      onChange={(e) => setAdminOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full text-center font-mono text-2xl tracking-[0.5em] py-2.5 px-3 border-2 border-slate-300 rounded-lg focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                    <p className="text-[11px] text-slate-500 text-center mt-1.5">
                      Valid for 5 minutes • Maximum 5 verification attempts
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminStep("DETAILS");
                        setAdminOtpError(null);
                        setAdminOtpSuccessMsg(null);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors flex items-center gap-1.5"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResendAdminOtp}
                        disabled={adminOtpResending || adminLoading}
                        className="px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <RefreshCw className={`h-3 w-3 ${adminOtpResending ? "animate-spin" : ""}`} />
                        Resend
                      </button>
                      <button
                        type="submit"
                        disabled={adminLoading || adminOtp.length !== 6}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-xs font-semibold transition-colors shadow-sm"
                      >
                        {adminLoading ? "Verifying..." : "Confirm & Create Admin"}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Editing Modal (Admin User - Preserved)                             */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Edit Admin: {editingUser.name}
            </h3>
            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Employee Link (Optional)
                </label>
                <select
                  name="employeeId"
                  defaultValue={editingUser.employeeId || ""}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- No Link --</option>
                  {employeeList.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.employeeId || e.designation})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Roles</label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-slate-50">
                  {roles.map((r: any) => {
                    const hasRole = editingUser.userRoles?.some(
                      (ur: any) => ur.roleId === r.id
                    );
                    return (
                      <label key={r.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="roleIds"
                          value={r.id}
                          defaultChecked={hasRole}
                        />
                        <span className="text-sm font-medium text-slate-700">{r.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Password Reset Modal (Admin User - Preserved)                      */}
      {/* ========================================================================= */}
      {passwordResetUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Reset Password: {passwordResetUser.name}
            </h3>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}