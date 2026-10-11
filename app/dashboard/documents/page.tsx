import { getMemberDocuments } from "@/app/actions/membership"
import { auth } from "@/auth"
import { FileText, Download } from "lucide-react"

export default async function FinancialDocumentsPage() {
  const docs = await getMemberDocuments()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Member</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">Documents</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white">Financial & Legal Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Securely view and download your invoices, payment receipts, and member contracts.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Private Documents */}
        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold text-[#091329] dark:text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
            <FileText className="h-4 w-4 text-[#B08A4A]" />
            Private Documents & Contracts
          </h2>
          <div className="grid sm:grid-cols-2 gap-3.5">
            {docs.documents.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-card p-6 rounded-xl border border-border/60 col-span-2 text-center">No private documents available at this time.</p>
            ) : (
              docs.documents.map(doc => (
                <div key={doc.id} className="bg-card p-4 rounded-xl border border-border/60 flex justify-between items-center shadow-xs hover:border-[#091329]/30 dark:hover:border-amber-400/30 transition-all">
                  <div className="min-w-0 pr-3">
                    <p className="font-medium text-foreground text-sm truncate">{doc.displayName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{doc.createdAt.toLocaleDateString('en-GB')} • <span className="uppercase text-[10px] font-semibold">{doc.documentType}</span></p>
                  </div>
                  <a href={`/api/documents/download?docId=${doc.id}`} target="_blank" rel="noopener noreferrer" className="p-2 text-foreground hover:text-white hover:bg-[#091329] dark:hover:bg-[#B08A4A] rounded-lg transition-colors border border-border/60 shrink-0 shadow-2xs" title="Download Document">
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invoices */}
        <div>
          <h2 className="text-sm font-semibold text-[#091329] dark:text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
            <FileText className="h-4 w-4 text-[#B08A4A]" />
            Invoices
          </h2>
          <div className="space-y-3">
            {docs.invoices.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-card p-6 rounded-xl border border-border/60 text-center">No invoices issued yet.</p>
            ) : (
              docs.invoices.map(invoice => (
                <div key={invoice.id} className="bg-card p-4 rounded-xl border border-border/60 flex justify-between items-center shadow-xs hover:border-[#091329]/30 dark:hover:border-amber-400/30 transition-all">
                  <div className="min-w-0 pr-3">
                    <p className="font-semibold text-foreground text-sm font-mono">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{invoice.issueDate.toLocaleDateString('en-GB')} • ₹{invoice.total.toString()}</p>
                  </div>
                  <a href={`/api/invoices/${invoice.id}/download`} target="_blank" rel="noopener noreferrer" className="p-2 text-foreground hover:text-white hover:bg-[#091329] dark:hover:bg-[#B08A4A] rounded-lg transition-colors border border-border/60 shrink-0 shadow-2xs" title="Download Invoice">
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Receipts */}
        <div>
          <h2 className="text-sm font-semibold text-[#091329] dark:text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
            <FileText className="h-4 w-4 text-[#B08A4A]" />
            Receipts
          </h2>
          <div className="space-y-3">
            {docs.receipts.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-card p-6 rounded-xl border border-border/60 text-center">No payment receipts available.</p>
            ) : (
              docs.receipts.map(receipt => (
                <div key={receipt.id} className="bg-card p-4 rounded-xl border border-border/60 flex justify-between items-center shadow-xs">
                  <div>
                    <p className="font-semibold text-foreground text-sm font-mono">{receipt.receiptNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{receipt.paymentDate.toLocaleDateString('en-GB')} • ₹{receipt.amount.toString()}</p>
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/40">Verified</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
