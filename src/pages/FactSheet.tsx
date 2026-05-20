import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  Building2,
  Calendar,
  DollarSign,
  Download,
  FileText,
  TrendingUp,
  Users,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import FactSheetChat from "@/components/FactSheetChat";
import {
  getFilingBySlug,
  filingTypeColor,
  type Filing,
} from "@/lib/filingsClient";

/**
 * FactSheet — v3.
 *
 * Changes from v2:
 *   - CalendarNavbar removed from this page (App.tsx now renders it
 *     once at the App level for every route — no more duplication).
 *   - Added <FactSheetChat /> at the bottom of the page so users can
 *     ask Claude questions about the filing.
 *
 * Route: /fact-sheet/:slug
 */

function shortDate(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

function formatMoney(usdMillions?: number | null): string {
  if (usdMillions == null) return "—";
  if (Math.abs(usdMillions) >= 1000) {
    return `$${(usdMillions / 1000).toFixed(2)}B`;
  }
  return `$${usdMillions.toFixed(1)}M`;
}

export default function FactSheet() {
  const [, params] = useRoute<{ slug: string }>("/fact-sheet/:slug");
  const slug = params?.slug ?? "";

  const [filing, setFiling] = useState<Filing | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    getFilingBySlug(slug)
      .then((row) => {
        if (cancelled) return;
        setFiling(row);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(String(e?.message ?? e));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
          Loading fact sheet…
        </span>
      </div>
    );
  }

  if (err || !filing) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6">
        <h1 className="vv-section-title text-3xl text-foreground">Fact sheet not found</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          We couldn't locate a filing with slug <code className="font-mono">{slug}</code>.
        </p>
        <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
          ← Back to calendar
        </Link>
      </div>
    );
  }

  const accent = filingTypeColor(filing.filingType);
  const hero = filing.heroImageUrl;
  const offering = filing.offering;
  const financials = filing.financials;
  const pdfUrl = filing.pdfReportUrl ?? null;
  const fullReportHref = filing.reportSlug
    ? `/reports/${encodeURIComponent(filing.reportSlug)}`
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative">
        <div className="relative h-[42vh] min-h-[320px] max-h-[480px] overflow-hidden bg-gradient-to-br from-primary/15 to-card">
          {hero ? (
            <img
              src={hero}
              alt={filing.companyName}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        <div className="container -mt-32 relative z-[5] pb-12">
          <div
            className="inline-block font-mono text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 mb-5 backdrop-blur-sm"
            style={{
              color: accent,
              backgroundColor: `${accent}22`,
              border: `1px solid ${accent}55`,
              borderRadius: "2px",
            }}
          >
            {filing.filingType} · {shortDate(filing.filingDate)}
          </div>

          <h1 className="vv-section-title text-[clamp(40px,5vw,72px)] leading-[1.05] text-foreground mb-4">
            {filing.companyName}
          </h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
            {filing.ticker ? (
              <span className="text-foreground">
                {filing.exchange && filing.exchange !== "UNKNOWN"
                  ? `${filing.exchange}: `
                  : ""}
                <span className="text-primary">{filing.ticker}</span>
              </span>
            ) : null}
            {filing.industry ? <span>· {filing.industry}</span> : null}
            {filing.sicCode ? <span>· SIC {filing.sicCode}</span> : null}
          </div>
        </div>
      </section>

      {/* ── Quick facts ─────────────────────────────────────────── */}
      <section className="border-y border-border/40 bg-card/40">
        <div className="container py-10 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
          <QuickFact icon={<Building2 className="w-3.5 h-3.5" />} label="Exchange" value={filing.exchange || "—"} />
          <QuickFact icon={<Calendar className="w-3.5 h-3.5" />} label="Filed" value={shortDate(filing.filingDate)} />
          <QuickFact icon={<DollarSign className="w-3.5 h-3.5" />} label="Gross proceeds" value={formatMoney(offering?.grossProceedsM)} />
          <QuickFact icon={<TrendingUp className="w-3.5 h-3.5" />} label="Last revenue" value={formatMoney(financials?.lastRevenueM)} />
        </div>
      </section>

      {/* ── The offering ────────────────────────────────────────── */}
      {offering ? (
        <Section eyebrow="The Offering" title="Deal terms.">
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
            {offering.sharesOfferedM != null ? (
              <DataRow label="Shares offered" value={`${offering.sharesOfferedM.toLocaleString()}M`} />
            ) : null}
            {offering.priceRange ? <DataRow label="Price range" value={offering.priceRange} /> : null}
            {offering.grossProceedsM != null ? <DataRow label="Gross proceeds" value={formatMoney(offering.grossProceedsM)} /> : null}
            {offering.impliedValuationM != null ? <DataRow label="Implied valuation" value={formatMoney(offering.impliedValuationM)} /> : null}
          </div>
        </Section>
      ) : null}

      {/* ── Use of proceeds ─────────────────────────────────────── */}
      {filing.useOfProceeds && filing.useOfProceeds.length > 0 ? (
        <Section eyebrow="Use of Proceeds" title="Where the money goes.">
          <ul className="space-y-3">
            {filing.useOfProceeds.map((line, i) => (
              <li key={i} className="flex gap-3 text-[15px] text-foreground/85 leading-[1.7]">
                <span className="mt-2 w-1 h-1 rounded-full bg-primary shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ── Key risks ───────────────────────────────────────────── */}
      {filing.keyRisks && filing.keyRisks.length > 0 ? (
        <Section eyebrow="Key Risks" title="What to watch.">
          <div className="grid md:grid-cols-2 gap-4">
            {filing.keyRisks.slice(0, 6).map((risk, i) => (
              <div key={i} className="border border-border/60 bg-card/30 p-4" style={{ borderRadius: "4px" }}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#c8a45c] mt-0.5 shrink-0" />
                  <p className="text-[14px] text-foreground/85 leading-[1.65]">{risk}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ── Financials ──────────────────────────────────────────── */}
      {financials?.history && financials.history.length > 0 ? (
        <Section eyebrow="Financial Snapshot" title="Last 3 fiscal years.">
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] font-mono">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left py-3 pr-6 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-normal">Year</th>
                  <th className="text-right py-3 px-6 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-normal">Revenue</th>
                  <th className="text-right py-3 px-6 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-normal">Gross profit</th>
                  <th className="text-right py-3 pl-6 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-normal">Net income</th>
                </tr>
              </thead>
              <tbody>
                {financials.history.map((row, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-3 pr-6 text-foreground">{row.fy}</td>
                    <td className="py-3 px-6 text-right text-foreground/90">{formatMoney(row.revenueM)}</td>
                    <td className="py-3 px-6 text-right text-foreground/90">{formatMoney(row.grossProfitM)}</td>
                    <td className="py-3 pl-6 text-right text-foreground/90">{formatMoney(row.netIncomeM)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {/* ── Underwriters / comparables ─────────────────────────── */}
      {(filing.leadUnderwriters && filing.leadUnderwriters.length > 0) ||
      (filing.comparables && filing.comparables.length > 0) ? (
        <Section eyebrow="Bankers & Peers" title="Deal team and comps.">
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
            {filing.leadUnderwriters && filing.leadUnderwriters.length > 0 ? (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="w-3 h-3" /> Lead underwriters
                </div>
                <ul className="space-y-1.5">
                  {filing.leadUnderwriters.map((uw, i) => (
                    <li key={i} className="text-[15px] text-foreground/85">{uw}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {filing.comparables && filing.comparables.length > 0 ? (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3 flex items-center gap-2">
                  <FileText className="w-3 h-3" /> Comparable companies
                </div>
                <ul className="space-y-1.5">
                  {filing.comparables.map((c, i) => (
                    <li key={i} className="text-[15px] text-foreground/85">{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* ── CTA bar ─────────────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-card/40 py-12">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <div className="vv-eyebrow mb-2">Go deeper</div>
            <div className="text-[15px] text-muted-foreground">
              Download the full 30-page initiation report, or read it online.
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-mono text-[10px] uppercase tracking-[0.18em] no-underline hover:opacity-90 transition-opacity"
                style={{ borderRadius: "2px" }}
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </a>
            ) : null}
            {fullReportHref ? (
              <Link
                href={fullReportHref}
                className="inline-flex items-center gap-2 px-5 py-3 border border-border bg-transparent text-foreground font-mono text-[10px] uppercase tracking-[0.18em] no-underline hover:bg-card transition-colors"
                style={{ borderRadius: "2px" }}
              >
                Read full report <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Analyst chat (NEW) ──────────────────────────────────── */}
      <FactSheetChat filing={filing} />

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="container py-12 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        Source: SEC EDGAR · IPO Radar by Velocia Ventures
      </div>
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="container py-14">
      <div className="vv-eyebrow mb-3">{eyebrow}</div>
      <h2 className="vv-section-title text-[clamp(24px,2.4vw,36px)] text-foreground mb-8">{title}</h2>
      {children}
    </section>
  );
}

function QuickFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
        {icon} {label}
      </div>
      <div className="text-[18px] text-foreground font-light">{value}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/30 py-2.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className="text-[16px] text-foreground/95 font-light">{value}</span>
    </div>
  );
}
