/**
 * Comprime e converte imagem para WebP usando Canvas API.
 * Redimensiona para max_width x max_height (proporcional).
 * Tenta reduzir qualidade até atingir targetKB.
 */
export function compressImageToWebP(
  file: File,
  targetKB = 200,
  maxWidth = 1920,
  maxHeight = 800
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let w = img.width;
      let h = img.height;

      if (w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Não foi possível criar canvas")); return; }

      ctx.drawImage(img, 0, 0, w, h);

      const targetBytes = targetKB * 1024;
      let quality = 0.82;
      let attempts = 0;

      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error("Erro ao comprimir imagem")); return; }

            if (blob.size > targetBytes && quality > 0.3 && attempts < 6) {
              quality -= 0.1;
              attempts++;
              tryCompress();
              return;
            }

            const baseName = file.name.replace(/\.[^.]+$/, "");
            resolve(new File([blob], `${baseName}.webp`, {
              type: "image/webp",
              lastModified: Date.now(),
            }));
          },
          "image/webp",
          quality
        );
      };

      tryCompress();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Erro ao carregar imagem"));
    };

    img.src = url;
  });
}

/**
 * Extrai o path de um arquivo no Supabase Storage a partir da URL pública.
 */
export function extractStoragePath(url: string | null, bucket: string): string | null {
  if (!url) return null;
  const match = url.match(new RegExp(`/storage/v1/object/public/${bucket}/(.+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Deleta um arquivo do Supabase Storage.
 */
export async function deleteFromStorage(supabase: any, bucket: string, url: string | null) {
  if (!url) return;
  const path = extractStoragePath(url, bucket);
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}

/**
 * Processa imagens pendentes: comprime para WebP e faz upload.
 * existingUrls = URLs já salvas (não serão re-upadas).
 * Retorna lista final de URLs (existentes + novas).
 */
export async function processPendingImages(
  supabase: any,
  bucket: string,
  folder: string,
  pendingFiles: File[],
  existingUrls: string[]
): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (const file of pendingFiles) {
    try {
      const compressed = await compressImageToWebP(file, 200);
      const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, compressed);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    } catch (err) {
    }
  }

  return [...existingUrls, ...uploadedUrls];
}

/**
 * Varre o bucket e remove imagens órfãs (no storage mas não referenciadas no banco).
 * Retorna quantidade de arquivos removidos.
 */
export async function scanAndCleanStorage(
  supabase: any,
  bucket: string,
  folder: string,
  dbImageUrls: string[]
): Promise<number> {
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list(folder, { limit: 500 });

  if (listError) throw listError;
  const allFiles = files || [];
  if (allFiles.length === 0) return 0;

  const usedPaths = new Set<string>();
  dbImageUrls.forEach((url) => {
    const path = extractStoragePath(url, bucket);
    if (path) usedPaths.add(path);
  });

  const orphans = allFiles.filter((f: any) => {
    const fullPath = `${folder}/${f.name}`;
    return !usedPaths.has(fullPath);
  });

  if (orphans.length === 0) return 0;

  const pathsToDelete = orphans.map((f: any) => `${folder}/${f.name}`);
  const { error: delError } = await supabase.storage.from(bucket).remove(pathsToDelete);
  if (delError) throw delError;

  return orphans.length;
}

/**
 * Gera preview URL para um File (para mostrar antes de salvar).
 * Lembre-se de chamar URL.revokeObjectURL quando não precisar mais.
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Converte uma imagem externa (URL) para WebP usando Canvas API.
 * Retorna um File WebP pronto para upload.
 * Aceita tanto URLs http(s) quanto blob URLs.
 */
export function convertUrlToWebP(
  url: string,
  maxWidth = 1920,
  maxHeight = 800
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Só usa crossOrigin para URLs http(s), blob URLs não precisam
    if (!url.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      let w = img.width;
      let h = img.height;

      if (w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Não foi possível criar canvas")); return; }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Erro ao converter para WebP")); return; }
          const baseName = url.split("/").pop()?.split("?")[0]?.replace(/\.[^.]+$/, "") || "image";
          resolve(new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() }));
        },
        "image/webp",
        0.82
      );
    };

    img.onerror = () => reject(new Error(`Erro ao carregar imagem: ${url}`));
    img.src = url;
  });
}

/**
 * Converte uma imagem não-WebP em um bucket Supabase para WebP.
 * 1. Faz download da imagem original
 * 2. Converte via Canvas API
 * 3. Faz upload do WebP no mesmo folder
 * 4. Deleta o arquivo antigo
 * 5. Retorna a nova URL pública
 */
export async function convertStoredImageToWebP(
  supabase: any,
  bucket: string,
  originalUrl: string
): Promise<string> {
  const path = extractStoragePath(originalUrl, bucket);
  if (!path) throw new Error(`Não foi possível extrair path de: ${originalUrl}`);

  // Se já é WebP, retorna a mesma URL
  if (path.toLowerCase().endsWith(".webp")) return originalUrl;

  // Não processa paths que parecem pastas (sem extensão de arquivo)
  const fileName = path.split("/").pop() || "";
  if (!fileName.includes(".")) throw new Error(`Path parece ser uma pasta, não um arquivo: ${path}`);

  // Download da imagem original via storage API autenticada
  const { data: blobData, error: downloadError } = await supabase.storage
    .from(bucket)
    .download(path);

  if (downloadError) throw downloadError;
  if (!blobData) throw new Error(`Download retornou vazio: ${path}`);

  // Cria blob URL para o Canvas converter
  const blobUrl = URL.createObjectURL(blobData);

  try {
    const webpFile = await convertUrlToWebP(blobUrl, 1920, 800);

    // Upload do WebP no mesmo folder
    const folder = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : "";
    const baseName = fileName.replace(/\.[^.]+$/, "");
    const newPath = folder ? `${folder}/${baseName}.webp` : `${baseName}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(newPath, webpFile, { upsert: true });

    if (uploadError) throw uploadError;

    // Deleta o arquivo antigo (só se for um arquivo diferente)
    if (path !== newPath) {
      await supabase.storage.from(bucket).remove([path]);
    }

    // Retorna nova URL pública
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(newPath);
    return publicUrl;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
