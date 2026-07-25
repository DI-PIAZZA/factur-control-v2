import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface CostLine {
  ref_article: string;
  unit_price_add: number;
}

// Convertit un fichier Excel en texte tabulaire (copie de extract-tarif)
async function excelToText(buffer: ArrayBuffer): Promise<string> {
  const { spawnSync } = await import("child_process");
  const pythonScript = `
import sys, zipfile, xml.etree.ElementTree as ET, io
data = sys.stdin.buffer.read()
try:
    zf = zipfile.ZipFile(io.BytesIO(data))
except Exception as e:
    print(f"ERREUR ZIP: {e}", file=sys.stderr)
    sys.exit(1)
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
shared_strings = []
try:
    ss = ET.fromstring(zf.read('xl/sharedStrings.xml'))
    for si in ss.findall(f'{{{NS}}}si'):
        parts = si.findall(f'.//{{{NS}}}t')
        shared_strings.append(''.join(p.text or '' for p in parts))
except:
    pass
try:
    wb = ET.fromstring(zf.read('xl/workbook.xml'))
    sheets = wb.findall(f'.//{{{NS}}}sheet')
except:
    sheets = []
results = []
for i, sheet in enumerate(sheets):
    name = sheet.get('name', f'Feuille{i+1}')
    try:
        sd = ET.fromstring(zf.read(f'xl/worksheets/sheet{i+1}.xml'))
    except:
        continue
    rows = []
    for row in sd.findall(f'.//{{{NS}}}row'):
        cells = []
        for c in row.findall(f'{{{NS}}}c'):
            t = c.get('t', '')
            v = c.find(f'{{{NS}}}v')
            if v is None or v.text is None:
                cells.append('')
            elif t == 's':
                idx = int(v.text)
                cells.append(shared_strings[idx] if idx < len(shared_strings) else '')
            elif t == 'inlineStr':
                is_el = c.find(f'.//{{{NS}}}t')
                cells.append(is_el.text if is_el is not None else '')
            else:
                cells.append(v.text)
        if any(cells):
            rows.append('\\t'.join(cells))
    if rows:
        results.append(f'=== {name} ===\\n' + '\\n'.join(rows))
print('\\n\\n'.join(results))
`;
  for (const py of ["python", "python3"]) {
    const result = spawnSync(py, ["-c", pythonScript], {
      input: Buffer.from(buffer),
      maxBuffer: 50 * 1024 * 1024,
      timeout: 30000,
    });
    if (!result.error && result.status === 0) {
      return result.stdout.toString("utf-8").trim();
    }
  }
  throw new Error("Python non disponible pour lire le fichier Excel");
}

// Extrait le texte d'un PDF via pypdf
async function pdfToText(buffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  const { spawnSync } = await import("child_process");
  const pythonScript = `
import sys, io, subprocess
data = sys.stdin.buffer.read()
try:
    from pypdf import PdfReader
except ImportError:
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "pypdf", "--break-system-packages", "-q"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    from pypdf import PdfReader
reader = PdfReader(io.BytesIO(data))
page_count = len(reader.pages)
print(f"PAGES:{page_count}", file=sys.stderr)
parts = []
for i, page in enumerate(reader.pages):
    try:
        text = page.extract_text() or ""
    except Exception:
        text = ""
    if text.strip():
        parts.append(f"=== Page {i+1} ===\\n{text}")
print("\\n\\n".join(parts))
`;
  for (const py of ["python", "python3"]) {
    const result = spawnSync(py, ["-c", pythonScript], {
      input: Buffer.from(buffer),
      maxBuffer: 100 * 1024 * 1024,
      timeout: 120000,
    });
    if (!result.error && result.status === 0) {
      const text = result.stdout.toString("utf-8").trim();
      const stderrStr = result.stderr?.toString() ?? "";
      const pageMatch = stderrStr.match(/PAGES:(\d+)/);
      const pageCount = pageMatch ? parseInt(pageMatch[1]) : 0;
      return { text, pageCount };
    }
  }
  throw new Error("Impossible d'extraire le texte du PDF");
}

// POST /api/extract-cost-column
// FormData: { pdf: File, supplier_id: string, cost_column: string }
// Extrait les valeurs de la colonne cost_column et met à jour price_references.unit_price_add
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante" }, { status: 500 });

    const formData = await req.formData();
    const file = formData.get("pdf") as File;
    const supplierId = formData.get("supplier_id") as string;
    // Accepte "cost_columns" (nouvelle multi-sélection) OU "cost_column" (rétrocompat)
    const costColumnsRaw = (formData.get("cost_columns") ?? formData.get("cost_column")) as string;
    const costColumns = costColumnsRaw ? costColumnsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

    if (!file || !supplierId || costColumns.length === 0) {
      return NextResponse.json({ error: "pdf, supplier_id et cost_columns requis" }, { status: 400 });
    }

    const costColumn = costColumns.join(", "); // pour affichage dans les prompts

    const bytes = await file.arrayBuffer();
    const fileName = file.name.toLowerCase();
    const isExcel = /\.(xlsx|xls|xlsm)$/.test(fileName);

    // Préparation du contenu à envoyer à Claude
    let messageContent: object[];

    if (isExcel) {
      let tableText: string;
      try {
        tableText = await excelToText(bytes);
      } catch {
        return NextResponse.json({ error: "Impossible de lire le fichier Excel" }, { status: 422 });
      }
      const colonnesLabel = costColumns.length > 1
        ? `la SOMME des colonnes "${costColumns.join('" et "')}"`
        : `la valeur de la colonne "${costColumn}"`;
      messageContent = [{
        type: "text",
        text: `Tu reçois un tarif fournisseur au format Excel (colonnes séparées par tabulations).
Extrais ${colonnesLabel} pour chaque ligne article.
Si une colonne est absente ou vide pour un article, considère 0 pour cette colonne.

Contenu du fichier :
${tableText}

Retourne UNIQUEMENT ce JSON (sans markdown, sans commentaire) :
{
  "lignes": [
    { "ref_article": "220344", "unit_price_add": 1.2300 },
    { "ref_article": "190633", "unit_price_add": 0 }
  ]
}

Règles :
- ref_article = référence article exacte telle qu'elle apparaît dans le document
- unit_price_add = ${costColumns.length > 1 ? `SOMME de "${costColumns.join('" + "')}"` : `valeur de "${costColumn}"`} (4 décimales max, 0 si toutes absentes)
- Ne retourne QUE les lignes articles (pas les titres ni sous-totaux)`
      }];
    } else {
      // PDF
      let pdfText: string | null = null;
      let pageCount = 0;
      try {
        const extracted = await pdfToText(bytes);
        pdfText = extracted.text;
        pageCount = extracted.pageCount;
      } catch {
        pdfText = null;
      }

      const colonnesLabel = costColumns.length > 1
        ? `la SOMME des colonnes "${costColumns.join('" et "')}"`
        : `la valeur de la colonne "${costColumn}"`;
      const prompt = `Tu reçois un tarif fournisseur.
Extrais ${colonnesLabel} pour chaque ligne article.
Si une colonne est absente ou vide pour un article, considère 0 pour cette colonne.

Retourne UNIQUEMENT ce JSON (sans markdown, sans commentaire) :
{
  "lignes": [
    { "ref_article": "220344", "unit_price_add": 1.2300 },
    { "ref_article": "190633", "unit_price_add": 0 }
  ]
}

Règles :
- ref_article = référence article exacte
- unit_price_add = ${costColumns.length > 1 ? `SOMME de "${costColumns.join('" + "')}"` : `valeur de "${costColumn}"`} (4 décimales max, 0 si toutes absentes)
- Ne retourne QUE les lignes articles`;

      if (pageCount > 100 && pdfText) {
        messageContent = [{ type: "text", text: `${prompt}\n\nContenu du PDF (${pageCount} pages) :\n${pdfText}` }];
      } else {
        const base64 = Buffer.from(bytes).toString("base64");
        messageContent = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: prompt }
        ];
      }
    }

    // Appel Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 8000,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Erreur Claude API: ${err}` }, { status: 500 });
    }

    const result = await response.json();
    const content = result.content?.[0]?.text ?? "";

    let costLines: CostLine[];
    try {
      let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];
      const parsed = JSON.parse(cleaned);
      costLines = parsed.lignes ?? [];
    } catch {
      return NextResponse.json({ error: "Réponse Claude invalide", raw: content.slice(0, 500) }, { status: 422 });
    }

    if (!Array.isArray(costLines) || costLines.length === 0) {
      return NextResponse.json({ error: "Aucune ligne extraite pour la colonne de coût" }, { status: 422 });
    }

    // Récupérer les lignes existantes (id + ref_article)
    const { data: existingLines, error: fetchError } = await supabase
      .from("price_references")
      .select("id, ref_article")
      .eq("supplier_id", supplierId);

    if (fetchError || !existingLines) {
      return NextResponse.json({ error: "Impossible de récupérer les lignes tarif" }, { status: 500 });
    }

    // Map ref_article → id
    const refToId = new Map<string, string>();
    for (const row of existingLines) {
      refToId.set(String(row.ref_article).trim(), row.id);
    }

    // Mise à jour de unit_price_add en parallèle
    let updatedCount = 0;
    const updates = costLines
      .map((line) => {
        const id = refToId.get(String(line.ref_article ?? "").trim());
        if (!id) return null;
        const val = Number(line.unit_price_add) || 0;
        return { id, val };
      })
      .filter(Boolean) as { id: string; val: number }[];

    // Batch de 20 updates en parallèle
    for (let i = 0; i < updates.length; i += 20) {
      const batch = updates.slice(i, i + 20);
      await Promise.all(
        batch.map(({ id, val }) =>
          supabase.from("price_references").update({ unit_price_add: val }).eq("id", id)
        )
      );
      updatedCount += batch.length;
    }

    // Sauvegarder la liste des colonnes de coût (séparées par virgule) sur le fournisseur
    await supabase.from("suppliers").update({ cost_column: costColumnsRaw }).eq("id", supplierId);

    return NextResponse.json({
      success: true,
      cost_column: costColumn,
      extracted: costLines.length,
      updated: updatedCount,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
