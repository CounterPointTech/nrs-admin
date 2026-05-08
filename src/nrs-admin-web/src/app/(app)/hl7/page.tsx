'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, RefreshCw, ArrowRight, DollarSign, FileText, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Hl7OverviewPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="HL7"
        description="Re-queue HL7 messages that need to be regenerated or resent through Mirth/middleware."
        icon={Send}
      />

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>How resend works</AlertTitle>
        <AlertDescription>
          These tools <strong>stage</strong> messages — they do not transmit HL7 directly. DFT
          procedures are inserted into <code className="text-xs">public.dft_stage</code>; MDM
          messages are triggered by resetting <code className="text-xs">ris.reports</code>{' '}
          status. Mirth (or the configured middleware) reads from these staging points and
          delivers the actual messages. Every resend is audit-logged with the originating user.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/hl7/resend/dft" className="group">
          <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">DFT Resend</CardTitle>
                    <CardDescription className="text-xs">Detailed Financial Transaction</CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Search procedures by date, accession, patient, or status. Bulk-select rows and
                stage them for DFT^P03 resend. Status auto-refreshes while messages are pending.
              </p>
              <div className="flex items-center gap-1.5 pt-1 text-xs">
                <RefreshCw className="h-3 w-3" />
                <span>Live status polling</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/hl7/resend/mdm" className="group">
          <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">MDM Resend</CardTitle>
                    <CardDescription className="text-xs">Medical Document Management</CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Re-queue signed/finalized reports either by pasting an accession list or by date
                range with optional physician filter. Triggers Novarad to regenerate MDM
                messages.
              </p>
              <div className="flex items-center gap-1.5 pt-1 text-xs">
                <RefreshCw className="h-3 w-3" />
                <span>Bulk-resend in one shot</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit &amp; safety</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Every resend is logged to the API service log under structured event names (
            <code className="text-xs">HL7_DFT_RESEND_*</code>,{' '}
            <code className="text-xs">HL7_MDM_RESEND_*</code>) with the operating user, target
            count, and outcome. Errors on individual procedures do not abort a batch — each row
            is staged independently.
          </p>
          <p>
            Staged DFT records are marked with <code className="text-xs">custom_field_2 = &apos;NRS Admin&apos;</code>{' '}
            in <code className="text-xs">public.dft_stage</code> so middleware/audit can
            distinguish web-initiated resends from the legacy desktop tool.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
