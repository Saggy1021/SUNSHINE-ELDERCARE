import { getMemberDetails } from "@/app/actions/admin"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, UserSquare2, Shield, ShieldAlert, CheckCircle2, Clock, CalendarDays, Receipt, FileText, ClipboardList, Activity } from "lucide-react"

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const memberResult = await getMemberDetails(params.id)
  
  if (!memberResult) notFound()
  const member: any = memberResult;

  const currentSubscription = member.subscriptions[0]
  const profile = member.memberProfile

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/members" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserSquare2 className="h-6 w-6 text-blue-600" /> Member Details
          </h1>
          <p className="text-slate-600 mt-1">System ID: {member.id}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Column: Identity, Contact, Sponsor, Emergency, Medical, Insurance */}
        <div className="space-y-6 lg:col-span-1">
          {/* Identity & Profile */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Identity & Profile</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Name</p>
                <p className="font-semibold text-slate-900">{member.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Member ID</p>
                <p className="font-mono font-bold text-slate-900">{profile?.memberId || "UNASSIGNED"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Role</p>
                <span className={`inline-flex mt-1 text-xs font-semibold px-2 py-1 rounded-md ${member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                  {member.role}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Joined</p>
                <p className="font-semibold text-slate-900">{member.createdAt.toLocaleDateString('en-GB')}</p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Contact</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Email</p>
                <p className="font-semibold text-slate-900">{member.email}</p>
              </div>
              {profile && (
                <>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Phone</p>
                    <p className="font-semibold text-slate-900">{profile.mobileNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Service Address</p>
                    <p className="font-semibold text-slate-900 whitespace-pre-wrap">{profile.serviceAddress}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sponsor */}
          {profile?.sponsor && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <UserSquare2 className="h-5 w-5 text-indigo-500" /> Sponsor
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Name & Relationship</p>
                  <p className="font-semibold text-slate-900">{profile.sponsor.fullName} ({profile.sponsor.relationship})</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Phone</p>
                  <p className="font-semibold text-slate-900">{profile.sponsor.mobileNumber}</p>
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {member.emergencyContact && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" /> Emergency Contact
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Name & Relationship</p>
                  <p className="font-semibold text-slate-900">{member.emergencyContact.fullName} ({member.emergencyContact.relationship})</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Phone</p>
                  <p className="font-semibold text-slate-900">{member.emergencyContact.phone}</p>
                </div>
              </div>
            </div>
          )}

          {/* Insurance */}
          {profile?.insuranceDetails && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-500" /> Insurance Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Provider</p>
                  <p className="font-semibold text-slate-900">{profile.insuranceDetails.providerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Policy Number</p>
                  <p className="font-semibold text-slate-900">{profile.insuranceDetails.policyNumber}</p>
                </div>
              </div>
            </div>
          )}

          {/* Medical Authorization */}
          {profile?.medicalAuth && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Activity className="h-5 w-5 text-pink-500" /> Medical Authorization
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Hospital for SOS</p>
                  <p className="font-semibold text-slate-900">{profile.medicalAuth.hospitalForSos || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Shift Authorization</p>
                  <p className="font-semibold text-slate-900">{profile.medicalAuth.shiftAuthorization ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Memberships, Financials, Audit */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Memberships (Current and History) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Memberships</h2>
            {member.subscriptions.length === 0 ? (
              <p className="text-slate-500 text-sm">No memberships found.</p>
            ) : (
              <div className="space-y-4">
                {member.subscriptions.map((sub, index) => {
                  const isCurrent = index === 0;
                  const planName = sub.customPlan ? sub.customPlan.name : (sub.carePlan?.name || "Unknown Plan");
                  return (
                    <div key={sub.id} className={`p-4 rounded-lg border ${isCurrent ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'} shadow-sm`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            {isCurrent && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-800 uppercase tracking-wider">Current</span>}
                            <h3 className="font-semibold text-slate-900">{planName}</h3>
                            {sub.customPlan && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider">Custom Plan</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{sub.durationMonths} Months • {sub.variantType || 'Custom'}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium tracking-wide
                          ${sub.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 
                            sub.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600' :
                            sub.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-600' :
                            sub.status === 'EXPIRED' ? 'bg-red-500/10 text-red-600' :
                            'bg-slate-500/10 text-slate-600'}`}
                        >
                          {sub.status}
                        </span>
                      </div>
                      
                      {(sub.startDate || sub.endDate) && (
                        <div className="text-xs text-slate-500 flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Start: {sub.startDate?.toLocaleDateString('en-GB') || '?'}</div>
                          <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> End: {sub.endDate?.toLocaleDateString('en-GB') || '?'}</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Renewal Requests */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Renewal Requests</h2>
            {member.renewalRequests.length === 0 ? (
              <p className="text-slate-500 text-sm">No renewal requests.</p>
            ) : (
              <div className="space-y-3">
                {member.renewalRequests.map(req => (
                  <div key={req.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{req.planName} ({req.durationMonths}m)</p>
                      <p className="text-xs text-slate-500 mt-1">Requested Start: {req.requestedStartDate.toLocaleDateString('en-GB')}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold
                      ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'}`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Plan Agreements */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Custom Plan Agreements</h2>
            {member.customPlanAgreements.length === 0 ? (
              <p className="text-slate-500 text-sm">No custom plans.</p>
            ) : (
              <div className="space-y-3">
                {member.customPlanAgreements.map(cp => (
                  <div key={cp.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{cp.name} ({cp.durationMonths}m)</p>
                      <p className="text-xs text-slate-500 mt-1">₹{cp.totalPrice.toString()}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold
                      ${cp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        cp.status === 'DRAFT' ? 'bg-slate-100 text-slate-700' :
                        'bg-amber-100 text-amber-700'}`}
                    >
                      {cp.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial Documents */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Financial Documents</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Payments</h3>
                {member.payments.length === 0 ? (
                  <p className="text-slate-500 text-xs">No payments found.</p>
                ) : (
                  <div className="space-y-2">
                    {member.payments.map(payment => (
                      <div key={payment.id} className="flex justify-between text-sm bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="text-slate-700">₹{payment.amount.toString()} ({payment.paymentMethod})</span>
                        <span className={`text-xs font-semibold ${payment.status === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-600'}`}>{payment.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><FileText className="h-4 w-4" /> Invoices</h3>
                {member.invoices.length === 0 ? (
                  <p className="text-slate-500 text-xs">No invoices found.</p>
                ) : (
                  <div className="space-y-2">
                    {member.invoices.map(invoice => (
                      <div key={invoice.id} className="flex justify-between text-sm bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="font-mono text-slate-700 text-xs">{invoice.invoiceNumber}</span>
                        <span className="text-slate-500 text-xs">{invoice.issueDate.toLocaleDateString('en-GB')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><Receipt className="h-4 w-4" /> Receipts</h3>
                {member.receipts.length === 0 ? (
                  <p className="text-slate-500 text-xs">No receipts found.</p>
                ) : (
                  <div className="space-y-2">
                    {member.receipts.map(receipt => (
                      <div key={receipt.id} className="flex justify-between text-sm bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="font-mono text-slate-700 text-xs">{receipt.receiptNumber}</span>
                        <span className="text-slate-500 text-xs">₹{receipt.amount.toString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Recent Audit Logs</h2>
            {member.auditLogs.length === 0 ? (
              <p className="text-slate-500 text-sm">No audit logs found.</p>
            ) : (
              <div className="space-y-3">
                {member.auditLogs.map((log: any) => (
                  <div key={log.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-slate-800">{log.action}</span>
                      <span className="text-xs text-slate-400">{log.createdAt.toLocaleString('en-GB')}</span>
                    </div>
                    <p className="text-xs text-slate-500">Entity: {log.entityType} ({log.entityId})</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
