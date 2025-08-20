import { supabase } from '@/integrations/supabase/client';

// Configuração dos buckets
export const STORAGE_BUCKETS = {
  DOCUMENTOS: 'documentos',
  MIDIAS: 'midias',
  // Bucket legado para compatibilidade
  COURSE_FILES: 'course-files'
} as const;

// Tipos de arquivo permitidos
export const ALLOWED_FILE_TYPES = {
  DOCUMENTOS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ],
  MIDIAS: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ]
} as const;

// Tamanhos máximos de arquivo (em bytes)
export const MAX_FILE_SIZES = {
  DOCUMENTOS: 50 * 1024 * 1024, // 50MB
  MIDIAS: 100 * 1024 * 1024 // 100MB
} as const;

/**
 * Valida se o arquivo é permitido para o tipo especificado.
 * @param file - O arquivo a ser validado.
 * @param type - O tipo de arquivo ('DOCUMENTOS' ou 'MIDIAS').
 * @returns true se o arquivo é válido, false caso contrário.
 */
export const validateFile = (file: File, type: keyof typeof ALLOWED_FILE_TYPES): { isValid: boolean; error?: string } => {
  const allowedTypes = ALLOWED_FILE_TYPES[type];
  const maxSize = MAX_FILE_SIZES[type];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.join(', ')}`
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${Math.round(maxSize / (1024 * 1024))}MB`
    };
  }

  return { isValid: true };
};

/**
 * Faz upload de um arquivo para um bucket do Supabase Storage.
 * @param bucket - O nome do bucket.
 * @param path - O caminho dentro do bucket onde o arquivo será armazenado.
 * @param file - O arquivo a ser enviado.
 * @returns A URL pública do arquivo.
 */
export const uploadFile = async (bucket: string, path: string, file: File): Promise<string> => {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file);

  if (uploadError) {
    console.error('Erro no upload do arquivo:', uploadError);
    throw new Error('Falha no upload do arquivo.');
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

/**
 * Deleta um arquivo do Supabase Storage.
 * @param bucket - O nome do bucket.
 * @param path - O caminho do arquivo a ser deletado.
 */
export const deleteFile = async (bucket: string, path: string): Promise<void> => {
    try {
        const { error } = await supabase.storage.from(bucket).remove([path]);
        if (error) {
            console.error('Erro ao deletar arquivo do storage:', error);
            // Não lançar erro aqui para permitir que a exclusão do registro do DB continue
        }
    } catch (error) {
        console.error('Erro inesperado ao deletar arquivo:', error);
    }
};
