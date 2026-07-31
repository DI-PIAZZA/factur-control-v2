import { NextRequest, NextResponse } from "next/server";

/**
 * Cron job : Synchroniser les factures e-facturation
 * À appeler via Vercel Cron ou un service externe
 * URL: https://your-app.vercel.app/api/cron/sync-e-invoices
 * Header: Authorization: Bearer <CRON_SECRET>
 */

export async function GET(req: NextRequest) {
  // Vérifier le secret
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Appeler l'API fetch-invoices
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/e-invoice/fetch-invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    const data = await res.json();

    return NextResponse.json({
      success: true,
      message: "Cron sync completed",
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json(
      { error: String(err), timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
