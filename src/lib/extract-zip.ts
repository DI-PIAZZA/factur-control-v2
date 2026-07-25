/**
 * Extraction ZIP côté serveur via Python (zipfile natif).
 * Utilisé par les routes import-lot/analyse et import-lot/process.
 */
import { spawnSync } from "child_process";
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export interface FichierExtrait {
  nom: string;
  buffer: Buffer;
}

export function extractPdfsFromZip(zipBuffer: Buffer): FichierExtrait[] {
  const tmpDir = mkdtempSync(join(tmpdir(), "factur-zip-"));

  try {
    const zipPath = join(tmpDir, "archive.zip");
    writeFileSync(zipPath, zipBuffer);

    const script = `
import zipfile, json, sys, os
zip_path = sys.argv[1]
out_dir  = sys.argv[2]
with zipfile.ZipFile(zip_path) as z:
    noms = [
        n for n in z.namelist()
        if n.lower().endswith('.pdf')
        and not os.path.basename(n).startswith('.')
        and '__MACOSX' not in n
    ]
    for nom in noms:
        z.extract(nom, out_dir)
    print(json.dumps(noms))
`;

    const result = spawnSync("python3", ["-c", script, zipPath, tmpDir], {
      timeout: 30_000,
    });

    if (result.status !== 0) {
      throw new Error(
        `Python ZIP extraction failed: ${result.stderr?.toString() ?? "unknown error"}`
      );
    }

    const noms: string[] = JSON.parse(result.stdout.toString().trim());

    return noms.map((nom) => ({
      nom: nom.split("/").pop() || nom,
      buffer: readFileSync(join(tmpDir, nom)),
    }));
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // nettoyage silencieux
    }
  }
}
