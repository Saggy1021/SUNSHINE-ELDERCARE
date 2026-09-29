import { getMemberDocuments } from "@/app/actions/membership"
import { auth } from "@/auth"
import { FileText, Download } from "lucide-react"

export default async function FinancialDocumentsPage() {
  const docs = await getMemberDocuments()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Documents</h1>
        <p className="text-slate-600 mt-1">View and download your invoices, receipts, and private documents.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Private Documents */}
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Private Documents
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {docs.documents.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100 col-span-2">No documents available.</p>
            ) : (
              docs.documents.map(doc => (
                <div key={doc.id} className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm hover:shadow transition-shadow">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{doc.displayName}</p>
                    <p className="text-xs text-slate-500">{doc.createdAt.toLocaleDateString()} • {doc.documentType}</p>
                  </div>
                  <a href={`/api/documents/download?docId=${doc.id}`} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Download Document">
                    <Download className="h-5 w-5" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invoices */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            Invoices
          </h2>
          <div className="space-y-3">
            {docs.invoices.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">No invoices available.</p>
            ) : (
              docs.invoices.map(invoice => (
                <div key={invoice.id} className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm hover:shadow transition-shadow">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">{invoice.issueDate.toLocaleDateString()} • ₹{invoice.total.toString()}</p>
                  </div>
                  <a href={`/api/invoices/${invoice.id}/download`} target="_blank" rel="noopener noreferrer" className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Download Invoice">
                    <Download className="h-5 w-5" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Receipts */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-500" />
            Receipts
          </h2>
          <div className="space-y-3">
            {docs.receipts.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">No receipts available.</p>
            ) : (
              docs.receipts.map(receipt => (
                <div key={receipt.id} className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm hover:shadow transition-shadow">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{receipt.receiptNumber}</p>
                    <p className="text-xs text-slate-500">{receipt.paymentDate.toLocaleDateString()} • ₹{receipt.amount.toString()}</p>
                  </div>
                  <span className="text-xs font-medium text-slate-400">View (Coming Soon)</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
