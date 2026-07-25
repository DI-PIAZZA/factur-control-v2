"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface PappersResult {
  siren: string;
  denomination: string;
  nom_entreprise: string;
  nom_commercial?: string;
  enseigne_1?: string;
  siege: {
    siret: string;
    adresse_ligne_1?: string;
    code_postal?: string;
    ville?: string;
  };
}

export interface SearchState {
  results: PappersResult[] | null;
  error: string | null;
  query: string;
}

const GOUV_API = "https://recherche-entreprises.api.gouv.fr/search";

function mapGouvResult(item: Record<string, unknown>): PappersResult {
  const siege = (item.siege ?? {}) as Record<string, unknown>;
  const adresse = [siege.complement_adresse, siege.numero_voie, siege.type_voie, siege.libelle_voie]
    .filter(Boolean)
    .join(" ") || (siege.adresse as string | undefined);

  return {
    siren: item.siren as string,
    denomination: (item.nom_raison_sociale ?? item.nom_complet ?? "") as string,
    nom_entreprise: (item.nom_complet ?? item.nom_raison_sociale ?? "") as string,
    nom_commercial: (siege.nom_commercial ?? item.sigle ?? undefined) as string | undefined,
    enseigne_1: undefined,
    siege: {
      siret: (siege.siret ?? "") as string,
      adresse_ligne_1: adresse,
      code_postal: (siege.code_postal ?? "") as string,
      ville: (siege.libelle_commune ?? "") as string,
    },
  };
}

export async function searchPappersAction(
  prevState: SearchState,
  formData: FormData
): Promise<SearchState> {
  const query = (formData.get("query") as string)?.trim();
  if (!query) return { results: null, error: "Entrez un nom ou un SIREN", query: "" };

  try {
    const url = GOUV_API + "?q=" + encodeURIComponent(query) + "&limit=8";
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      const body = await res.text();
      return { results: null, error: "Erreur API (" + res.status + "): " + body, query };
    }

    const data = await res.json();
    const items: Record<string, unknown>[] = data.results ?? [];

    if (items.length === 0) {
      return {
        results: null,
        error: '{"statusCode":404,"error":"Pas de résultat","message":"Aucune entreprise trouvée"}',
        query,
      };
    }

    return { results: items.map(mapGouvResult), error: null, query };
  } catch {
    return { results: null, error: "Impossible de contacter l'API entreprises.api.gouv.fr", query };
  }
}

export async function addFournisseurAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = formData.get("name") as string;
  const siret = formData.get("siret") as string;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .single();

  if (profileError || !profile) redirect("/login");

  const nom_commercial = formData.get("nom_commercial") as string | null;
  const code_postal = formData.get("code_postal") as string | null;
  const ville = formData.get("ville") as string | null;

  const { error } = await supabase.from("suppliers").insert({
    tenant_id: profile.tenant_id,
    name,
    siret,
    ...(nom_commercial ? { nom_commercial } : {}),
    ...(code_postal ? { code_postal } : {}),
    ...(ville ? { ville } : {}),
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/fournisseurs?erreur=doublon");
    }
    redirect("/fournisseurs?erreur=" + encodeURIComponent(error.message));
  }

  redirect("/fournisseurs?success=1");
}
