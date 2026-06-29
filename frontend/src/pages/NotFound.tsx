import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { Link } from 'react-router-dom'
import { ArrowLeft, Terminal } from 'lucide-react'

export function NotFound() {
  useDocumentTitle('[404: SECTOR NOT FOUND]')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-bg font-mono">
      <div className="max-w-md w-full text-center">
        <div className="border border-red-500/30 bg-red-500/5 p-4 mb-6">
          <pre className="text-red-500 text-xs leading-4">
{`  ____  ____  ____  _____
 / ___||  _ \\|  _ \\|  ___|
 \\___ \\| | | | | | | |_   
  ___) | |_| | |_| |  _|  
 |____/|____/|____/|_|    
`}
          </pre>
          <p className="text-red-500 text-xs tracking-widest mt-2">
            [SECTOR NOT FOUND]
          </p>
        </div>

        <div className="border border-border bg-surface p-4 mb-4">
          <div className="text-xs text-text-muted mb-3 border-b border-border pb-2">
            &gt; ERROR_LOG
          </div>
          <div className="text-left text-xs text-text-muted space-y-1">
            <p><span className="text-red-500">&gt;</span> ERR_SECTOR_UNKNOWN: The requested sector does not exist in the current datastream.</p>
            <p><span className="text-red-500">&gt;</span> TRACE: sector_lookup_failed</p>
            <p><span className="text-red-500">&gt;</span> STATUS: 404_NOT_FOUND</p>
            <p><span className="text-red-500">&gt;</span> RECOVERY: Return to a known sector.</p>
          </div>
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 border border-primary bg-primary/10 hover:bg-primary/20 text-primary py-2 px-4 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          &lt;&lt; RETURN_TO_DASHBOARD
        </Link>

        <div className="mt-6 text-[10px] text-text-dim">
          <Terminal className="w-3 h-3 inline-block mr-1" />
          LIFETRACK v1.0 // AT PROTOCOL // SECTOR_LOOKUP_FAILED
        </div>
      </div>
    </div>
  )
}
