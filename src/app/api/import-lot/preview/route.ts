import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { spawnSync } from "child_process";
import { writeFileSync, readFileSync, mkdtempSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export const maxDuration = 30;

function extrairePdfDepuisZip(zipBuffer: Buffer, nomPdf: string): Buffer | null {
  const tmpDir = mkdtempSync(join(tmpdir(), "factur-preview-"));
  try {
    const zipPath = join(tmpDir, "archive.zip");
    writeFileSync(zipPath, zipBuffer);

    // Script Python qui n'extrait QUE le PDF demandé (beaucoup plus rapide)
    const script = `
import zipfile, sys, os
zip_path = sys.argv[1]
nom_cible = sys.argv[2]
out_dir   = sys.argv[3]
with zipfile.ZipFile(zip_path) as z:
    for name in z.namelist():
        if os.path.basename(name) == nom_cible and name.lower().endswith('.pdf'):
            z.extract(name, out_dir)
            print(name)
            break
`;

    const result = spawnSync("python3", ["-c", script, zipPath, nomPdf, tmpDir], {
      timeout: 20_000,
    });

    if (result.status !== 0) return null;

    const extracted = result.stdout.toString().trim();
    if (!extracted) return null;

    const pdfPath = join(tmpDir, extracted);
    if (!existsSync(pdfPath)) return null;

    return readFileSync(pdfPath);
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* silencieux */ }
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const formData = await req.formData();
    const fichier = formData.get("fichier") as File | null;
    const nomPdf  = formData.get("nom_pdf") as string | null;

    if (!fichier || !nomPdf) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const buf = await fichier.arrayBuffer();
    const nom = fichier.name.toLowerCase();

    let pdfBuffer: Buffer | null = null;

    if (nom.endsWith(".zip")) {
      pdfBuffer = extrairePdfDepuisZip(Buffer.from(buf), nomPdf);
    } else if (nom.endsWith(".pdf")) {
      pdfBuffer = Buffer.from(buf);
    }

    if (!pdfBuffer) {
      return NextResponse.json({ error: `PDF "${nomPdf}" non trouvé dans l'archive` }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdfBuffer.length),
        "Content-Disposition": `inline; filename="${nomPdf}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
